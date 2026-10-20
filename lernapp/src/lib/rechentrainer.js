/**
 * Rechen-Trainer: erzeugt unbegrenzt viele AP2-typische Rechenaufgaben mit
 * Lösungsweg (Subnetting, IPv6, RAID, Übertragungszeit, Stromkosten,
 * Verfügbarkeit, Zahlensysteme) und prüft Antworten tolerant (Komma/Punkt,
 * Einheiten, Rundung). Rein, RNG injizierbar – keine Inhalte aus Prüfungen.
 */

/**
 * @typedef {Object} Rechenaufgabe
 * @property {string} typ          Generator-ID (s. {@link AUFGABEN_TYPEN}).
 * @property {string} frage        Aufgabentext (Markdown).
 * @property {'zahl'|'text'} art   Zahl (mit Toleranz) oder Text (normalisiert).
 * @property {number|string} loesung
 * @property {number} [toleranz]   Erlaubte relative Abweichung bei Zahlen (0.01 = 1 %).
 * @property {string} [einheit]    Anzeige hinter dem Eingabefeld.
 * @property {string} loesungsweg  Rechenweg (Markdown).
 */

const ganz = (rng, min, max) => min + Math.floor(rng() * (max - min + 1));
const waehle = (rng, liste) => liste[Math.floor(rng() * liste.length)];
const de = (n, stellen = 2) =>
  Number(n).toLocaleString('de-DE', { maximumFractionDigits: stellen, minimumFractionDigits: 0 });

// --- IPv4 -----------------------------------------------------------------

const ipZuZahl = (ip) => ip.reduce((z, o) => z * 256 + o, 0);
const zahlZuIp = (z) => [24, 16, 8, 0].map((s) => Math.floor(z / 2 ** s) % 256).join('.');
const maskeAusPraefix = (p) => (p === 0 ? 0 : (2 ** 32 - 2 ** (32 - p)));

function hostsProNetz(rng) {
  const praefix = ganz(rng, 20, 30);
  const hosts = 2 ** (32 - praefix) - 2;
  return {
    typ: 'hosts',
    frage: `Wie viele **nutzbare Hostadressen** hat ein IPv4-Netz mit dem Präfix **/${praefix}**?`,
    art: 'zahl',
    loesung: hosts,
    toleranz: 0,
    loesungsweg: `Hostbits = 32 − ${praefix} = ${32 - praefix}\n\n2^${32 - praefix} − 2 (Netz- und Broadcastadresse) = **${hosts}**`,
  };
}

function netzadresse(rng) {
  const praefix = ganz(rng, 18, 29);
  const ip = [waehle(rng, [10, 172, 192]), ganz(rng, 0, 255), ganz(rng, 0, 255), ganz(rng, 1, 254)];
  if (ip[0] === 192) ip[1] = 168;
  if (ip[0] === 172) ip[1] = ganz(rng, 16, 31);
  const z = ipZuZahl(ip);
  const block = 2 ** (32 - praefix);
  const netz = z - (z % block);
  const broadcast = netz + block - 1;
  const fragtBroadcast = rng() < 0.5;
  const ziel = fragtBroadcast ? broadcast : netz;
  // Prüfungs-Trick: nur das „interessante" Oktett rechnen.
  const oktett = Math.floor(praefix / 8);
  const schritt = 256 / 2 ** (praefix % 8);
  const wert = ip[oktett];
  const trick =
    praefix % 8 === 0
      ? ''
      : `Kurzweg: ${oktett + 1}. Oktett, Schrittweite 256 ÷ 2^${praefix % 8} = ${schritt} → ` +
        `${wert} liegt im Block ${wert - (wert % schritt)}–${wert - (wert % schritt) + schritt - 1}\n\n`;
  return {
    typ: 'netzadresse',
    frage: `Ein Host hat die Adresse **${ip.join('.')}/${praefix}**. Wie lautet die **${fragtBroadcast ? 'Broadcastadresse' : 'Netzadresse'}**?`,
    art: 'text',
    loesung: zahlZuIp(ziel),
    loesungsweg:
      trick +
      `Blockgröße = 2^(32 − ${praefix}) = ${block} Adressen\n\n` +
      `Netzadresse = Adresse abgerundet auf ein Vielfaches der Blockgröße = ${zahlZuIp(netz)}\n\n` +
      `Broadcast = Netzadresse + ${block} − 1 = ${zahlZuIp(broadcast)}\n\n` +
      `Maske: ${zahlZuIp(maskeAusPraefix(praefix))}`,
  };
}

function teilnetze(rng) {
  const basis = ganz(rng, 16, 24);
  const anzahl = waehle(rng, [2, 3, 4, 5, 6, 8, 10, 12, 16]);
  const bits = Math.ceil(Math.log2(anzahl));
  const neu = basis + bits;
  return {
    typ: 'teilnetze',
    frage: `Das Netz **10.${ganz(rng, 0, 255)}.0.0/${basis}** soll in mindestens **${anzahl} gleich große Teilnetze** aufgeteilt werden. Welches **Präfix** erhalten die Teilnetze (nur die Zahl)?`,
    art: 'zahl',
    loesung: neu,
    toleranz: 0,
    einheit: '/',
    loesungsweg: `Benötigte Subnetzbits: 2^n ≥ ${anzahl} ⇒ n = ${bits} (2^${bits} = ${2 ** bits})\n\nNeues Präfix = ${basis} + ${bits} = **/${neu}**`,
  };
}

// --- IPv6 -----------------------------------------------------------------

/** Kürzt eine volle IPv6-Adresse (8 Gruppen) nach RFC 5952. */
export function kuerzeIpv6(gruppen) {
  const g = gruppen.map((x) => parseInt(x, 16).toString(16));
  // Längste Folge von ≥ 2 Null-Gruppen (bei Gleichstand die erste) → „::"
  let best = { start: -1, len: 0 };
  for (let i = 0; i < 8; i += 1) {
    if (g[i] !== '0') continue;
    let j = i;
    while (j < 8 && g[j] === '0') j += 1;
    if (j - i > best.len) best = { start: i, len: j - i };
    i = j;
  }
  if (best.len < 2) return g.join(':');
  const links = g.slice(0, best.start).join(':');
  const rechts = g.slice(best.start + best.len).join(':');
  return `${links}::${rechts}`;
}

function ipv6Kuerzen(rng) {
  const hex = () => ganz(rng, 0, 0xffff).toString(16).padStart(4, '0');
  const gruppen = Array.from({ length: 8 }, (_, i) => (i === 0 ? '2001' : i === 1 ? '0db8' : hex()));
  // Nullen einstreuen: eine längere Null-Folge + einzelne führende Nullen.
  const start = ganz(rng, 2, 5);
  const laenge = ganz(rng, 2, 8 - start);
  for (let i = start; i < start + laenge; i += 1) gruppen[i] = '0000';
  const k = ganz(rng, 2, 7);
  if (gruppen[k] !== '0000') gruppen[k] = `00${gruppen[k].slice(2)}`;
  return {
    typ: 'ipv6',
    frage: `Kürze die IPv6-Adresse so weit wie möglich:\n\n\`${gruppen.join(':')}\``,
    art: 'text',
    loesung: kuerzeIpv6(gruppen),
    loesungsweg:
      'Regeln: führende Nullen je Gruppe weglassen; die **längste** Folge von Null-Gruppen ' +
      'einmal durch `::` ersetzen; Kleinbuchstaben.\n\n' +
      `Ergebnis: \`${kuerzeIpv6(gruppen)}\``,
  };
}

// --- Storage / RAID -------------------------------------------------------

const RAID = {
  0: { min: 2, nutz: (n, g) => n * g, text: (n, g) => `RAID 0 (Striping): n × Größe = ${n} × ${g}` },
  1: { min: 2, nutz: (_n, g) => g, text: (_n, g) => `RAID 1 (Spiegelung): Kapazität einer Platte = ${g}` },
  5: { min: 3, nutz: (n, g) => (n - 1) * g, text: (n, g) => `RAID 5: (n − 1) × Größe = ${n - 1} × ${g}` },
  6: { min: 4, nutz: (n, g) => (n - 2) * g, text: (n, g) => `RAID 6: (n − 2) × Größe = ${n - 2} × ${g}` },
  10: { min: 4, nutz: (n, g) => (n / 2) * g, text: (n, g) => `RAID 10: n / 2 × Größe = ${n / 2} × ${g}` },
};

function raidKapazitaet(rng) {
  const level = waehle(rng, [0, 1, 5, 6, 10]);
  const r = RAID[level];
  let n = ganz(rng, r.min, 8);
  if (level === 10 && n % 2) n += 1;
  if (level === 1) n = 2;
  const groesse = waehle(rng, [2, 4, 6, 8, 12, 16]);
  const nutz = r.nutz(n, groesse);
  return {
    typ: 'raid',
    frage: `Ein Server erhält **${n} Festplatten à ${groesse} TB** im **RAID ${level}**. Wie groß ist die **nutzbare Kapazität** in TB?`,
    art: 'zahl',
    loesung: nutz,
    toleranz: 0,
    einheit: 'TB',
    loesungsweg: `${r.text(n, groesse)} TB = **${nutz} TB**`,
  };
}

// --- Übertragung ----------------------------------------------------------

function uebertragungszeit(rng) {
  const groesseGB = waehle(rng, [0.5, 1, 2, 4, 5, 8, 10, 20, 50]);
  const mbit = waehle(rng, [16, 50, 100, 250, 500, 1000]);
  const sekunden = (groesseGB * 1000 * 8) / mbit;
  return {
    typ: 'uebertragung',
    frage:
      `Eine Datei mit **${de(groesseGB)} GB** wird über eine Leitung mit **${mbit} Mbit/s** übertragen. ` +
      'Wie viele **Sekunden** dauert das (ohne Overhead, 1 GB = 1000 MB, 1 Byte = 8 Bit)?',
    art: 'zahl',
    loesung: Math.round(sekunden * 10) / 10,
    toleranz: 0.01,
    einheit: 's',
    loesungsweg:
      `${de(groesseGB)} GB = ${de(groesseGB * 1000)} MB = ${de(groesseGB * 8000)} Mbit\n\n` +
      `${de(groesseGB * 8000)} Mbit ÷ ${mbit} Mbit/s = **${de(sekunden, 1)} s** (≈ ${de(sekunden / 60, 1)} min)`,
  };
}

// --- Energie --------------------------------------------------------------

function stromkosten(rng) {
  const watt = waehle(rng, [45, 80, 120, 150, 250, 350, 450, 600]);
  const stunden = waehle(rng, [8, 10, 12, 24]);
  const tage = waehle(rng, [220, 250, 365]);
  const preis = waehle(rng, [0.28, 0.3, 0.32, 0.35, 0.4]);
  const kwh = (watt * stunden * tage) / 1000;
  const kosten = kwh * preis;
  return {
    typ: 'strom',
    frage:
      `Ein Gerät nimmt **${watt} W** auf und läuft **${stunden} h** pro Tag an **${tage} Tagen** im Jahr. ` +
      `Strompreis: **${de(preis)} €/kWh**. Wie hoch sind die **Stromkosten pro Jahr** in Euro?`,
    art: 'zahl',
    loesung: Math.round(kosten * 100) / 100,
    toleranz: 0.01,
    einheit: '€',
    loesungsweg:
      `Energie = ${watt} W × ${stunden} h × ${tage} = ${de(watt * stunden * tage, 0)} Wh = ${de(kwh)} kWh\n\n` +
      `Kosten = ${de(kwh)} kWh × ${de(preis)} €/kWh = **${de(kosten)} €**`,
  };
}

function usvLaufzeit(rng) {
  const wh = waehle(rng, [300, 450, 600, 900, 1200, 1500]);
  const last = waehle(rng, [150, 200, 300, 400, 450, 600]);
  const minuten = (wh / last) * 60;
  return {
    typ: 'usv',
    frage:
      `Eine USV hat eine nutzbare Akkukapazität von **${wh} Wh**. Die angeschlossenen Geräte ziehen ` +
      `zusammen **${last} W**. Wie viele **Minuten** überbrückt die USV (Verluste vernachlässigt)?`,
    art: 'zahl',
    loesung: Math.round(minuten * 10) / 10,
    toleranz: 0.01,
    einheit: 'min',
    loesungsweg: `Laufzeit = ${wh} Wh ÷ ${last} W = ${de(wh / last, 3)} h\n\n× 60 = **${de(minuten, 1)} min**`,
  };
}

// --- Verfügbarkeit --------------------------------------------------------

function verfuegbarkeit(rng) {
  const prozent = waehle(rng, [99, 99.5, 99.9, 99.95, 99.99]);
  const ausfall = 365 * 24 * (1 - prozent / 100);
  return {
    typ: 'verfuegbarkeit',
    frage: `Ein Dienst ist mit **${de(prozent)} % Verfügbarkeit** vereinbart. Wie viele **Stunden Ausfall pro Jahr** (365 Tage) sind maximal erlaubt?`,
    art: 'zahl',
    loesung: Math.round(ausfall * 100) / 100,
    toleranz: 0.01,
    einheit: 'h',
    loesungsweg:
      `Jahr = 365 × 24 h = 8760 h\n\nAusfall = 8760 h × (1 − ${de(prozent / 100, 4)}) = **${de(ausfall)} h**` +
      ` (≈ ${de(ausfall * 60, 0)} min)`,
  };
}

// --- Zahlensysteme --------------------------------------------------------

function zahlensysteme(rng) {
  const zahl = ganz(rng, 10, 255);
  const richtung = waehle(rng, ['dez-bin', 'bin-dez', 'dez-hex', 'hex-dez']);
  const bin = zahl.toString(2).padStart(8, '0');
  const hex = zahl.toString(16).toUpperCase();
  const tabelle = {
    'dez-bin': [`die Dezimalzahl **${zahl}** in **Binär** (8 Bit)`, bin, 'text'],
    'bin-dez': [`die Binärzahl **${bin}** in **Dezimal**`, zahl, 'zahl'],
    'dez-hex': [`die Dezimalzahl **${zahl}** in **Hexadezimal**`, hex, 'text'],
    'hex-dez': [`die Hexadezimalzahl **${hex}** in **Dezimal**`, zahl, 'zahl'],
  };
  const [text, loesung, art] = tabelle[richtung];
  const stellen = bin
    .split('')
    .map((b, i) => (b === '1' ? 2 ** (7 - i) : 0))
    .filter(Boolean);
  return {
    typ: 'zahlensysteme',
    frage: `Wandle ${text} um.`,
    art,
    loesung,
    toleranz: 0,
    loesungsweg:
      `${zahl} = ${stellen.join(' + ')}\n\nBinär: \`${bin}\` · Hex: \`${hex}\` ` +
      `(${bin.slice(0, 4)} = ${parseInt(bin.slice(0, 4), 2).toString(16).toUpperCase()}, ` +
      `${bin.slice(4)} = ${parseInt(bin.slice(4), 2).toString(16).toUpperCase()})`,
  };
}

/** Verfügbare Aufgabentypen (Reihenfolge = Anzeige). */
export const AUFGABEN_TYPEN = [
  { id: 'hosts', titel: 'Hosts pro Netz', thema: 'subnetting', erzeuge: hostsProNetz },
  { id: 'netzadresse', titel: 'Netz-/Broadcastadresse', thema: 'subnetting', erzeuge: netzadresse },
  { id: 'teilnetze', titel: 'Teilnetze bilden', thema: 'subnetting', erzeuge: teilnetze },
  { id: 'ipv6', titel: 'IPv6 kürzen', thema: 'subnetting', erzeuge: ipv6Kuerzen },
  { id: 'raid', titel: 'RAID-Kapazität', thema: 'backup', erzeuge: raidKapazitaet },
  { id: 'uebertragung', titel: 'Übertragungszeit', thema: 'routing', erzeuge: uebertragungszeit },
  { id: 'strom', titel: 'Stromkosten', thema: 'hardware', erzeuge: stromkosten },
  { id: 'usv', titel: 'USV-Laufzeit', thema: 'hardware', erzeuge: usvLaufzeit },
  { id: 'verfuegbarkeit', titel: 'Verfügbarkeit', thema: 'hochverfuegbarkeit', erzeuge: verfuegbarkeit },
  { id: 'zahlensysteme', titel: 'Zahlensysteme', thema: 'linux', erzeuge: zahlensysteme },
];

/**
 * Erzeugt eine Aufgabe eines Typs (oder zufällig aus `typen`).
 * @param {string[]|string} [typen]  Typ-ID(s); leer = alle.
 * @param {() => number} [rng]
 * @returns {Rechenaufgabe}
 */
export function erzeugeAufgabe(typen = [], rng = Math.random) {
  const ids = (Array.isArray(typen) ? typen : [typen]).filter(Boolean);
  const pool = AUFGABEN_TYPEN.filter((t) => ids.length === 0 || ids.includes(t.id));
  const typ = waehle(rng, pool.length ? pool : AUFGABEN_TYPEN);
  return typ.erzeuge(rng);
}

/** Zahl aus Nutzereingabe: Komma/Punkt, Tausenderpunkte, Einheiten, „/" weg. */
export function parseZahl(eingabe) {
  let s = String(eingabe ?? '')
    .trim()
    .replace(/[^\d,.-]/g, '');
  if (!s) return null;
  // „1.234,5" → 1234.5 ; „1,5" → 1.5 ; „1.5" → 1.5 ; „1.234" (Tausender) → 1234
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Text normalisieren: klein, ohne Leerzeichen und führende „0x"/„0b". */
function normText(s) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/^0[xb]/, '');
}

/**
 * Prüft eine Antwort.
 * @param {Rechenaufgabe} aufgabe
 * @param {string} eingabe
 * @returns {boolean}
 */
export function pruefeRechenantwort(aufgabe, eingabe) {
  if (aufgabe.art === 'zahl') {
    const n = parseZahl(eingabe);
    if (n === null) return false;
    const soll = Number(aufgabe.loesung);
    const tol = Math.max(Math.abs(soll) * (aufgabe.toleranz || 0), 1e-9);
    return Math.abs(n - soll) <= tol;
  }
  const ist = normText(eingabe);
  const soll = normText(aufgabe.loesung);
  if (aufgabe.typ === 'ipv6') return ist === soll;
  if (aufgabe.typ === 'zahlensysteme' && /^[01]+$/.test(soll)) {
    return ist.replace(/^0+/, '') === soll.replace(/^0+/, '');
  }
  return ist === soll;
}
