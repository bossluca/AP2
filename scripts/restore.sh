#!/usr/bin/env sh
# Stellt die FiSi.dev-Datenbank aus einem Backup wieder her.
#
#   ./scripts/restore.sh /var/backups/fisidev/taeglich/lernapp-2026-10-20_030000.sqlite.gz
#
# Sicherheitsnetz: Vor dem Überschreiben wird der aktuelle Stand gesichert
# (./scripts/backup.sh → BACKUP_DIR/taeglich). Das Backup wird vor dem Einspielen
# auf Integrität geprüft. Während des Restores ist nur das Backend kurz gestoppt.
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$(dirname "$SCRIPT_DIR")"
if [ -f .env ]; then set -a; . ./.env; set +a; fi

quelle="${1:-}"
[ -n "$quelle" ] && [ -f "$quelle" ] || {
  printf 'Aufruf: %s <backup.sqlite[.gz]>\n' "$0" >&2
  exit 1
}

tmp=$(mktemp -d)
chmod 755 "$tmp"  # Container läuft als node-User und muss lesen dürfen
trap 'rm -rf "$tmp"' EXIT
case "$quelle" in
  *.gz) gunzip -c "$quelle" > "$tmp/restore.sqlite" ;;
  *) cp "$quelle" "$tmp/restore.sqlite" ;;
esac
chmod 644 "$tmp/restore.sqlite"

printf 'Prüfe Backup-Datei ...\n'
docker compose run --rm --no-deps -T -v "$tmp:/restore:ro" --entrypoint node backend \
  src/backup.js --pruefe /restore/restore.sqlite </dev/null

printf 'ACHTUNG: Die aktuelle Datenbank wird durch %s ersetzt.\n' "$quelle"
printf 'Fortfahren? [ja/NEIN] '
read -r antwort
[ "$antwort" = "ja" ] || { printf 'Abgebrochen.\n'; exit 1; }

printf 'Sichere aktuellen Stand vorher ...\n'
"$SCRIPT_DIR/backup.sh" </dev/null || printf 'Warnung: Sicherung des aktuellen Stands fehlgeschlagen (Backend down?).\n' >&2

docker compose stop backend
# Datei ins Volume kopieren; alte WAL-/SHM-Dateien entfernen, damit SQLite
# nicht versucht, sie auf die eingespielte Datei anzuwenden.
docker compose run --rm --no-deps -T -v "$tmp:/restore:ro" --entrypoint sh backend -c \
  'rm -f /app/data/lernapp.sqlite-wal /app/data/lernapp.sqlite-shm && cp /restore/restore.sqlite /app/data/lernapp.sqlite' </dev/null
docker compose start backend

printf 'Warte auf gesundes Backend ...\n'
i=0
until [ "$i" -ge 30 ]; do
  status=$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q backend)" 2>/dev/null || true)
  [ "$status" = "healthy" ] && break
  i=$((i + 1))
  sleep 2
done
[ "${status:-}" = "healthy" ] || { printf 'Fehler: Backend nicht gesund.\n' >&2; exit 1; }

"$SCRIPT_DIR/smoke-test.sh" "http://127.0.0.1:${WEB_PORT:-8080}"
printf 'Restore abgeschlossen.\n'
