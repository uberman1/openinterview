#!/usr/bin/env bash
set -euo pipefail

if [ "${1-}" = "" ]; then
  echo "Usage: bash deploy.sh /absolute/path/to/profile.html"
  exit 1
fi

HTML_PATH="$1"
if [ ! -f "$HTML_PATH" ]; then
  echo "File not found: $HTML_PATH"
  exit 1
fi

echo "Backing up to ${HTML_PATH}.bak"
cp "$HTML_PATH" "${HTML_PATH}.bak"

echo "Applying OI-UI-Scroll-Hero-v1 patch..."
python3 scripts/apply_update.py "$HTML_PATH"

echo "Done. Please review changes. Backup at: ${HTML_PATH}.bak"
