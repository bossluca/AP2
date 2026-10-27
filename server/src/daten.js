/**
 * Zusätzliche Konto-Daten unter /api/daten: kleine JSON-Dokumente je Nutzer
 * und Schlüssel (Lernplan/Einstufung, eigene Kartenstapel), damit sie wie der
 * Lernstand geräteübergreifend verfügbar sind. Nur freigegebene Schlüssel,
 * Größe gedeckelt. Der Client merged beim Login und schreibt danach durch.
 *
 * Alle Routen erfordern eine gültige Sitzung.
 */
import { istObjektOderListe } from './lib/validierung.js';

/** Freigegebene Schlüssel → maximale JSON-Größe in Bytes. */
export const DATEN_SCHLUESSEL = {
  einstufung: 64 * 1024,
  eigeneKarten: 512 * 1024,
};

export async function datenRoutes(app) {
  const { db } = app;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
  });

  app.get('/api/daten', async (req) => {
    const rows = db.prepare('SELECT schluessel, wert, updated_at FROM user_daten WHERE user_id = ?').all(req.user.id);
    const daten = {};
    for (const r of rows) {
      try {
        daten[r.schluessel] = { wert: JSON.parse(r.wert), updatedAt: r.updated_at };
      } catch {
        /* defekte Zeile ignorieren */
      }
    }
    return { daten };
  });

  app.put('/api/daten/:schluessel', async (req, reply) => {
    const { schluessel } = req.params;
    const max = DATEN_SCHLUESSEL[schluessel];
    if (!max) return reply.code(400).send({ error: 'Unbekannter Schlüssel.' });
    const wert = req.body?.wert ?? null;
    const json = JSON.stringify(wert);
    if (Buffer.byteLength(json) > max) {
      return reply.code(413).send({ error: `Zu groß (max. ${Math.round(max / 1024)} KiB).` });
    }
    // C3: nur Objekt/Liste (oder null = leeren) – keine nackten Zahlen/Texte.
    if (!istObjektOderListe(wert)) {
      return reply.code(400).send({ error: 'wert muss ein Objekt oder eine Liste sein.' });
    }
    const jetzt = new Date().toISOString();
    db.prepare(
      `INSERT INTO user_daten (user_id, schluessel, wert, updated_at) VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, schluessel) DO UPDATE SET wert = excluded.wert, updated_at = excluded.updated_at`
    ).run(req.user.id, schluessel, json, jetzt);
    return { ok: true, updatedAt: jetzt };
  });
}
