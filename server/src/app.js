import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { openDb } from './db.js';
import { userFromToken } from './session.js';
import { authRoutes } from './auth.js';
import { progressRoutes } from './progress.js';
import { gamificationRoutes } from './gamification.js';
import { ranglisteRoutes } from './rangliste.js';
import { adminRoutes } from './admin.js';
import { datenRoutes } from './daten.js';
import { registrierungsModus, adminEmails } from './lib/einladung.js';
import { erstelleRateLimiter } from './lib/rateLimit.js';

/**
 * Baut die Fastify-App (ohne sie zu starten) – so kann sie in Tests via
 * `app.inject` ohne Netzwerk geprüft werden.
 *
 * @param {Object} [opts]
 * @param {string} [opts.dbPath]        SQLite-Pfad (Default ":memory:").
 * @param {string} [opts.corsOrigin]    Erlaubter Origin für CORS (Dev).
 * @param {string} [opts.cookieName]
 * @param {boolean} [opts.secureCookie]
 * @param {boolean} [opts.logger]
 * @param {object}  [opts.loginLimiter] Rate-Limiter für /api/auth/login (Test-Injektion).
 * @param {'open'|'invite'|'closed'} [opts.registrierung]  Wer darf Konten anlegen (Default open).
 * @param {string}  [opts.adminEmails]   Komma-Liste der Admin-E-Mails (Admin-Bereich).
 * @param {boolean} [opts.trustProxy]    Hinter Reverse-Proxy `X-Forwarded-For` vertrauen
 *                                        (damit `req.ip` die echte Client-IP ist).
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildApp(opts = {}) {
  // Hinter Nginx/Caddy muss Fastify dem `X-Forwarded-For`-Header vertrauen,
  // sonst ist `req.ip` immer die Proxy-IP (Rate-Limit würde alle Nutzer in
  // denselben Topf werfen). In Tests/lokal ohne Proxy bewusst aus.
  const app = Fastify({
    logger: opts.logger ?? false,
    trustProxy: opts.trustProxy ?? false,
    // Härtung: Request-Bodies deckeln (größter legitimer Body ist der
    // Progress-Merge mit einigen hundert kB; 1 MiB lässt Luft).
    bodyLimit: 1024 * 1024,
  });

  // Rate-Limiter pro App-Instanz (Auth-Routen lesen ihn). Tests können einen
  // eigenen (z. B. mit kleinem Limit / fixer Uhr) injizieren.
  app.decorate('loginLimiter', opts.loginLimiter || erstelleRateLimiter({ maxVersuche: 8, fensterMs: 15 * 60 * 1000 }));

  // Konfiguration zentral ablegen (Routen lesen daraus).
  app.decorate('config', {
    cookieName: opts.cookieName || 'ap_session',
    secureCookie: opts.secureCookie ?? false,
    registrierung: registrierungsModus(opts.registrierung),
    adminEmails: adminEmails(opts.adminEmails),
  });

  const db = openDb(opts.dbPath || ':memory:');
  app.decorate('db', db);
  app.addHook('onClose', () => db.close());

  await app.register(cookie);
  if (opts.corsOrigin) {
    await app.register(cors, { origin: opts.corsOrigin, credentials: true });
  }

  // Nutzer aus der Sitzung laden (für alle Routen verfügbar).
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (req) => {
    const token = req.cookies?.[app.config.cookieName];
    const user = userFromToken(db, token);
    // Admin-Rolle über ADMIN_EMAILS (keine Rechte-Eskalation per API möglich).
    req.user = user ? { ...user, admin: app.config.adminEmails.has(user.email) } : null;
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(progressRoutes);
  await app.register(gamificationRoutes);
  await app.register(ranglisteRoutes);
  await app.register(adminRoutes);
  await app.register(datenRoutes);

  return app;
}
