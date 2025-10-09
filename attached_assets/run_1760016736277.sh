#!/usr/bin/env bash
set -euo pipefail
REPO_PATH="."
echo "[run] Applying patch to: ${REPO_PATH}"
python3 scripts/patch_upcoming_contact.py --repo "${REPO_PATH}"
echo "[run] Running self-tests..."
python3 scripts/self_test.py --repo "${REPO_PATH}"
echo "[run] Done."
