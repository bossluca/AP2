/**
 * Stabiler AP2-Themenkatalog (Single Source of Truth): bündelt die historisch
 * uneinheitlichen Tags/Kategorien der Inhalte über Suchmuster zu 16 Prüfungs-
 * themen. Genutzt von Einstufungstest/Lernplan (`lib/einstufung`), dem
 * Themen-Modus in „Lernen" und der Abdeckungsanalyse
 * (`scripts/analyse-ap2-themenmatrix.mjs`). Rein, ohne React/Storage.
 *
 * `gewicht` (1–3) = eingeschätzte Prüfungsrelevanz in der AP2 FISI
 * (3 = Kernthema mit vielen Punkten). Steuert die Priorität im Lernplan.
 */

/** @typedef {{id:string, titel:string, muster:string[], gewicht:number}} Thema */

/** @type {Thema[]} */
export const AP2_THEMEN = [
  { id: 'subnetting', titel: 'IPv4, IPv6 & Subnetting', muster: ['subnet', 'ipv4', 'ipv6', 'ip-adress'], gewicht: 3 },
  { id: 'dns-dhcp', titel: 'DNS, DHCP & Verzeichnisdienste', muster: ['dns', 'dhcp', 'active directory', 'verzeichnisdienst'], gewicht: 2 },
  { id: 'routing', titel: 'Routing, NAT, VLAN & Segmentierung', muster: ['routing', 'router', 'nat', 'pat', 'vlan', 'segment'], gewicht: 3 },
  { id: 'wlan', titel: 'WLAN & Funkplanung', muster: ['wlan', 'wi-fi', 'wifi', 'funk', 'ausleuchtung'], gewicht: 2 },
  { id: 'vpn', titel: 'VPN & sicherer Fernzugriff', muster: ['vpn', 'ipsec', 'wireguard', 'fernzugriff'], gewicht: 2 },
  { id: 'sicherheit', titel: 'Firewall, Zero Trust & IT-Sicherheit', muster: ['firewall', 'zero trust', 'dmz', 'nac', 'ransomware', 'pki', 'tls'], gewicht: 3 },
  { id: 'identitaeten', titel: 'Identitäten, Kerberos & SSO', muster: ['kerberos', 'single sign-on', 'sso', 'active directory', 'ldap', 'domäne'], gewicht: 2 },
  { id: 'monitoring', titel: 'Monitoring, SNMP & Logging', muster: ['monitoring', 'snmp', 'syslog', 'logging', 'protokollier'], gewicht: 2 },
  { id: 'backup', titel: 'Backup, RAID & Storage', muster: ['backup', 'datensicherung', 'raid', 'storage', 'nas', 'san', 'gfs'], gewicht: 3 },
  { id: 'virtualisierung', titel: 'Virtualisierung, Container & Cloud', muster: ['virtualisierung', 'virtuell', 'container', 'docker', 'cloud'], gewicht: 3 },
  { id: 'datenbanken', titel: 'Datenbanken & SQL', muster: ['datenbank', 'sql', 'join', 'normalform', 'er-modell'], gewicht: 2 },
  { id: 'linux', titel: 'Linux, Skripte & Automatisierung', muster: ['linux', 'berechtigung', 'pseudocode', 'skript', 'automatis'], gewicht: 2 },
  { id: 'projekt', titel: 'Projekt- & IT-Service-Management', muster: ['projektmanagement', 'itil', 'service-management', 'incident'], gewicht: 2 },
  { id: 'hardware', titel: 'Hardware, USV & Energie', muster: ['hardware', 'usv', 'strom', 'energie', 'speicher-berechnung'], gewicht: 2 },
  { id: 'wirtschaft', titel: 'Wirtschaftlichkeit & Beschaffung', muster: ['wirtschaft', 'kosten', 'tco', 'nutzwert', 'lizenz'], gewicht: 2 },
  { id: 'hochverfuegbarkeit', titel: 'Hochverfügbarkeit & Lastverteilung', muster: ['hochverfüg', 'verfügbarkeit', 'load balanc', 'cluster', 'failover'], gewicht: 2 },
];

/** Thema per ID (oder undefined). */
export function themaPerId(id) {
  return AP2_THEMEN.find((t) => t.id === id);
}

/** Kleinbuchstaben ohne Diakritika – Umlaute/Akzente spielen beim Abgleich keine Rolle. */
export function normThema(wert) {
  return String(wert || '')
    .toLocaleLowerCase('de-DE')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Trifft ein (bereits normalisierter) Text eines der Suchmuster des Themas? */
export function passtThema(normText, thema) {
  return thema.muster.some((m) => normText.includes(normThema(m)));
}

/** Kopfdaten (ohne Fließtext) einer Lerneinheit – präziser Themen-Abgleich. */
function kopfEinheit(e) {
  return normThema([e.titel, e.kategorie, ...(e.thema_tags || [])].join(' '));
}

/**
 * Lerneinheiten eines Themas. Erst über Titel/Kategorie/Tags (präzise); sind
 * das weniger als `mindestens`, wird der Inhalt mit durchsucht (breiter).
 * @param {{titel?:string, kategorie?:string, thema_tags?:string[], inhalt_text?:string}[]} einheiten
 * @param {string} themaId
 * @param {{mindestens?:number}} [opt]
 */
export function einheitenImThema(einheiten, themaId, { mindestens = 3 } = {}) {
  const thema = themaPerId(themaId);
  if (!thema) return [];
  const liste = einheiten || [];
  const praezise = liste.filter((e) => passtThema(kopfEinheit(e), thema));
  if (praezise.length >= mindestens) return praezise;
  return liste.filter((e) => passtThema(normThema(`${kopfEinheit(e)} ${e.inhalt_text || ''}`), thema));
}

/**
 * Lernobjekte (Fragen + Lernzettel, s. `data/lernobjekte`) eines Themas –
 * Abgleich über Titel, Kategorie, Tags und Vorderseite.
 * @param {{titel?:string, kategorie?:string, tags?:string[], front?:string}[]} objekte
 * @param {string} themaId
 */
export function objekteImThema(objekte, themaId) {
  const thema = themaPerId(themaId);
  if (!thema) return [];
  return (objekte || []).filter((o) =>
    passtThema(normThema([o.titel, o.kategorie, ...(o.tags || []), o.front].join(' ')), thema)
  );
}
