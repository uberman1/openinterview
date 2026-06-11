#!/usr/bin/env bash
set -euo pipefail
REPO_PATH="${1:-.}"
echo "[run] Deploying binder into repo: ${REPO_PATH}"
python3 scripts/deploy_binder.py --repo "${REPO_PATH}"
echo "[run] Done."
