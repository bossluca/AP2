#!/usr/bin/env sh
set -eu

BASE_URL="${1:-http://127.0.0.1:8080}"

check() {
  path="$1"
  label="$2"
  printf 'Prüfe %s ... ' "$label"
  curl --fail --silent --show-error --max-time 10 "${BASE_URL}${path}" >/dev/null
  printf 'OK\n'
}

check "/healthz" "Web-Container"
check "/api/health" "Backend über Reverse-Proxy"

printf 'Smoke-Test erfolgreich: %s\n' "$BASE_URL"
