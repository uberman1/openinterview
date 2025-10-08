#!/usr/bin/env bash
set -euo pipefail
TS="$(date +%Y%m%d-%H%M%S)"
mkdir -p .backups
# Candidate locations for the HTML file
CANDIDATES=(
  "public/public_profile.html"
  "public/profile_public.html"
  "static/public_profile.html"
  "static/profile_public.html"
  "templates/public_profile.html"
  "templates/profile_public.html"
)

found=0
for f in "${CANDIDATES[@]}"; do
  if [[ -f "$f" ]]; then
    cp "$f" ".backups/$(basename "$f").$TS.bak"
    echo "Backed up $f -> .backups/$(basename "$f").$TS.bak"
    found=1
  fi
done

if [[ "$found" -eq 0 ]]; then
  echo "No candidate profile HTML found. You may need to add paths in patch/backup.sh and patch/apply_patch.sh."
  exit 1
fi
