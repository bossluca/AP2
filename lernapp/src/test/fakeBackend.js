/**
 * Kleines In-Memory-Backend für Integrationstests mit echten Providern:
 * ersetzt `fetch` und bildet die von `lib/api.js` genutzten Routen nach
 * (Auth mit einer Cookie-Sitzung, Fortschritt, Gamification, Konto-Daten).
 * Jeder Request wird mit dem Konto protokolliert, unter dem er ankam – so
 * lässt sich prüfen, dass Daten eines Kontos nie unter einem anderen landen.
 */
export function erzeugeFakeBackend({ konfig = { registrierung: 'open' } } = {}) {
  const konten = new Map(); // email → { id, email, passwort }
  const speicher = new Map(); // id → { progress, gamification, daten }
  let sitzung = null; // userId der aktuellen Cookie-Sitzung
  let naechsteId = 1;
  const log = [];
  const zustand = { putsFehlschlagen: false, konfig };

  function legeKontoAn(email, passwort = 'geheim1234') {
    const id = naechsteId++;
    konten.set(email, { id, email, passwort });
    speicher.set(id, { progress: {}, gamification: null, daten: {} });
    return { id, email };
  }

  const antwort = (status, data) => ({
    ok: status < 400,
    status,
    json: async () => data,
  });

  async function fetchFake(url, opts = {}) {
    const method = (opts.method || 'GET').toUpperCase();
    const pfad = String(url).replace(/^.*\/api/, '');
    const body = opts.body ? JSON.parse(opts.body) : undefined;
    log.push({ method, pfad, userId: sitzung, body });
    const nutzer = [...konten.values()].find((k) => k.id === sitzung);
    const meins = nutzer ? speicher.get(nutzer.id) : null;
    const oeffentlich = (k) => ({ id: k.id, email: k.email });

    if (pfad === '/auth/config') return antwort(200, zustand.konfig);
    if (pfad === '/auth/login' && method === 'POST') {
      const k = konten.get(body.email);
      if (!k || k.passwort !== body.password) return antwort(401, { error: 'Login fehlgeschlagen' });
      sitzung = k.id;
      return antwort(200, { user: oeffentlich(k) });
    }
    if (pfad === '/auth/register' && method === 'POST') {
      const k = legeKontoAn(body.email, body.password);
      sitzung = k.id;
      return antwort(200, { user: k, recoveryCode: 'AAAA-BBBB-CCCC-DDDD' });
    }
    if (!nutzer) return antwort(401, { error: 'Nicht angemeldet' });

    if (pfad === '/auth/me') return antwort(200, { user: oeffentlich(nutzer) });
    if (pfad === '/auth/logout') {
      sitzung = null;
      return antwort(200, { ok: true });
    }
    if (pfad === '/auth/account' && method === 'DELETE') {
      konten.delete(nutzer.email);
      speicher.delete(nutzer.id);
      sitzung = null;
      return antwort(200, { ok: true });
    }
    if (pfad === '/progress' && method === 'GET') return antwort(200, { progress: meins.progress });
    if (pfad === '/progress' && method === 'DELETE') {
      meins.progress = {};
      return antwort(200, { ok: true });
    }
    if (pfad === '/progress/merge') {
      for (const [id, e] of Object.entries(body.progress || {})) {
        if (!meins.progress[id]) meins.progress[id] = e;
      }
      return antwort(200, { imported: Object.keys(body.progress || {}).length });
    }
    if (pfad.startsWith('/progress/') && method === 'PUT') {
      if (zustand.putsFehlschlagen) return antwort(503, { error: 'offline' });
      meins.progress[decodeURIComponent(pfad.slice('/progress/'.length))] = body;
      return antwort(200, { ok: true });
    }
    if (pfad === '/gamification' && method === 'GET') {
      return antwort(200, { gamification: meins.gamification });
    }
    if (pfad === '/gamification' && method === 'PUT') {
      meins.gamification = body;
      return antwort(200, { ok: true });
    }
    if (pfad === '/daten' && method === 'GET') {
      const daten = {};
      for (const [k, wert] of Object.entries(meins.daten)) daten[k] = { wert };
      return antwort(200, { daten });
    }
    if (pfad.startsWith('/daten/') && method === 'PUT') {
      meins.daten[pfad.slice('/daten/'.length)] = body.wert;
      return antwort(200, { ok: true });
    }
    return antwort(404, { error: 'unbekannt' });
  }

  return {
    fetch: fetchFake,
    log,
    zustand,
    legeKontoAn,
    speicherVon: (id) => speicher.get(id),
    setzeSitzung: (id) => {
      sitzung = id;
    },
    /** Requests, die unter Konto `id` ankamen. */
    requestsVon: (id) => log.filter((r) => r.userId === id),
  };
}
