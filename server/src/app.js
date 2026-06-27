import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import { openDb } from './db.js';
import { userFromToken } from './session.js';
import { authRoutes } from './auth.js';
import { progressRoutes } from './progress.js';
import { gamificationRoutes } from './gamification.js';

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
 * @returns {Promise<import('fastify').FastifyInstance>}
 */
export async function buildApp(opts = {}) {
  const app = Fastify({ logger: opts.logger ?? false });

  // Konfiguration zentral ablegen (Routen lesen daraus).
  app.decorate('config', {
    cookieName: opts.cookieName || 'ap_session',
    secureCookie: opts.secureCookie ?? false,
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
    req.user = userFromToken(db, token);
  });

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(progressRoutes);
  await app.register(gamificationRoutes);

  return app;
}
