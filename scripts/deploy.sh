#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PROJECT_DIR=$(dirname "$SCRIPT_DIR")
cd "$PROJECT_DIR"

command -v docker >/dev/null 2>&1 || {
  printf 'Fehler: Docker ist nicht installiert.\n' >&2
  exit 1
}
docker compose version >/dev/null 2>&1 || {
  printf 'Fehler: Docker Compose v2 ist nicht verfügbar.\n' >&2
  exit 1
}
command -v curl >/dev/null 2>&1 || {
  printf 'Fehler: curl ist nicht installiert.\n' >&2
  exit 1
}

if [ ! -f .env ]; then
  cp .env.example .env
  printf '.env wurde aus .env.example angelegt. Werte vor öffentlichem Betrieb prüfen.\n'
fi

set -a
. ./.env
set +a

printf 'Validiere Compose-Konfiguration ...\n'
docker compose config --quiet

printf 'Baue und starte FiSi.dev ...\n'
docker compose up -d --build --remove-orphans

printf 'Warte auf gesunde Container ...\n'
attempt=0
until [ "$attempt" -ge 30 ]; do
  backend_id=$(docker compose ps -q backend)
  web_id=$(docker compose ps -q web)
  backend_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$backend_id" 2>/dev/null || true)
  web_health=$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$web_id" 2>/dev/null || true)
  if [ "$backend_health" = "healthy" ] && [ "$web_health" = "healthy" ]; then
    break
  fi
  attempt=$((attempt + 1))
  sleep 2
done

docker compose ps

if [ "${backend_health:-}" != "healthy" ] || [ "${web_health:-}" != "healthy" ]; then
  printf 'Fehler: Container wurden nicht rechtzeitig gesund.\n' >&2
  docker compose logs --tail=100 backend web >&2
  exit 1
fi

BASE_URL="http://127.0.0.1:${WEB_PORT:-8080}"
"$SCRIPT_DIR/smoke-test.sh" "$BASE_URL"

printf 'Deployment erfolgreich. Bei externem Zugriff NPM auf Port %s zeigen lassen.\n' "${WEB_PORT:-8080}"
