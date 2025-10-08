#!/usr/bin/env bash
set -euo pipefail

# Candidate html files
CANDIDATES=(
  "public/public_profile.html"
  "public/profile_public.html"
  "static/public_profile.html"
  "static/profile_public.html"
  "templates/public_profile.html"
  "templates/profile_public.html"
)

inject_tag='<script defer src="/static/js/public_profile.safe.js"></script>'

comment_conflicts() {
  # Comment out conflicting binders if present
  # Note: best-effort; safe to run multiple times.
  sed -i.bak \
    -e 's#\(<script[^>]*src=.*public_profile\.scroll\.bind\.js[^>]*>\)#<!-- \1 -->#g' \
    -e 's#\(<script[^>]*src=.*public_profile\.hero-shrink\.bind\.js[^>]*>\)#<!-- \1 -->#g' \
    "$1"
}

ensure_injection() {
  local file="$1"
  if grep -q 'public_profile.safe.js' "$file"; then
    echo "Safe binder already injected in $file"
  else
    # place before closing body if possible
    if grep -q '</body>' "$file"; then
      sed -i.bak "s#</body>#$inject_tag\n</body>#g" "$file"
      echo "Injected safe binder before </body> in $file"
    else
      # append
      echo "$inject_tag" >> "$file"
      echo "Appended safe binder to end of $file"
    fi
  fi
}

updated=0
for f in "${CANDIDATES[@]}"; do
  if [[ -f "$f" ]]; then
    echo "Patching $f"
    comment_conflicts "$f"
    ensure_injection "$f"
    updated=1
  fi
done

if [[ "$updated" -eq 0 ]]; then
  echo "No candidate profile HTML found to patch. Update CANDIDATES list with your actual path(s)."
  exit 1
fi

# Ensure JS is placed at /static/js/public_profile.safe.js relative to server root expectation
mkdir -p static/js
cp -f static/js/public_profile.safe.js static/js/public_profile.safe.js 2>/dev/null || true
echo "Verify your static hosting path maps /static to your static directory."
