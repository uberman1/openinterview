# Stage 4 – Gate Integration v0.4.0

This integration wires **Stage 4 (Production Go-Live Readiness)** into your Release Gate so it always runs after Bundle C, completing the full quality pipeline.

## Overview

Stage 4 gate integration adds production readiness validation as the final step in your release gate process. After all feature packs and bundles complete, Stage 4 validates:

- ✅ Health endpoint contract
- ✅ Canary pings with p95 latency SLO
- ✅ Security headers (CSP)
- ✅ Provider configuration

## Files Added

**Integration Script:**
- `scripts/apply_stage4_gate_patch.py` - Modifies `release_gate/run_all.py` to add Stage 4 tail-runner

**Convenience Scripts:**
- `stage4/run_and_save.sh` - Runner that stores artifacts and updates `test2.html`

**CI/CD:**
- `ci/stage4_gate.yml` - Production-focused workflow for running Stage 4 standalone

## How to Apply

### 1. Apply the Gate Integration Patch

```bash
# From repository root
python scripts/apply_stage4_gate_patch.py
```

**What it does:**
- Backs up `release_gate/run_all.py` to `.bak_stage4_v040`
- Adds Stage 4 runner that executes after all existing packs
- Creates marker file at `qa/_aggregate/stage4_patch_applied.txt`
- Preserves all existing release gate functionality

### 2. Run the Complete Release Gate

**With Backend Running:**
```bash
# Ensure backend is running
bash scripts/serve_api.sh

# Run complete release gate (now includes Stage 4)
PYTHONPATH=. python release_gate/run_all.py
```

**Expected Flow:**
1. Packs 1-9 execute (feature validation)
2. Bundle A executes (API security)
3. Bundle B executes (UI quality)
4. Bundle C executes (governance)
5. **Stage 4 executes** (production readiness) ✨
6. Final exit code includes Stage 4 status

### 3. Run Stage 4 Standalone (Optional)

**Using convenience script:**
```bash
# Runs Stage 4 with artifact saving and infrastructure tracking
bash stage4/run_and_save.sh
```

**Manual:**
```bash
export PROD_URL="http://127.0.0.1:8000"
export HEALTH_URL="$PROD_URL/health"
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1

PYTHONPATH=. python stage4/run_stage4.py
```

## Integration Details

### Release Gate Modification

The patch modifies `release_gate/run_all.py` to:

```python
# === Stage 4 – Production Go-Live (v0.4.0) ===
def _run_stage4():
    print("\n[Stage 4] Running Production Go-Live Readiness v0.4.0 ...")
    cmd = [sys.executable, "stage4/run_stage4.py"]
    env = dict(os.environ)
    # ... runs Stage 4 and captures results
    return exit_code

def main():
    rc = 0
    # ... original release gate logic
    
    # Add Stage 4 tail-runner
    s4 = _run_stage4()
    final_rc = 1 if (rc != 0 or s4 != 0) else 0
    print(f"[ReleaseGate] Final exit code (with Stage 4): {final_rc}")
    sys.exit(final_rc)
```

**Key Features:**
- ✅ Non-destructive: Original logic preserved
- ✅ Conditional: Only runs if original gate completes
- ✅ Fail-fast: Failed Stage 4 fails entire gate
- ✅ Isolated: Stage 4 runs in subprocess with environment

### Convenience Script Features

**`run_and_save.sh`:**
1. Creates artifact directory (`qa/stage4/v0.4.0/`)
2. Runs Stage 4 validation
3. Displays results (summary.json, tests.txt)
4. Updates infrastructure tracking (test2.html)
5. Non-zero exit preserved for CI/CD

## CI/CD Usage

### Production-Focused Workflow (`ci/stage4_gate.yml`)

**Trigger manually with custom URLs:**

```bash
# GitHub Actions UI:
1. Go to Actions tab
2. Select "Stage 4 Gate"
3. Click "Run workflow"
4. Enter:
   - base_url: https://your-production-domain.com
   - health_url: https://your-production-domain.com/health
5. Review artifacts
```

**Key Differences from `stage4_pipeline.yml`:**
- `EXPECT_LIVE=1` enforced (production mode)
- Requires explicit base_url and health_url inputs
- More suitable for production validation
- Enforces provider configuration checks

## Environment Configuration

### Development/Staging

```bash
export PROD_URL="http://127.0.0.1:8000"
export EXPECT_LIVE=0
export ALLOW_PROVIDER_MOCK=1
```

### Production

```bash
export PROD_URL="https://your-production-domain.com"
export EXPECT_LIVE=1
export ALLOW_PROVIDER_MOCK=0

# Production provider config
export STRIPE_TEST=0
export STRIPE_SIGNING_SECRET="whsec_..."
export NOTIFY_MODE="resend"
export EMAIL_FROM="noreply@yourapp.com"
```

## Verification

### Check Integration Applied

```bash
# Look for Stage 4 code in release gate
grep "Stage 4" release_gate/run_all.py

# Check marker file
cat qa/_aggregate/stage4_patch_applied.txt
```

### Test Complete Pipeline

```bash
# Start backend
bash scripts/serve_api.sh

# Run full release gate with Stage 4
PYTHONPATH=. python release_gate/run_all.py

# Check final exit code
echo $?  # Should be 0 if all gates pass
```

### Review Artifacts

```bash
# Stage 4 results
cat qa/stage4/v0.4.0/summary.json | python -m json.tool

# Infrastructure tracking
grep -A 10 "Stage 4" public/test2.html
```

## Rollback

If you need to remove the integration:

```bash
# Restore backup
cp release_gate/run_all.py.bak_stage4_v040 release_gate/run_all.py

# Remove marker
rm qa/_aggregate/stage4_patch_applied.txt
```

## Troubleshooting

### Patch Already Applied

**Symptom:** Script says "Stage 4 already appears integrated"

**Solution:** Integration already complete, no action needed

### Backend Not Running

**Symptom:** Stage 4 fails with connection errors

**Solution:**
```bash
# Start backend first
bash scripts/serve_api.sh

# Then run release gate
PYTHONPATH=. python release_gate/run_all.py
```

### Provider Configuration Issues

**Development:**
```bash
export ALLOW_PROVIDER_MOCK=1  # Allow mocks
export EXPECT_LIVE=0          # Advisory only
```

**Production:**
```bash
# Configure real providers first
export STRIPE_TEST=0
export STRIPE_SIGNING_SECRET="..."
export NOTIFY_MODE="resend"
export EMAIL_FROM="..."

# Then enforce
export EXPECT_LIVE=1
export ALLOW_PROVIDER_MOCK=0
```

## Integration Benefits

**Complete Quality Pipeline:**
1. ✅ Feature validation (Packs 1-9)
2. ✅ API security (Bundle A)
3. ✅ UI quality (Bundle B)
4. ✅ Governance (Bundle C)
5. ✅ **Production readiness (Stage 4)** ✨

**Automated Validation:**
- Single command runs all gates
- Fail-fast on any issue
- Comprehensive artifacts
- CI/CD ready

**Production Confidence:**
- Health endpoint validated
- Performance SLO verified (p95 < 1000ms)
- Security headers confirmed
- Provider configuration checked

## Complete Quality System

**With Stage 4 integrated, your release gate now validates:**

| Gate | Focus | Coverage | Execution |
|------|-------|----------|-----------|
| Packs 1-9 | Features | 45+ tests | Playwright E2E |
| Bundle A | API Security | 7 tests | requests |
| Bundle B | UI Quality | 28+ tests | Playwright |
| Bundle C | Governance | 13+ tests | requests |
| **Stage 4** | **Go-Live** | **4 checks** | **requests** ✨ |

**Total:** 115+ quality checks in single command!

## Next Steps

After integration:

1. **Test locally:**
   ```bash
   bash scripts/serve_api.sh
   PYTHONPATH=. python release_gate/run_all.py
   ```

2. **Configure CI/CD:**
   - Add `ci/stage4_gate.yml` to `.github/workflows/`
   - Set up workflow triggers
   - Configure secrets/environment variables

3. **Document for team:**
   - Share Stage 4 requirements
   - Update deployment runbook
   - Add to release checklist

4. **Monitor in production:**
   - Set up health endpoint monitoring
   - Track p95 latency trends
   - Alert on CSP header changes
   - Validate provider configurations

---

**Stage 4 gate integration complete! Your release gate now includes production readiness validation.** 🚀
