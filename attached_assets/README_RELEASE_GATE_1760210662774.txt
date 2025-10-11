OPENINTERVIEW — Release Gate v0.1.0

Purpose
- Turn the existing QA test harness into a **release gate** for staging.
- This bundle runs all packs in order, aggregates results, and **fails** if any pack fails.
- Optional API-mode health check is supported via environment flags.

What this does
1) Runs the packs in dependency-safe order:
   - password_pack/run.py
   - subscription_pack/run.py
   - availability_pack/run.py
   - shareable_profile_pack/run.py
   - profiles_pack/run.py
   - uploads_pack/run.py
   - home_pack/run.py (final readiness)
2) Aggregates the results into qa/_aggregate/<timestamp>/summary.json and tests.txt
3) Returns a non-zero exit code on any failure — suitable for CI/CD.
4) Leaves all pack artifacts intact (e.g., /qa/<pack>/<version>/**) and updates test2.html via each pack’s own runner.

Environment
- HOME_API=1 (optional) to enable backend health gating
- HEALTH_URL=<absolute url> (optional) health endpoint when HOME_API=1
- OI_BASE_URL=<base_url> used by pack runners if applicable (defaults to http://127.0.0.1:8000)

Quick start (Replit or local)
  unzip release_gate_v0.1.0.zip -d .
  pip install -r release_gate/requirements.txt
  # optional API-mode
  export HOME_API=1
  export HEALTH_URL="https://<staging-domain>/health"
  # run
  PYTHONPATH=. python release_gate/run_all.py

Outputs
- qa/_aggregate/2025-10-11T19:18:57.289821Z/summary.json
- qa/_aggregate/2025-10-11T19:18:57.289821Z/tests.txt

CI/CD examples
- See ci/release_gate_example.yml for a GitHub Actions example.
- In any CI: run 'python release_gate/run_all.py' and fail on non-zero exit code.

Guardrails
- No app files are modified. Only /qa artifacts and public/test2.html rows (inserted by pack runners).
