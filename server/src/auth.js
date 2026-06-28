import { hash, verify } from '@node-rs/argon2';
import { createSession, deleteSession } from './session.js';
import { erstelleRateLimiter } from './lib/rateLimit.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORT = 8;

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
    const info = db
      .prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)')
      .run(normEmail, passwordHash, new Date().toISOString());
    const userId = Number(info.lastInsertRowid);

    const { token, expires } = createSession(db, userId);
    setSessionCookie(reply, token, expires);
    return reply.code(201).send({ user: { id: userId, email: normEmail } });
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
}
