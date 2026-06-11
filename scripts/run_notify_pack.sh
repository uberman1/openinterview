#!/usr/bin/env bash
set -euo pipefail
pip install -q -r notify_pack/requirements.txt
python -m playwright install chromium >/dev/null 2>&1 || true
PYTHONPATH=. python notify_pack/run.py
