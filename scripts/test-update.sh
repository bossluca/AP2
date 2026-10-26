#!/usr/bin/env sh
# Tests für scripts/update.sh mit echten Git-Repos in einem Temp-Verzeichnis.
# Backup/Deploy werden durch Stubs ersetzt (UPDATE_BACKUP_CMD/UPDATE_DEPLOY_CMD).
#   ./scripts/test-update.sh
set -u
HIER=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
WURZEL=$(mktemp -d)
trap 'rm -rf "$WURZEL"' EXIT
ok=0; fail=0
pruefe() { # Beschreibung, erwartet, tatsächlich
  if [ "$2" = "$3" ]; then ok=$((ok + 1)); printf '  OK      %s\n' "$1"
  else fail=$((fail + 1)); printf '  FEHLER  %s (erwartet %s, bekam %s)\n' "$1" "$2" "$3"; fi
}
git_ci() { git -c user.email=t@t -c user.name=t "$@"; }

# Ursprung mit einem Commit, "Server"-Klon darin enthält scripts/update.sh.
neues_szenario() {
  rm -rf "$WURZEL/ursprung" "$WURZEL/arbeit" "$WURZEL/server" "$WURZEL/stub"
  mkdir -p "$WURZEL/stub"
  git init -q --bare -b main "$WURZEL/ursprung"
  git clone -q "$WURZEL/ursprung" "$WURZEL/arbeit" 2>/dev/null
  mkdir -p "$WURZEL/arbeit/scripts"
  cp "$HIER/update.sh" "$WURZEL/arbeit/scripts/update.sh"
  echo v1 > "$WURZEL/arbeit/stand.txt"
  (cd "$WURZEL/arbeit" && git add -A && git_ci commit -q -m v1 && git push -q origin HEAD:main 2>/dev/null)
  git clone -q -b main "$WURZEL/ursprung" "$WURZEL/server" 2>/dev/null
  printf '#!/bin/sh\necho backup >> "%s/stub/ablauf"\nexit "${BACKUP_RC:-0}"\n' "$WURZEL" > "$WURZEL/stub/backup.sh"
  # Deploy-Stub scheitert nur, wenn stand.txt "kaputt" enthält.
  printf '#!/bin/sh\necho "deploy $(cat stand.txt)" >> "%s/stub/ablauf"\n[ "$(cat stand.txt)" != kaputt ]\n' "$WURZEL" > "$WURZEL/stub/deploy.sh"
  chmod +x "$WURZEL/stub/"*.sh
  : > "$WURZEL/stub/ablauf"
}
neuer_commit() { # Inhalt
  (cd "$WURZEL/arbeit" && echo "$1" > stand.txt && git add -A && git_ci commit -q -m "stand $1" && git push -q origin HEAD:main 2>/dev/null)
}
update() { # Zusatz-Env über "env" davor
  (cd "$WURZEL/server" && UPDATE_BACKUP_CMD="$WURZEL/stub/backup.sh" UPDATE_DEPLOY_CMD="$WURZEL/stub/deploy.sh" "$@" sh scripts/update.sh $ARGS >"$WURZEL/aus" 2>&1)
}
ARGS=""

echo "Szenario: bereits aktuell"
neues_szenario; update env; pruefe "Exit 0" 0 $?
pruefe "kein Backup/Deploy" "" "$(cat "$WURZEL/stub/ablauf")"

echo "Szenario: Update erfolgreich"
neues_szenario; neuer_commit v2; update env; pruefe "Exit 0" 0 $?
pruefe "Reihenfolge Backup → Deploy" "backup deploy v2" "$(tr '\n' ' ' < "$WURZEL/stub/ablauf" | sed 's/ $//')"
pruefe "Server steht auf v2" v2 "$(cat "$WURZEL/server/stand.txt")"

echo "Szenario: Deploy scheitert → Rückweg"
neues_szenario; neuer_commit kaputt; update env; pruefe "Exit 1" 1 $?
pruefe "Server wieder auf v1" v1 "$(cat "$WURZEL/server/stand.txt")"
pruefe "Rückweg deployt v1" "backup deploy kaputt deploy v1" "$(tr '\n' ' ' < "$WURZEL/stub/ablauf" | sed 's/ $//')"

echo "Szenario: Backup scheitert → nichts geändert"
neues_szenario; neuer_commit v2; update env BACKUP_RC=1; pruefe "Exit 4" 4 $?
pruefe "Server bleibt auf v1" v1 "$(cat "$WURZEL/server/stand.txt")"
pruefe "kein Deploy" "backup" "$(cat "$WURZEL/stub/ablauf")"

echo "Szenario: lokale Änderungen"
neues_szenario; neuer_commit v2; echo lokal >> "$WURZEL/server/stand.txt"; update env; pruefe "Exit 4" 4 $?
pruefe "nichts deployt" "" "$(cat "$WURZEL/stub/ablauf")"

echo "Szenario: Sperrfenster"
neues_szenario; neuer_commit v2; update env UPDATE_SPERRFENSTER=21:45-22:45 UPDATE_JETZT=22:10; pruefe "Exit 3 im Fenster" 3 $?
pruefe "nichts deployt" "" "$(cat "$WURZEL/stub/ablauf")"
update env UPDATE_SPERRFENSTER=21:45-22:45 UPDATE_JETZT=21:44; pruefe "Exit 0 knapp davor" 0 $?
neues_szenario; neuer_commit v2; update env UPDATE_SPERRFENSTER=23:00-05:00 UPDATE_JETZT=02:30; pruefe "Fenster über Mitternacht" 3 $?
neues_szenario; neuer_commit v2; update env UPDATE_SPERRFENSTER=21:45-22:45 UPDATE_JETZT=08:05; pruefe "08:05 (keine Oktal-Falle)" 0 $?

echo "Szenario: nur prüfen"
neues_szenario; neuer_commit v2; ARGS="--pruefen"; update env; pruefe "Exit 3" 3 $?
pruefe "nichts geändert" "v1" "$(cat "$WURZEL/server/stand.txt")"; ARGS=""

echo "Szenario: Historie umgeschrieben (kein Fast-Forward)"
neues_szenario; (cd "$WURZEL/server" && echo lokal > extra && git add -A && git_ci commit -q -m lokal); neuer_commit v2; update env; pruefe "Exit 4" 4 $?

printf '\n%s OK, %s Fehler\n' "$ok" "$fail"
[ "$fail" -eq 0 ]
