#!/usr/bin/env sh
# Externer Sicherheits-Check einer laufenden FiSi.dev-Instanz (Black-Box, nur lesend).
#
#   ./scripts/security-check.sh https://lernen.example.de
#   ./scripts/security-check.sh https://lernen.example.de --direkt 10.10.20.50:8090
#   ./scripts/security-check.sh https://lernen.example.de --last     # + Rate-Limit-Probe
#
# Legt keine Konten an und ändert nichts. Die Registrierungs-Probe läuft nur,
# wenn die Instanz NICHT offen ist (dann lehnt der Server vor dem Anlegen ab).
# `--direkt HOST:PORT` prüft, dass der App-Port am Proxy vorbei NICHT erreichbar
# ist. `--last` schickt ~40 Fehl-Logins für eine nicht existierende Adresse
# (bremst danach 15 min nur diese Adresse von deiner IP).
#
# Exit-Code: 0 = alles OK/Hinweise, 1 = mindestens ein FEHLER. Für Cron/Kuma geeignet.
set -u

URL="${1:-}"
[ -n "$URL" ] || { printf 'Aufruf: %s https://<domain> [--direkt HOST:PORT] [--last]\n' "$0" >&2; exit 2; }
URL="${URL%/}"
shift
DIREKT=""
LAST=0
while [ $# -gt 0 ]; do
  case "$1" in
    --direkt) DIREKT="${2:-}"; shift 2 ;;
    --last) LAST=1; shift ;;
    *) printf 'Unbekannte Option: %s\n' "$1" >&2; exit 2 ;;
  esac
done

HOST=$(printf '%s' "$URL" | sed -E 's#^https?://([^/:]+).*#\1#')
fehler=0
hinweise=0
ok()   { printf '  OK      %s\n' "$1"; }
warn() { printf '  HINWEIS %s\n' "$1"; hinweise=$((hinweise + 1)); }
fail() { printf '  FEHLER  %s\n' "$1"; fehler=$((fehler + 1)); }
# HTTP-Status oder 000 (curl schreibt bei Verbindungsfehler selbst 000 und endet ≠ 0).
code() { r=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" 2>/dev/null); printf '%s' "${r:-000}"; }

printf 'Security-Check %s  (%s)\n\n' "$URL" "$(date '+%Y-%m-%d %H:%M')"

# --- Transport ---------------------------------------------------------------
printf 'Transport\n'
c=$(code "http://${HOST}/")
case "$c" in 301|302|307|308) ok "HTTP leitet auf HTTPS um ($c)" ;; *) fail "HTTP ohne Umleitung auf HTTPS ($c)" ;; esac

kopf=$(curl -sI --max-time 10 "$URL/" 2>/dev/null | tr -d '\r')
status=$(printf '%s\n' "$kopf" | head -1)
case "$status" in *" 200"*) ok "HTTPS erreichbar ($status)" ;; *) fail "HTTPS nicht erreichbar: ${status:-keine Antwort}"; printf '\nAbbruch.\n'; exit 1 ;; esac

if command -v openssl >/dev/null 2>&1; then
  ende=$(printf '' | openssl s_client -connect "${HOST}:443" -servername "$HOST" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$ende" ]; then
    rest=$(( ( $(date -d "$ende" +%s) - $(date +%s) ) / 86400 ))
    if [ "$rest" -ge 14 ]; then ok "Zertifikat gültig, noch $rest Tage"; else fail "Zertifikat läuft in $rest Tagen ab"; fi
  else
    fail "Zertifikat nicht lesbar"
  fi
  for alt in tls1 tls1_1; do
    if printf '' | openssl s_client -connect "${HOST}:443" -servername "$HOST" "-$alt" 2>/dev/null | grep -q 'Cipher is [A-Z]'; then
      fail "Veraltetes Protokoll $alt wird akzeptiert"
    else
      ok "Veraltetes Protokoll $alt abgelehnt"
    fi
  done
else
  warn "openssl fehlt – Zertifikat/TLS-Versionen nicht geprüft"
fi

# --- Security-Header ---------------------------------------------------------
printf '\nSecurity-Header\n'
hdr() { printf '%s\n' "$kopf" | grep -i "^$1:" | head -1 | cut -d: -f2- | sed 's/^ *//'; }
hsts=$(hdr strict-transport-security)
alter=$(printf '%s' "$hsts" | sed -nE 's/.*max-age=([0-9]+).*/\1/p')
if [ -n "$alter" ] && [ "$alter" -ge 15552000 ]; then ok "HSTS ($hsts)"; else fail "HSTS fehlt oder max-age < 180 Tage (${hsts:-fehlt})"; fi
csp=$(hdr content-security-policy)
case "$csp" in
  *"default-src 'self'"*"object-src 'none'"*"frame-ancestors"*) ok "CSP gesetzt (default-src 'self', object-src 'none', frame-ancestors)" ;;
  "") fail "CSP fehlt" ;;
  *) warn "CSP unvollständig: $csp" ;;
esac
skript=$(printf '%s' "$csp" | sed -nE 's/.*script-src([^;]*).*/\1/p')
case "$skript" in *unsafe-inline*|*unsafe-eval*) fail "CSP erlaubt unsafe-inline/eval für Skripte" ;; esac
[ -n "$(hdr x-frame-options)" ] && ok "X-Frame-Options: $(hdr x-frame-options)" || fail "X-Frame-Options fehlt"
[ "$(hdr x-content-type-options)" = "nosniff" ] && ok "X-Content-Type-Options: nosniff" || fail "X-Content-Type-Options fehlt"
[ -n "$(hdr referrer-policy)" ] && ok "Referrer-Policy: $(hdr referrer-policy)" || warn "Referrer-Policy fehlt"
[ -n "$(hdr permissions-policy)" ] && ok "Permissions-Policy gesetzt" || warn "Permissions-Policy fehlt"
server=$(hdr server)
case "$server" in *[0-9]*) warn "Server-Header verrät Version: $server" ;; *) ok "Server-Header ohne Version (${server:-keiner})" ;; esac
[ -z "$(hdr x-powered-by)" ] && ok "kein X-Powered-By" || warn "X-Powered-By: $(hdr x-powered-by)"

# --- App / API ---------------------------------------------------------------
printf '\nApp & API\n'
health=$(curl -s --max-time 10 "$URL/api/health" 2>/dev/null)
[ "$health" = '{"status":"ok"}' ] && ok "API-Health ok" || fail "API-Health: ${health:-keine Antwort}"

modus=$(curl -s --max-time 10 "$URL/api/auth/config" 2>/dev/null | sed -nE 's/.*"registrierung":"([a-z]+)".*/\1/p')
case "$modus" in
  invite|closed)
    ok "Registrierung: $modus"
    c=$(code -X POST -H 'content-type: application/json' \
      -d '{"email":"security-check@example.invalid","password":"probe-1234567"}' "$URL/api/auth/register")
    [ "$c" = "403" ] && ok "Registrierung ohne Code abgelehnt (403)" || fail "Registrierung ohne Code: $c (erwartet 403)"
    ;;
  open) warn "Registrierung ist OFFEN – jeder kann Konten anlegen (REGISTRATION=invite empfohlen)" ;;
  *) fail "Registrierungsmodus nicht lesbar" ;;
esac

c=$(code "$URL/api/admin/uebersicht")
[ "$c" = "401" ] && ok "Admin-API ohne Login gesperrt (401)" || fail "Admin-API ohne Login: $c"
c=$(code "$URL/api/auth/me")
[ "$c" = "401" ] && ok "/api/auth/me ohne Login 401" || fail "/api/auth/me ohne Login: $c"

cors=$(curl -sI --max-time 10 -H 'Origin: https://angreifer.example' "$URL/api/health" 2>/dev/null | tr -d '\r' | grep -i '^access-control-allow-origin:')
[ -z "$cors" ] && ok "kein CORS für fremde Origins" || fail "CORS offen: $cors"

# Häufig gesuchte Geheimnis-Pfade dürfen nichts preisgeben (SPA-Fallback auf index.html ist ok).
for pfad in /.env /.git/config /server/.env /data/lernapp.sqlite /docker-compose.yml /api/../.env; do
  koerper=$(curl -s --max-time 10 "$URL$pfad" 2>/dev/null | head -c 2000)
  case "$koerper" in
    *"[core]"*|*"SQLite format"*|*"ADMIN_EMAILS"*|*"WEB_PORT"*|*"services:"*) fail "$pfad liefert Inhalte aus" ;;
    *) ok "$pfad gibt nichts preis" ;;
  esac
done

# --- Optional ----------------------------------------------------------------
if [ -n "$DIREKT" ]; then
  printf '\nDirektzugriff am Proxy vorbei\n'
  r=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "http://$DIREKT/api/health" 2>/dev/null); c="${r:-000}"
  [ "$c" = "000" ] && ok "http://$DIREKT nicht erreichbar" || fail "http://$DIREKT erreichbar ($c) – Port nur für den Proxy öffnen"
fi

if [ "$LAST" -eq 1 ]; then
  printf '\nRate-Limit (Login)\n'
  n429=0
  i=0
  while [ $i -lt 40 ]; do
    c=$(code -X POST -H 'content-type: application/json' \
      -d '{"email":"ratelimit-probe@example.invalid","password":"falsch-123456"}' "$URL/api/auth/login")
    [ "$c" = "429" ] && n429=$((n429 + 1))
    i=$((i + 1))
  done
  [ "$n429" -gt 0 ] && ok "Login-Bremse greift ($n429 von 40 mit 429)" || fail "keine 429 nach 40 Fehl-Logins"
fi

printf '\nErgebnis: %s Fehler, %s Hinweise\n' "$fehler" "$hinweise"
[ "$fehler" -eq 0 ]
