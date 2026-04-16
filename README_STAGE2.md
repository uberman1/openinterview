# Stage 2 - Lock Quality Gates (v0.2.0)

## Quick Start

Stage 2 provides **byte-level protection** for 13 critical UI files using SHA-256 hash verification.

### 🚀 Usage

**Lock baselines:**
```bash
python stage2/lock_baselines.py
```

**Verify files:**
```bash
python stage2/verify_guardrails.py
```

**Run full gate:**
```bash
python stage2/run_stage2.py
```

### 📁 File Locations

**Scripts:** `stage2/` directory
- `lock_baselines.py` - Create file hashes
- `verify_guardrails.py` - Verify files
- `run_stage2.py` - Full orchestrator
- `guardrails.yml` - Protected files config

**Infrastructure:** `scripts/`
- `update_test2_index_stage2.py` - Add to test2.html

**CI/CD:** `ci/snippets/`
- `stage2_quality_gate.yml` - GitHub Actions

**Documentation:** `stage2/README.md` (comprehensive guide)

### 🔒 Protected Files (13)

**HTML (10):** home, availability, profiles, profile_edit, uploads, subscription, password, public_profile, booking_manage, profile

**CSS (1):** theme.css

**JS (2):** enhance_profile_edit.js, availability.js

### ✅ Status

- **Locked:** 13 files
- **Verified:** 13 files  
- **Status:** PASS
- **Infrastructure:** Updated in test2.html

See `stage2/README.md` for detailed instructions.
