import { randomBytes } from 'node:crypto';
import { hash, verify } from '@node-rs/argon2';
import { createSession, deleteSession } from './session.js';
import { erstelleRateLimiter } from './lib/rateLimit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORT = 8;

// Alphabet ohne verwechselbare Zeichen (kein I/O/0/1) für Recovery-Codes.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Erzeugt einen kryptografisch zufälligen Recovery-Code im Format
 * `XXXX-XXXX-XXXX-XXXX` (~80 Bit Entropie). Wird dem Nutzer genau einmal
 * gezeigt; gespeichert wird nur der argon2-Hash.
 */
export function erzeugeRecoveryCode() {
  const bytes = randomBytes(16);
  let code = '';
  for (let i = 0; i < 16; i += 1) {
    if (i > 0 && i % 4 === 0) code += '-';
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/** Normalisiert Nutzereingabe eines Codes (Groß/klein, Bindestriche, Leerzeichen). */
function normalisiereCode(code) {
  return typeof code === 'string' ? code.toUpperCase().replace(/[^A-Z2-9]/g, '') : '';
}

/** Limiter-Schlüssel aus Client-IP und (ggf.) E-Mail. */
function limitSchluessel(req, email) {
  return `${req.ip}|${typeof email === 'string' ? email.trim().toLowerCase() : ''}`;
}

/** Setzt das Sitzungs-Cookie auf der Antwort. */
function setSessionCookie(reply, token, expires) {
  reply.setCookie(reply.server.config.cookieName, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: reply.server.config.secureCookie,
    expires,
  });
}

/**
 * Registriert die Auth-Routen unter /api/auth.
 * @param {import('fastify').FastifyInstance} app
 */
export async function authRoutes(app) {
  const { db } = app;

  // Brute-Force-Bremse fürs öffentliche Hosting: max. 8 fehlgeschlagene
  // Login-Versuche je IP+E-Mail in 15 Minuten. Pro App-Instanz (nicht modulweit),
  // damit Tests/Mehrfach-Apps sich nicht denselben Zähler teilen.
  const loginLimiter = app.loginLimiter || erstelleRateLimiter({ maxVersuche: 8, fensterMs: 15 * 60 * 1000 });

  app.post('/api/auth/register', async (req, reply) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return reply.code(400).send({ error: 'Ungültige E-Mail-Adresse.' });
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORT) {
      return reply.code(400).send({ error: `Passwort muss mind. ${MIN_PASSWORT} Zeichen haben.` });
    }
    const normEmail = email.trim().toLowerCase();
    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normEmail);
    if (exists) return reply.code(409).send({ error: 'E-Mail ist bereits registriert.' });

    const passwordHash = await hash(password);
    // Recovery-Code für den Passwort-Reset ohne Mail-Server: dem Nutzer einmal
    // zeigen, serverseitig nur den Hash speichern.
    const recoveryCode = erzeugeRecoveryCode();
    const recoveryHash = await hash(normalisiereCode(recoveryCode));
    const info = db
      .prepare('INSERT INTO users (email, password_hash, created_at, recovery_hash) VALUES (?, ?, ?, ?)')
      .run(normEmail, passwordHash, new Date().toISOString(), recoveryHash);
    const userId = Number(info.lastInsertRowid);

    const { token, expires } = createSession(db, userId);
    setSessionCookie(reply, token, expires);
    return reply.code(201).send({ user: { id: userId, email: normEmail }, recoveryCode });
  });

  app.post('/api/auth/login', async (req, reply) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return reply.code(400).send({ error: 'E-Mail und Passwort erforderlich.' });
    }
    const schluessel = limitSchluessel(req, email);
    const limit = loginLimiter.pruefe(schluessel);
    if (!limit.erlaubt) {
      reply.header('Retry-After', String(limit.retryNachSek));
      return reply.code(429).send({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    }
    const normEmail = email.trim().toLowerCase();
    const user = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(normEmail);
    // Konstante-Zeit-ähnliches Verhalten: bei unbekannter E-Mail trotzdem antworten.
    const ok = user ? await verify(user.password_hash, password).catch(() => false) : false;
    if (!user || !ok) {
      return reply.code(401).send({ error: 'E-Mail oder Passwort falsch.' });
    }
    loginLimiter.erfolg(schluessel); // gültiger Login → Zähler leeren
    const { token, expires } = createSession(db, user.id);
    setSessionCookie(reply, token, expires);
    return reply.send({ user: { id: user.id, email: user.email } });
  });

  // Passwort-Reset per Recovery-Code (kein Mail-Server nötig). Gleiche
  // Rate-Limit-Bremse wie der Login (geteiltes Budget je IP+E-Mail), damit
  // der Code nicht durchprobiert werden kann. Erfolgreicher Reset widerruft
  // alle bestehenden Sitzungen und rotiert den Code (Einmal-Gebrauch).
  app.post('/api/auth/recover', async (req, reply) => {
    const { email, recoveryCode, newPassword } = req.body || {};
    if (typeof email !== 'string' || typeof recoveryCode !== 'string') {
      return reply.code(400).send({ error: 'E-Mail und Recovery-Code erforderlich.' });
    }
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORT) {
      return reply.code(400).send({ error: `Neues Passwort muss mind. ${MIN_PASSWORT} Zeichen haben.` });
    }
    const schluessel = limitSchluessel(req, email);
    const limit = loginLimiter.pruefe(schluessel);
    if (!limit.erlaubt) {
      reply.header('Retry-After', String(limit.retryNachSek));
      return reply.code(429).send({ error: 'Zu viele Versuche. Bitte später erneut versuchen.' });
    }
    const normEmail = email.trim().toLowerCase();
    const user = db
      .prepare('SELECT id, email, recovery_hash FROM users WHERE email = ?')
      .get(normEmail);
    const ok =
      user && user.recovery_hash
        ? await verify(user.recovery_hash, normalisiereCode(recoveryCode)).catch(() => false)
        : false;
    if (!ok) {
      return reply.code(401).send({ error: 'E-Mail oder Recovery-Code falsch.' });
    }
    loginLimiter.erfolg(schluessel);

    const neuerCode = erzeugeRecoveryCode();
    db.prepare('UPDATE users SET password_hash = ?, recovery_hash = ? WHERE id = ?').run(
      await hash(newPassword),
      await hash(normalisiereCode(neuerCode)),
      user.id
    );
    // Alle alten Sitzungen widerrufen (falls das Konto kompromittiert war).
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(user.id);

    const { token, expires } = createSession(db, user.id);
    setSessionCookie(reply, token, expires);
    return reply.send({ user: { id: user.id, email: user.email }, recoveryCode: neuerCode });
  });

  // Angemeldet einen (neuen) Recovery-Code erzeugen – für Konten von vor dem
  // Feature oder wenn der notierte Code verloren ging. Rotiert den alten.
  app.post('/api/auth/recovery-code', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
    const recoveryCode = erzeugeRecoveryCode();
    db.prepare('UPDATE users SET recovery_hash = ? WHERE id = ?').run(
      await hash(normalisiereCode(recoveryCode)),
      req.user.id
    );
    return reply.send({ recoveryCode });
  });

  app.post('/api/auth/logout', async (req, reply) => {
    const token = req.cookies?.[app.config.cookieName];
    deleteSession(db, token);
    reply.clearCookie(app.config.cookieName, { path: '/' });
    return reply.send({ ok: true });
  });

  app.get('/api/auth/me', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
    return reply.send({ user: req.user });
  });

  // DSGVO „Recht auf Löschung": entfernt das Konto und – per ON DELETE CASCADE
  // (foreign_keys=ON) – alle zugehörigen sessions/progress/gamification-Zeilen.
  app.delete('/api/auth/account', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    reply.clearCookie(app.config.cookieName, { path: '/' });
    return reply.send({ ok: true });
  });
}
