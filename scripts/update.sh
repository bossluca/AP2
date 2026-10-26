#!/usr/bin/env sh
# Sicheres Update der FiSi.dev-Instanz: prüfen → Backup → ff-only-Pull → Deploy →
# Prüfung, bei Fehler automatischer Rückweg auf den vorherigen Stand.
#
#   ./scripts/update.sh --pruefen     # nur melden, ob ein Update vorliegt (ändert nichts)
#   ./scripts/update.sh               # Update einspielen
#
# Umgebungsvariablen (alle optional, z. B. in /etc/default/fisidev-update oder per Cron):
#   BRANCH                  Quell-Branch (Default main)
#   BACKUP_DIR              Ablage der Backups (Default /var/backups/fisidev)
#   SECURITY_CHECK_URL      z. B. https://lernen.example.de – nach dem Deploy läuft damit
#                           scripts/security-check.sh (Ergebnis wird gemeldet, löst KEINEN
#                           Rückweg aus, weil z. B. TLS/Proxy nicht zur App gehören)
#   SECURITY_CHECK_ARGS     Zusatzargumente, z. B. "--direkt 10.10.20.50:8090"
#   UPDATE_SPERRFENSTER     "HH:MM-HH:MM", in dem NICHT aktualisiert wird (z. B. 21:45-22:45)
#   UPDATE_BACKUP_CMD / UPDATE_DEPLOY_CMD / UPDATE_JETZT   überschreiben Skripte bzw. die Uhrzeit (Tests)
#
# Exit-Codes: 0 = aktuell oder erfolgreich aktualisiert, 1 = Fehler (nach Rückweg),
#             2 = Update eingespielt, aber Sicherheits-Check meldet Fehler,
#             3 = übersprungen (Sperrfenster, Sperre, Update nur gemeldet),
#             4 = Abbruch vor jeder Änderung (z. B. lokale Änderungen im Repo).
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_DIR"

BRANCH="${BRANCH:-main}"
export BACKUP_DIR="${BACKUP_DIR:-/var/backups/fisidev}"
BACKUP_CMD="${UPDATE_BACKUP_CMD:-$SCRIPT_DIR/backup.sh}"
DEPLOY_CMD="${UPDATE_DEPLOY_CMD:-$SCRIPT_DIR/deploy.sh}"
NUR_PRUEFEN=0
[ "${1:-}" = "--pruefen" ] && NUR_PRUEFEN=1

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$1"; }

# --- Sperrfenster ------------------------------------------------------------
# "HH:MM" → Minuten seit Mitternacht (führende Null abschneiden: 08 wäre sonst Oktal).
minuten() {
  std="${1%:*}"
  min="${1#*:}"
  std="${std#0}"
  min="${min#0}"
  echo $(( ${std:-0} * 60 + ${min:-0} ))
}
in_sperrfenster() {
  fenster="${UPDATE_SPERRFENSTER:-}"
  [ -n "$fenster" ] || return 1
  von=$(minuten "${fenster%-*}")
  bis=$(minuten "${fenster#*-}")
  jetzt=$(minuten "${UPDATE_JETZT:-$(date '+%H:%M')}")
  if [ "$von" -le "$bis" ]; then
    [ "$jetzt" -ge "$von" ] && [ "$jetzt" -lt "$bis" ]
  else
    # Fenster über Mitternacht (z. B. 23:00-05:00)
    [ "$jetzt" -ge "$von" ] || [ "$jetzt" -lt "$bis" ]
  fi
}

# --- Sperre gegen parallele Läufe ---------------------------------------------
LOCK_DIR="$PROJECT_DIR/.update.lock"
if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Anderes Update läuft (Sperre $LOCK_DIR). Übersprungen."
  exit 3
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

# --- Vorprüfungen (ändern nichts) ----------------------------------------------
command -v git >/dev/null 2>&1 || { log "Fehler: git fehlt."; exit 4; }
if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
  log "Abbruch: Lokale Änderungen im Repo (git status). Nichts verändert."
  exit 4
fi
aktuell_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$aktuell_branch" != "$BRANCH" ]; then
  log "Abbruch: Repo steht auf '$aktuell_branch', erwartet '$BRANCH'."
  exit 4
fi

log "Hole $BRANCH ..."
git fetch --quiet origin "$BRANCH" || { log "Fehler: git fetch fehlgeschlagen."; exit 4; }
alt=$(git rev-parse HEAD)
neu=$(git rev-parse "origin/$BRANCH")
if [ "$alt" = "$neu" ]; then
  log "Bereits aktuell ($(git rev-parse --short HEAD))."
  exit 0
fi
if ! git merge-base --is-ancestor "$alt" "$neu"; then
  log "Abbruch: origin/$BRANCH enthält den lokalen Stand nicht (kein Fast-Forward). Nichts verändert."
  exit 4
fi

log "Update verfügbar: $(git rev-parse --short "$alt") → $(git rev-parse --short "$neu")"
git log --oneline "$alt..$neu" | head -20 | while IFS= read -r zeile; do log "  $zeile"; done

if [ "$NUR_PRUEFEN" -eq 1 ]; then
  log "Nur geprüft (--pruefen), nichts geändert."
  exit 3
fi
if in_sperrfenster; then
  log "Sperrfenster ($UPDATE_SPERRFENSTER) – Update übersprungen."
  exit 3
fi

# --- Update --------------------------------------------------------------------
log "Backup ..."
if ! "$BACKUP_CMD"; then
  log "Abbruch: Backup fehlgeschlagen. Nichts verändert."
  exit 4
fi

rueckweg() {
  log "Rückweg auf $(git rev-parse --short "$alt") ..."
  git reset --hard "$alt" >/dev/null
  if "$DEPLOY_CMD"; then
    log "Rückweg erfolgreich, alter Stand läuft wieder."
  else
    log "KRITISCH: Rückweg-Deploy fehlgeschlagen. Manuell prüfen (docker compose ps/logs)."
  fi
}

log "Pull (ff-only) ..."
git merge --ff-only "origin/$BRANCH" >/dev/null
log "Deploy ..."
if ! "$DEPLOY_CMD"; then
  log "Deploy fehlgeschlagen."
  rueckweg
  exit 1
fi
log "Deploy erfolgreich: $(git log -1 --format='%h %s')"

# --- Sicherheits-Check (nur melden) --------------------------------------------
if [ -n "${SECURITY_CHECK_URL:-}" ]; then
  log "Sicherheits-Check ..."
  # shellcheck disable=SC2086
  if ! "$SCRIPT_DIR/security-check.sh" "$SECURITY_CHECK_URL" ${SECURITY_CHECK_ARGS:-}; then
    log "WARNUNG: Sicherheits-Check meldet Fehler. Update bleibt aktiv – bitte prüfen (Ausgabe oben)."
    exit 2
  fi
fi

log "Update abgeschlossen."
exit 0
