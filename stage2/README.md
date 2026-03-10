# Stage 2 - Guardrails Quality Gate v0.2.0

## Overview

Stage 2 provides **byte-level verification** of protected files to prevent accidental modifications to critical UI components. Using SHA-256 hashing, it ensures that specific HTML, CSS, and JavaScript files remain unchanged unless explicitly updated.

## Protected Files (13 total)

### HTML Files (10)
- `public/home.html`
- `public/availability.html`
- `public/profiles.html`
- `public/profile_edit.html`
- `public/uploads.html`
- `public/subscription.html`
- `public/password.html`
- `public/public_profile.html`
- `public/booking_manage.html`
- `public/profile.html`

### CSS Files (1)
- `public/css/theme.css`

### JavaScript Files (2)
- `public/js/enhance_profile_edit.js`
- `public/js/availability.js`

## How It Works

### 1. Lock Baselines
Creates SHA-256 hashes of all protected files:

```bash
python stage2/lock_baselines.py
```

**Output:**
- Creates `stage2/baselines.json` with file hashes
- Verifies all protected files exist
- Stores file size and hash for each file

### 2. Verify Guardrails
Checks current files against locked baselines:

```bash
python stage2/verify_guardrails.py
```

**Verification checks:**
- ✅ File exists
- ✅ SHA-256 hash matches baseline
- ❌ Reports violations or missing files

### 3. Run Full Gate
Orchestrates the complete verification:

```bash
python stage2/run_stage2.py
```

**Process:**
1. Checks if baselines exist (creates if missing)
2. Verifies all protected files
3. Generates results in `qa/stage2/`
4. Exits with error if violations found

## Configuration

### guardrails.yml

```yaml
protected_files:
  - public/home.html
  - public/availability.html
  # ... more files

verification:
  algorithm: sha256
  strict_mode: true
  fail_on_missing: true
  fail_on_modified: true

baseline_file: stage2/baselines.json
```

## Usage

### Initial Setup

1. **Lock baselines:**
```bash
python stage2/lock_baselines.py
```

2. **Verify guardrails:**
```bash
python stage2/verify_guardrails.py
```

### Updating Protected Files

When you need to modify a protected file:

1. Make your changes to the protected file
2. Re-lock baselines:
```bash
python stage2/lock_baselines.py
```

This updates the baseline hashes with the new file versions.

### CI/CD Integration

Use the provided GitHub Actions workflow:

```yaml
# .github/workflows/stage2_quality_gate.yml
name: Stage 2 Quality Gate

on: [push, pull_request]

jobs:
  guardrails:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Verify Guardrails
        run: python stage2/verify_guardrails.py
```

Or use: `ci/snippets/stage2_quality_gate.yml`

## Output Files

### baselines.json
```json
{
  "public/home.html": {
    "sha256": "a1b2c3d4e5f6...",
    "size": 12345
  },
  "public/theme.css": {
    "sha256": "f6e5d4c3b2a1...",
    "size": 5678
  }
}
```

### verification_results.json
```json
{
  "status": "PASS",
  "total": 13,
  "passed": 13,
  "violations": 0,
  "missing": 0,
  "details": {
    "violations": [],
    "missing": []
  }
}
```

### gate_results.json
```json
{
  "stage2_guardrails": {
    "status": "PASS",
    "timestamp": "2025-10-12T03:30:00Z",
    "total_files": 13,
    "passed": 13,
    "violations": 0,
    "missing": 0
  }
}
```

## Example Workflow

### Scenario 1: Verification Passes
```bash
$ python stage2/verify_guardrails.py

🔍 Stage 2 - Verifying Guardrails

Verifying 13 protected files...

✅ VERIFIED: public/home.html
✅ VERIFIED: public/availability.html
✅ VERIFIED: public/profiles.html
# ... more files

============================================================
VERIFICATION SUMMARY
============================================================
✅ Passed:   13
❌ Modified: 0
❌ Missing:  0
============================================================

🎉 All guardrails verified successfully!
```

### Scenario 2: File Modified
```bash
$ python stage2/verify_guardrails.py

🔍 Stage 2 - Verifying Guardrails

Verifying 13 protected files...

✅ VERIFIED: public/home.html
❌ MODIFIED: public/availability.html
   Expected: a1b2c3d4e5f6...
   Actual:   f6e5d4c3b2a1...
✅ VERIFIED: public/profiles.html
# ... more files

============================================================
VERIFICATION SUMMARY
============================================================
✅ Passed:   12
❌ Modified: 1
❌ Missing:  0
============================================================

❌ GUARDRAILS VERIFICATION FAILED!

Protected files have been modified or are missing.
Restore the original files or update baselines with:
  python stage2/lock_baselines.py
```

## Infrastructure Tracking

### Update test2.html

```bash
python scripts/update_test2_index_stage2.py
```

Adds Stage 2 section to `public/test2.html`:

```html
<section id="quality-gate-stage2">
  <h3>Quality Gate – Stage 2 (Guardrails)</h3>
  <table>
    <tr>
      <td>v0.2.0</td>
      <td>Stage 2 Guardrails: Byte-level verification...</td>
      <td>2025-10-12T03:30:00Z</td>
    </tr>
  </table>
</section>
```

## Integration with Release Gate

### Adding to run_all.py

```python
# In release_gate/run_all.py
packs.append(('stage2', 'python stage2/run_stage2.py'))
```

This makes Stage 2 part of the complete release gate run.

## Troubleshooting

### Baselines Not Found
```
❌ Baseline file not found: stage2/baselines.json
```

**Solution:**
```bash
python stage2/lock_baselines.py
```

### File Modified
```
❌ MODIFIED: public/home.html
```

**Options:**
1. Restore original file from git: `git checkout public/home.html`
2. Update baseline: `python stage2/lock_baselines.py`

### File Missing
```
❌ MISSING: public/theme.css
```

**Solution:**
Restore the missing file or remove it from `guardrails.yml` if no longer needed.

## File Structure

```
stage2/
├── guardrails.yml           # Protected files config
├── lock_baselines.py        # Create file hashes
├── verify_guardrails.py     # Verify files
├── run_stage2.py            # Orchestrator
├── baselines.json           # Locked hashes (generated)
└── README.md                # This file

qa/stage2/
├── verification_results.json  # Detailed results
└── gate_results.json         # Release gate format

scripts/
└── update_test2_index_stage2.py  # Infrastructure tracking

ci/snippets/
└── stage2_quality_gate.yml   # GitHub Actions
```

## Best Practices

1. **Lock baselines after every protected file change**
   ```bash
   python stage2/lock_baselines.py
   ```

2. **Run verification before commits**
   ```bash
   python stage2/verify_guardrails.py
   ```

3. **Integrate into pre-commit hooks**
   ```bash
   # .git/hooks/pre-commit
   python stage2/verify_guardrails.py || exit 1
   ```

4. **Use in CI/CD pipelines**
   - Add to GitHub Actions
   - Fail builds on violations
   - Auto-comment PRs with results

## Security Considerations

- **SHA-256 hashing:** Cryptographically secure
- **Byte-level verification:** Detects any modification
- **Immutable baselines:** Stored in version control
- **Audit trail:** Results saved for compliance

## Next Steps

1. Lock baselines: `python stage2/lock_baselines.py`
2. Verify files: `python stage2/verify_guardrails.py`
3. Update infrastructure: `python scripts/update_test2_index_stage2.py`
4. Integrate into CI/CD: Use `ci/snippets/stage2_quality_gate.yml`

---

**Stage 2 provides enterprise-grade file protection for your critical UI components!** 🔒
