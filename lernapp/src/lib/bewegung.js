/**
 * Bewegungs-Bausteine nach den Apple-Prinzipien „fluid interfaces“: Federn statt
 * fester Dauer, Geschwindigkeit wird beim Loslassen übernommen, der Zielpunkt
 * folgt aus dem Schwung, Ränder geben elastisch nach. Alles rein und testbar
 * (Zeit/Frames werden injiziert); nur `animiereFeder` berührt `requestAnimationFrame`.
 */

/**
 * Wo kommt eine Bewegung mit dieser Geschwindigkeit zur Ruhe? (Exponentieller
 * Auslauf wie beim Scrollen, Formel aus Apples „Designing Fluid Interfaces“.)
 * @param {number} geschwindigkeit  px/s (positiv = nach unten/rechts)
 * @param {number} [rate]           Verzögerungsrate, 0.998 = normales Scrollgefühl
 * @returns {number} zusätzliche Strecke in px
 */
export function projiziere(geschwindigkeit, rate = 0.998) {
  if (!Number.isFinite(geschwindigkeit)) return 0;
  return ((geschwindigkeit / 1000) * rate) / (1 - rate);
}

/**
 * Elastischer Rand: Je weiter man über die Grenze zieht, desto weniger folgt
 * das Element (progressiver Widerstand statt hartem Anschlag).
 * @param {number} ueberhang  Strecke über der Grenze in px (>= 0)
 * @param {number} dimension  Größe des Elements/Bereichs in px
 * @param {number} [konstante]
 */
export function gummiband(ueberhang, dimension, konstante = 0.55) {
  const o = Math.abs(ueberhang);
  if (o === 0 || dimension <= 0) return 0;
  const wert = (o * dimension * konstante) / (dimension + konstante * o);
  return Math.sign(ueberhang) * wert;
}

/**
 * Ein Integrationsschritt einer gedämpften Feder (semi-implizites Euler, in
 * Unterschritten stabil). Parametrisiert wie bei Apple: Dämpfungsverhältnis
 * (1 = kritisch gedämpft, kein Überschwingen; < 1 = federt nach) und
 * Antwortzeit in Sekunden (kleiner = schneller).
 * @param {{x:number, v:number}} zustand  Position und Geschwindigkeit (px, px/s)
 * @param {number} ziel
 * @param {{daempfung?:number, antwort?:number}} [opt]
 * @param {number} dt  Sekunden seit dem letzten Schritt
 * @returns {{x:number, v:number}}
 */
export function federSchritt(zustand, ziel, { daempfung = 1, antwort = 0.35 } = {}, dt) {
  // Kreisfrequenz aus der Antwortzeit: omega = 2π / antwort
  const omega = (2 * Math.PI) / Math.max(antwort, 0.05);
  const steifheit = omega * omega;
  const daempfen = 2 * daempfung * omega;
  let { x, v } = zustand;
  const schritte = Math.max(1, Math.ceil(dt / 0.004));
  const h = dt / schritte;
  for (let i = 0; i < schritte; i += 1) {
    const a = steifheit * (ziel - x) - daempfen * v;
    v += a * h;
    x += v * h;
  }
  return { x, v };
}

/** Ist die Feder praktisch zur Ruhe gekommen? */
export function federRuht(zustand, ziel, schwelle = 0.3) {
  return Math.abs(zustand.x - ziel) < schwelle && Math.abs(zustand.v) < schwelle * 4;
}

/**
 * Entscheidet beim Loslassen eines gezogenen Fensters, ob es schließt: Der
 * Schwung bestimmt den Zielpunkt (nicht die Loslass-Position), und die
 * Richtung der Geschwindigkeit zählt mit.
 * @param {{position:number, geschwindigkeit:number, hoehe:number}} p
 * @returns {boolean}
 */
export function sollSchliessen({ position, geschwindigkeit, hoehe }) {
  if (!(hoehe > 0)) return false;
  const ziel = position + projiziere(geschwindigkeit);
  if (geschwindigkeit < -300) return false; // klar nach oben geworfen → bleibt offen
  return ziel > hoehe * 0.5;
}

/**
 * Geschwindigkeit (px/s) aus den letzten Zeigerpunkten (jüngste ~100 ms).
 * @param {{y:number, t:number}[]} verlauf  Zeitstempel in ms
 */
export function geschwindigkeitAusVerlauf(verlauf) {
  if (!Array.isArray(verlauf) || verlauf.length < 2) return 0;
  const letzter = verlauf[verlauf.length - 1];
  let start = verlauf[0];
  for (const p of verlauf) {
    if (letzter.t - p.t <= 100) {
      start = p;
      break;
    }
  }
  const dt = (letzter.t - start.t) / 1000;
  return dt > 0 ? (letzter.y - start.y) / dt : 0;
}

/**
 * Lässt einen Wert per Feder zum Ziel laufen und übernimmt dabei die
 * Anfangsgeschwindigkeit (Übergabe ohne Sprung zwischen Ziehen und Animieren).
 * Gibt eine Abbruchfunktion zurück (Interrupt: der Aufrufer startet die nächste
 * Feder vom aktuellen Wert aus).
 * @param {object} p
 * @param {number} p.von
 * @param {number} p.nach
 * @param {number} [p.geschwindigkeit]
 * @param {number} [p.daempfung]
 * @param {number} [p.antwort]
 * @param {(x:number)=>void} p.beiFrame
 * @param {()=>void} [p.beiEnde]
 */
export function animiereFeder({ von, nach, geschwindigkeit = 0, daempfung = 1, antwort = 0.35, beiFrame, beiEnde }) {
  let zustand = { x: von, v: geschwindigkeit };
  let letzte = null;
  let id = 0;
  let aktiv = true;
  const schritt = (zeit) => {
    if (!aktiv) return;
    const dt = letzte === null ? 1 / 60 : Math.min((zeit - letzte) / 1000, 0.05);
    letzte = zeit;
    zustand = federSchritt(zustand, nach, { daempfung, antwort }, dt);
    if (federRuht(zustand, nach)) {
      beiFrame(nach);
      aktiv = false;
      if (beiEnde) beiEnde();
      return;
    }
    beiFrame(zustand.x);
    id = requestAnimationFrame(schritt);
  };
  id = requestAnimationFrame(schritt);
  return () => {
    aktiv = false;
    cancelAnimationFrame(id);
  };
}

/** Wünscht die Person reduzierte Bewegung? (Ohne matchMedia → nein.) */
export function reduzierteBewegung() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}
