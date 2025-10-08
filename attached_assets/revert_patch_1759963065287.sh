#!/usr/bin/env bash
set -euo pipefail
# Restore the most recent backup for each known file
for bak in $(ls -1t .backups/*.bak 2>/dev/null | sort -r | head -n 20); do
  base="$(basename "$bak")"
  target="${base%%.*}" # strip after first dot
  # Try to locate target in common dirs
  for dir in public static templates; do
    if [[ -d "$dir" ]]; then
      if [[ -f "$dir/$target" ]]; then
        cp "$bak" "$dir/$target"
        echo "Restored $dir/$target from $bak"
        break
      fi
    fi
  done
done
echo "Rollback complete (best-effort). Review your .backups directory for specifics."
