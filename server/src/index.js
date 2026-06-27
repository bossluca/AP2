import { buildApp } from './app.js';

/**
 * Produktiv-/Dev-Entrypoint. Liest Konfiguration aus Umgebungsvariablen
 * (siehe .env.example) und startet den HTTP-Server.
 */
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

const app = await buildApp({
  dbPath: process.env.DB_PATH || './data/lernapp.sqlite',
  corsOrigin: process.env.CORS_ORIGIN || undefined,
  cookieName: process.env.SESSION_COOKIE_NAME || 'ap_session',
  secureCookie: process.env.NODE_ENV === 'production',
  logger: true,
});

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
