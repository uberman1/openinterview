# Bundle B v0.2.0 – UI Quality Gate

This bundle adds a Playwright-based UI quality gate covering:
- Accessibility smoke checks (landmarks, ARIA, controls)
- Performance smoke checks (DOMContentLoaded, load time)
- Responsive layout checks (mobile & desktop, no horizontal overflow)
- Error-state smoke (simulated not-ready banner on Home)

## Run

1) Install deps:
```bash
pip install -r bundle_b/requirements.txt
python -m playwright install --with-deps chromium
```

2) Start your backend/static server (serving `public/` at http://127.0.0.1:8000):
```bash
bash scripts/serve_api.sh
```

3) Run tests and write artifacts:
```bash
PYTHONPATH=. python bundle_b/run_bundle_b_tests.py | tee qa/bundle_b/v0.2.0/tests.json
```

4) Update `test2.html`:
```bash
python scripts/update_test2_index_bundle_b.py
```

Artifacts saved under `qa/bundle_b/v0.2.0/`.
