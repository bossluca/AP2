import { buildApp } from './app.js';
import { raeumeSessionsAuf } from './session.js';
import { trustProxyAusEnv } from './lib/proxy.js';

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
  registrierung: process.env.REGISTRATION,
  adminEmails: process.env.ADMIN_EMAILS,
  // Hinter dem Reverse-Proxy (Standard-Deployment) genau 1 Hop vertrauen, damit
  // das Login-Rate-Limit pro echter Client-IP greift und gefälschte
  // X-Forwarded-For-Einträge nichts bewirken. TRUST_PROXY=0 = Direktbetrieb.
  trustProxy: trustProxyAusEnv(process.env.TRUST_PROXY),
  logger: true,
});

// Abgelaufene Sitzungen periodisch aufräumen (sonst wachsen verwaiste Zeilen
// unbegrenzt). Beim Start einmal, danach alle 6 Stunden; unref() blockiert
// ein sauberes Beenden nicht.
const aufraeumen = () => {
  try {
    const n = raeumeSessionsAuf(app.db);
    if (n > 0) app.log.info(`Session-Aufräumjob: ${n} abgelaufene Sitzung(en) entfernt.`);
  } catch (err) {
    app.log.warn({ err }, 'Session-Aufräumjob fehlgeschlagen.');
  }
};
aufraeumen();
setInterval(aufraeumen, 6 * 60 * 60 * 1000).unref();

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
