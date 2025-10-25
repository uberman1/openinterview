#!/usr/bin/env bash
set -euo pipefail

JS_DEST="js"
HTML_EDIT_A="profile_v4_1_package/public/profile_edit_enhanced.html"
HTML_EDIT_B="public/profile_edit_enhanced.html"
HTML_EDIT_C="profile_edit_enhanced.html"
HTML_PUBLIC_A="profile_v4_1_package/public/index.html"
HTML_PUBLIC_B="public/index.html"

mkdir -p "$JS_DEST"

cp -f "js/availability.model.js" "$JS_DEST/"
cp -f "js/slotgen.js" "$JS_DEST/"
cp -f "js/availability.editor.bind.js" "$JS_DEST/"
cp -f "js/public_profile.book.bind.js" "$JS_DEST/"

echo "✅ Copied JS files to $JS_DEST/"

inject_once () {
  local file="$1"
  local tag="$2"
  if [ ! -f "$file" ]; then return 1; fi
  if grep -qF "$tag" "$file"; then
    echo "ℹ️  Tag already present in $file"
    return 0
  fi
  if grep -q '</main>' "$file"; then
    sed -i.bak "0,/<\/main>/s//$tag\n\n<\/main>/" "$file"
    echo "✅ Injected into $file (before </main>)"
  else
    sed -i.bak "0,/<\/body>/s//$tag\n\n<\/body>/" "$file"
    echo "✅ Injected into $file (before </body>)"
  fi
  return 0
}

EDIT_TAGS=$'<script type="module" src="/js/availability.model.js"></script>\n<script type="module" src="/js/slotgen.js"></script>\n<script type="module" src="/js/availability.editor.bind.js"></script>'
PUBLIC_TAG=$'<script type="module" src="/js/public_profile.book.bind.js"></script>'

if ! inject_once "$HTML_EDIT_A" "$EDIT_TAGS"; then
  if ! inject_once "$HTML_EDIT_B" "$EDIT_TAGS"; then
    inject_once "$HTML_EDIT_C" "$EDIT_TAGS" || echo "⚠️  Could not find edit page to inject tags."
  fi
fi

if ! inject_once "$HTML_PUBLIC_A" "$PUBLIC_TAG"; then
  inject_once "$HTML_PUBLIC_B" "$PUBLIC_TAG" || echo "ℹ️  Could not find public index.html; skip public binder injection."
fi

echo "Done."
