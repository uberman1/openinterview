
# Stage 4 – Gate Integration v0.4.0

This patch wires Stage 4 (Production Go-Live Readiness) into your Release Gate so it always runs after Bundle C.

## Files
- `scripts/apply_stage4_gate_patch.py` — modifies `release_gate/run_all.py` to add Stage 4 tail-runner
- `bundle_a/run_and_save.sh` — convenience runner that stores artifacts and updates `test2.html` (optional)
- `ci/stage4_gate.yml` — workflow to run Stage 4 as a standalone job

## How to apply
```bash
# 1) (Repo root) Apply the patch
python scripts/apply_stage4_gate_patch.py

# 2) Start your backend and run the Release Gate as usual
PYTHONPATH=. python release_gate/run_all.py

# Or run Stage 4 standalone with artifacts:
bash bundle_a/run_and_save.sh
```
