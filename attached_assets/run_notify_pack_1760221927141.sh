#!/usr/bin/env bash
set -euo pipefail
pip install -r notify_pack/requirements.txt
python -m playwright install chromium
PYTHONPATH=. python notify_pack/run.py
