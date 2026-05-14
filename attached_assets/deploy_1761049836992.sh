#!/usr/bin/env bash
set -euo pipefail

echo "==> Creating target directories (public/js)…"
mkdir -p public/js

echo "==> Copying files…"
cp -f public/profile_edit_enhanced.html public/
cp -f public/js/profile_edit.bind.js public/js/

echo "==> Done."
echo "Open /public/profile_edit_enhanced.html?id=<profileId> to verify."
