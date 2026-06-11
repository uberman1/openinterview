#!/usr/bin/env bash
set -euo pipefail

# Paths
JS_DEST="js"
FIX_DEST="public/fixtures"
HTML_A="profile_v4_1_package/public/profile_edit_enhanced.html"
HTML_B="public/profile_edit_enhanced.html"
HTML_C="profile_edit_enhanced.html"
BINDER_TAG='<script type="module" src="/js/profile_edit.autopop.bind.js"></script>'

# Ensure destinations
mkdir -p "$JS_DEST"
mkdir -p "$FIX_DEST"

# Copy files
cp -f "js/profile_edit.autopop.bind.js" "$JS_DEST/"
cp -f "public/fixtures/resume_parse_fixture.json" "$FIX_DEST/"

echo "✅ Copied JS binder to $JS_DEST/"
echo "✅ Copied fixture to $FIX_DEST/"

# Function to inject script tag once
inject_tag () {
  local file="$1"
  if [ ! -f "$file" ]; then return 1; fi
  if grep -q 'profile_edit.autopop.bind.js' "$file"; then
    echo "ℹ️  Script tag already present in $file"
    return 0
  fi
  # Insert before existing closing </main>; fallback to before </body>
  if grep -q '</main>' "$file"; then
    sed -i.bak "0,/<\/main>/s//${BINDER_TAG}\n\n<\/main>/" "$file"
    echo "✅ Injected binder tag before </main> in $file"
  else
    sed -i.bak "0,/<\/body>/s//${BINDER_TAG}\n\n<\/body>/" "$file"
    echo "✅ Injected binder tag before </body> in $file"
  fi
  return 0
}

# Try common HTML locations
if inject_tag "$HTML_A"; then
  TARGET="$HTML_A"
elif inject_tag "$HTML_B"; then
  TARGET="$HTML_B"
elif inject_tag "$HTML_C"; then
  TARGET="$HTML_C"
else
  echo "⚠️  Could not find profile_edit_enhanced.html; please add the script tag manually:"
  echo "    $BINDER_TAG"
  TARGET="(not found)"
fi

echo "Done. Target HTML: $TARGET"
