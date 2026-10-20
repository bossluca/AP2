#!/usr/bin/env sh
# Konsistentes Backup der FiSi.dev-Datenbank (Konten, Lernstände, Gruppen …).
#
#   ./scripts/backup.sh                 # Backup nach $BACKUP_DIR (Default /var/backups/fisidev)
#   BACKUP_DIR=/mnt/nas/fisidev ./scripts/backup.sh
#
# Ablauf: Online-Schnappschuss im laufenden Backend (VACUUM INTO, auch im
# WAL-Modus konsistent) → Integritätsprüfung → auf den Host kopieren → gzip →
# Rotation (14 Tages-, 12 Monats-Backups). Für Cron geeignet (Exit-Code ≠ 0
# bei Fehler, damit das Monitoring anschlägt).
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$(dirname "$SCRIPT_DIR")"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/fisidev}"
TAGE_BEHALTEN="${TAGE_BEHALTEN:-14}"
MONATE_BEHALTEN="${MONATE_BEHALTEN:-12}"

stempel=$(date +%Y-%m-%d_%H%M%S)
name="lernapp-${stempel}.sqlite"
im_container="/app/data/backups/${name}"

mkdir -p "$BACKUP_DIR/taeglich" "$BACKUP_DIR/monatlich"

printf 'Erzeuge Schnappschuss %s ...\n' "$name"
info=$(docker compose exec -T backend node src/backup.js "$im_container" </dev/null)
printf 'OK: %s\n' "$info"

docker compose cp "backend:${im_container}" "$BACKUP_DIR/taeglich/${name}"
docker compose exec -T backend rm -f "$im_container" </dev/null
gzip -9 "$BACKUP_DIR/taeglich/${name}"
chmod 600 "$BACKUP_DIR/taeglich/${name}.gz"

# Am Monatsersten zusätzlich ein Langzeit-Backup ablegen.
if [ "$(date +%d)" = "01" ]; then
  cp "$BACKUP_DIR/taeglich/${name}.gz" "$BACKUP_DIR/monatlich/"
fi

find "$BACKUP_DIR/taeglich" -name 'lernapp-*.sqlite.gz' -mtime +"$TAGE_BEHALTEN" -delete
find "$BACKUP_DIR/monatlich" -name 'lernapp-*.sqlite.gz' -mtime +$((MONATE_BEHALTEN * 31)) -delete

printf 'Backup fertig: %s\n' "$BACKUP_DIR/taeglich/${name}.gz"
