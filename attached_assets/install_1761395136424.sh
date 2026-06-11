#!/usr/bin/env bash
set -euo pipefail

SRC="profile_edit_enhanced.html"
DEST_A="profile_v4_1_package/public/profile_edit_enhanced.html"
DEST_B="public/profile_edit_enhanced.html"
DEST_C="profile_edit_enhanced.html"

if [ -d "profile_v4_1_package/public" ]; then
  cp -f "$SRC" "$DEST_A"
  echo "✅ Installed to $DEST_A"
elif [ -d "public" ]; then
  cp -f "$SRC" "$DEST_B"
  echo "✅ Installed to $DEST_B"
else
  cp -f "$SRC" "$DEST_C"
  echo "⚠️  Target path not found; placed at repo root: $DEST_C"
fi

echo "Done."
