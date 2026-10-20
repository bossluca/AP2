import { pruefeAnzeigename, wochenPunkte, rangiere } from './lib/rangliste.js';

/** Maximale Länge der öffentlichen Liste. */
const TOP_N = 20;

/**
 * Opt-in Wochen-Rangliste unter /api/rangliste. Datenschutz: Es erscheinen nur
 * Konten, die aktiv zugestimmt **und** einen Anzeigenamen gewählt haben; die
 * E-Mail wird nie ausgegeben. Punkte = Lernaktivität der letzten 7 Tage aus dem
 * ohnehin gesyncten Gamification-Stand (keine neuen Daten).
 *
 * Alle Routen erfordern eine gültige Sitzung.
 */
export async function ranglisteRoutes(app) {
  const { db } = app;

  app.addHook('preHandler', async (req, reply) => {
    if (!req.user) return reply.code(401).send({ error: 'Nicht angemeldet.' });
  });

  app.get('/api/rangliste', async (req) => {
    const ich = db
      .prepare('SELECT anzeigename, rangliste_optin FROM users WHERE id = ?')
      .get(req.user.id);
    const rows = db
      .prepare(
        `SELECT u.id, u.anzeigename, g.activity, g.xp
           FROM users u LEFT JOIN gamification g ON g.user_id = u.id
          WHERE u.rangliste_optin = 1 AND u.anzeigename IS NOT NULL`
      )
      .all();
    const jetzt = new Date();
    const alle = rangiere(
      rows.map((r) => {
        let activity = {};
        try {
          activity = r.activity ? JSON.parse(r.activity) : {};
        } catch {
          activity = {};
        }
        return { id: r.id, anzeigename: r.anzeigename, punkte: wochenPunkte(activity, jetzt), xp: r.xp || 0 };
      })
    );
    const ausgabe = (e) => ({
      rang: e.rang,
      anzeigename: e.anzeigename,
      punkte: e.punkte,
      xp: e.xp,
      istIch: e.id === req.user.id,
    });
    const eigener = alle.find((e) => e.id === req.user.id);
    return {
      profil: { optIn: ich?.rangliste_optin === 1, anzeigename: ich?.anzeigename || '' },
      teilnehmer: alle.length,
      eintraege: alle.slice(0, TOP_N).map(ausgabe),
      // Eigener Platz auch außerhalb der Top-Liste.
      ich: eigener ? ausgabe(eigener) : null,
    };
  });

  app.put('/api/rangliste/profil', async (req, reply) => {
    const { optIn, anzeigename } = req.body || {};
    if (typeof optIn !== 'boolean') {
      return reply.code(400).send({ error: 'optIn muss true oder false sein.' });
    }
    if (!optIn) {
      db.prepare('UPDATE users SET rangliste_optin = 0 WHERE id = ?').run(req.user.id);
      const row = db.prepare('SELECT anzeigename FROM users WHERE id = ?').get(req.user.id);
      return { profil: { optIn: false, anzeigename: row?.anzeigename || '' } };
    }
    const name = pruefeAnzeigename(anzeigename);
    if (!name) {
      return reply
        .code(400)
        .send({ error: 'Anzeigename: 3–20 Zeichen (Buchstaben, Ziffern, Leerzeichen, _ . -).' });
    }
    const vergeben = db
      .prepare('SELECT id FROM users WHERE lower(anzeigename) = lower(?) AND id != ?')
      .get(name, req.user.id);
    if (vergeben) return reply.code(409).send({ error: 'Dieser Anzeigename ist schon vergeben.' });
    db.prepare('UPDATE users SET anzeigename = ?, rangliste_optin = 1 WHERE id = ?').run(name, req.user.id);
    return { profil: { optIn: true, anzeigename: name } };
  });
}
