# Stage 6 — Provider Sandbox & Shadow-Mode (v0.6.0)

**Purpose:** Safely integrate external providers in *sandbox* while keeping mock-first defaults. Adds optional **shadow mode** to invoke sandbox APIs *in parallel* (log-only) during UAT.

## What's Included
- `backend/addons/provider_flags.py`: Centralized feature flags and helpers.
- `backend/addons/stripe_live_ext.py`: Stripe sandbox adapter (checkout + webhook verify). (Lightweight shim – uses env flags)
- `backend/addons/notify_live_ext.py`: Email provider shim with sandbox mode (prints to outbox; stub wire-up point for real provider SDK).
- `stage6/run_stage6.py`: Orchestrates Stage 6 checks and writes results to `qa/stage6/v0.6.0/`.
- `stage6/tests_api/*.py`: Requests-based smoke tests for Stripe + Email in sandbox and shadow mode.
- `scripts/apply_stage6_gate_patch.py`: Adds Stage 6 to Release Gate (after Bundle C).
- `scripts/update_test2_index_stage6.py`: Updates `public/test2.html` with a Stage 6 row.
- `ci/snippets/stage6_gate.yml`: CI example step for Stage 6.
- `public/stage6_status.html`: Simple status page reflecting current feature flags (from localStorage).

## Environment Flags
- `STRIPE_MOCK=1` (default) – all Stripe calls mocked.
- `STRIPE_TEST=1` – enable Stripe *sandbox* semantics (no real charges).
- `NOTIFY_MODE=mock` (default) – file outbox.
- `NOTIFY_MODE=sandbox` – route through live adapter in sandbox mode (no external delivery by default; stubbed send).
- `FEATURE_SHADOW_CALLS=1` – *parallel* sandbox calls (results logged only, mock remains source of truth).
- `HOME_API=1 HEALTH_URL=http://127.0.0.1:8000/health` – gate on API health (optional).

> **Safety Defaults:** Mock-first. Shadow/sandbox require explicit env flags.

## Run Locally (Replit / Dev)
Terminal A (backend):
```bash
bash scripts/serve_api.sh
```
Terminal B (Stage 6 only):
```bash
export STRIPE_TEST=1
export NOTIFY_MODE=sandbox
export FEATURE_SHADOW_CALLS=1
PYTHONPATH=. python stage6/run_stage6.py
```
Artifacts:
- `qa/stage6/v0.6.0/tests.json`
- `qa/stage6/v0.6.0/tests.txt`

## Run via Release Gate
```bash
PYTHONPATH=. python release_gate/run_all.py
```
Stage 6 runs as the **final** pack after Stage 5.

## CI Example
See `ci/snippets/stage6_gate.yml`.

---
**Timestamp:** 2025-10-12T15:27:17Z
