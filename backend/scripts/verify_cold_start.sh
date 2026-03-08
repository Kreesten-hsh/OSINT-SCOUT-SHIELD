#!/usr/bin/env bash
set -euo pipefail

echo "BENIN CYBER SHIELD - cold start verification"

if command -v docker >/dev/null 2>&1; then
  DC=(docker compose)
elif command -v docker.exe >/dev/null 2>&1; then
  DC=(docker.exe compose)
else
  echo "ERROR: docker compose not found"
  exit 1
fi

echo "Restarting containers..."
"${DC[@]}" down
time "${DC[@]}" up -d

echo "Waiting for API..."
MAX=45
COUNT=0
until curl -sf http://localhost:8000/health >/dev/null; do
  sleep 2
  COUNT=$((COUNT + 1))
  if [ "$COUNT" -ge "$MAX" ]; then
    echo "ERROR: API unavailable after 90 seconds"
    exit 1
  fi
done
echo "OK: API available"

check() {
  local desc="$1"
  local url="$2"
  local expected="$3"
  local status
  status="$(curl -s -o /dev/null -w "%{http_code}" "$url")"
  if [ "$status" = "$expected" ]; then
    echo "OK: $desc -> $status"
  else
    echo "ERROR: $desc -> $status (expected $expected)"
    exit 1
  fi
}

check "Health check" "http://localhost:8000/health" 200
check "Heatmap public" "http://localhost:8000/api/v1/map/heatmap" 200
check "Threat intel without token" "http://localhost:8000/api/v1/threat-intel/dashboard" 401

echo
echo "All cold-start checks passed"
echo "BENIN CYBER SHIELD v3.0 demo ready"
