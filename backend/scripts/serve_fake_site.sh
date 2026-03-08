#!/usr/bin/env bash
set -euo pipefail

echo "Fake MTN site available at http://localhost:8080"
echo "Use this URL in /verify to trigger automated forensic preservation."

cd "$(dirname "$0")/fake_phishing_site"

if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server 8080
elif command -v python >/dev/null 2>&1; then
  python -m http.server 8080
else
  echo "ERROR: python interpreter not found"
  exit 1
fi
