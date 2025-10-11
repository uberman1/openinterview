# Release Gate v0.1.0

## Purpose

Turn the existing QA test harness into a **release gate** for staging and production deployments.

This orchestrator runs all test packs in dependency-safe order, aggregates results, and **fails the build** if any pack fails. It's designed for CI/CD pipelines to enforce quality gates before deployment.

## What It Does

1. **Runs all packs in order:**
   - Password Reset Pack
   - Subscription Pack
   - Availability Pack
   - Shareable Profile Pack
   - Profiles Pack
   - Uploads Pack
   - Home Pack (final readiness check)

2. **Aggregates results** into `qa/_aggregate/<timestamp>/`:
   - `summary.json` - Machine-readable full report
   - `tests.txt` - Human-readable summary

3. **Enforces quality gate:**
   - Returns exit code 0 if all packs pass
   - Returns exit code 1 if any pack fails (blocks deployment)

4. **Preserves artifacts:**
   - All pack artifacts remain in `qa/<pack>/<version>/`
   - Updates `public/test2.html` via each pack's runner

## Environment Variables

### Optional API-Mode
- `HOME_API=1` - Enable backend health checking (default: 0)
- `HEALTH_URL=<url>` - Health endpoint URL when API mode enabled
- `OI_BASE_URL=<url>` - Base URL for pack runners (default: http://127.0.0.1:5000)

### Examples
```bash
# UI-only mode (default)
PYTHONPATH=. python release_gate/run_all.py

# API-mode with health endpoint
export HOME_API=1
export HEALTH_URL="https://staging.example.com/health"
PYTHONPATH=. python release_gate/run_all.py

# Custom base URL
export OI_BASE_URL="https://preview.replit.app"
PYTHONPATH=. python release_gate/run_all.py
```

## Installation

### Prerequisites
```bash
pip install -r release_gate/requirements.txt
python -m playwright install --with-deps chromium
```

### Quick Start
```bash
# Clone or unzip release gate files
unzip release_gate_v0.1.0.zip -d .

# Install dependencies
pip install -r release_gate/requirements.txt

# (Optional) Configure API-mode
export HOME_API=1
export HEALTH_URL="https://staging.example.com/health"

# Run release gate
PYTHONPATH=. python release_gate/run_all.py
```

## Output Structure

### Aggregate Directory
```
qa/_aggregate/
└── 2025-10-11T19-18-57.289821Z/
    ├── summary.json    # Full results with pack details
    └── tests.txt       # Human-readable summary
```

### Summary JSON Schema
```json
{
  "release_gate": "v0.1.0",
  "started": "2025-10-11T19:18:57.289821Z",
  "ended": "2025-10-11T19:22:15.891234Z",
  "env": {
    "HOME_API": "1",
    "HEALTH_URL": "https://staging.example.com/health",
    "OI_BASE_URL": "http://127.0.0.1:5000"
  },
  "pack_results": {
    "password": {"version": "v0.1.0", "json": {...}},
    "subscription": {"version": "v0.1.0", "json": {...}},
    ...
  },
  "pack_status": {
    "password": "PASS",
    "subscription": "PASS",
    ...
  },
  "subprocess_failures": [],
  "status": "PASS"
}
```

## CI/CD Integration

### GitHub Actions Example
See `ci/release_gate_example.yml` for a complete workflow:

```yaml
- name: Run release gate
  env:
    HOME_API: ${{ secrets.HOME_API }}
    HEALTH_URL: ${{ secrets.HEALTH_URL }}
    OI_BASE_URL: ${{ secrets.OI_BASE_URL }}
  run: |
    PYTHONPATH=. python release_gate/run_all.py
```

### Other CI Systems

**GitLab CI:**
```yaml
release-gate:
  script:
    - pip install -r release_gate/requirements.txt
    - python -m playwright install --with-deps chromium
    - PYTHONPATH=. python release_gate/run_all.py
```

**Jenkins:**
```groovy
stage('Release Gate') {
  steps {
    sh 'pip install -r release_gate/requirements.txt'
    sh 'python -m playwright install --with-deps chromium'
    sh 'PYTHONPATH=. python release_gate/run_all.py'
  }
}
```

**CircleCI:**
```yaml
- run:
    name: Release Gate
    command: |
      pip install -r release_gate/requirements.txt
      python -m playwright install --with-deps chromium
      PYTHONPATH=. python release_gate/run_all.py
```

## Pack Execution Order

The packs run in this specific order to handle dependencies:

1. **Password Reset** - Security foundation
2. **Subscription** - Payment/plan system
3. **Availability** - Calendar/scheduling
4. **Shareable Profile** - Profile visibility
5. **Profiles** - Profile management
6. **Uploads** - File handling
7. **Home** - Readiness aggregation (depends on all above)

## Failure Handling

### Exit Codes
- `0` - All packs passed (release allowed)
- `1` - One or more packs failed (release blocked)

### Failure Scenarios
1. **Subprocess failure** - Pack runner crashes or returns non-zero
2. **Status check failure** - Pack status is not "PASS"
3. **Missing artifacts** - Required test files not found

### Debugging Failures
Check the aggregate summary for details:
```bash
# Find latest aggregate
ls -lt qa/_aggregate/ | head -5

# View summary
cat qa/_aggregate/<timestamp>/summary.json | jq
```

Each pack's detailed results remain in:
```
qa/<pack>/<version>/tests.txt
qa/<pack>/<version>/tests.json
```

## Guardrails

**What Changes:**
- Creates `qa/_aggregate/<timestamp>/` directory
- Each pack updates its own `qa/<pack>/<version>/` artifacts
- Each pack adds rows to `public/test2.html`

**What's Protected:**
- No application source files modified
- No database changes
- No configuration changes
- Read-only on all app code

## Version History

### v0.1.0 (2025-10-11)
- Initial release
- Orchestrates 7 test packs in dependency order
- Aggregates results with PASS/FAIL determination
- CI/CD integration with exit code enforcement
- Optional API-mode health checking
- Preserves all pack artifacts and test index

## Troubleshooting

### Chromium Installation Issues
```bash
# Manually install Chromium
python -m playwright install --with-deps chromium

# Verify installation
python -c "from playwright.sync_api import sync_playwright; pw = sync_playwright().start(); print('OK')"
```

### Import Errors
```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=.
python release_gate/run_all.py
```

### Port Conflicts
```bash
# Change default base URL
export OI_BASE_URL="http://127.0.0.1:3000"
PYTHONPATH=. python release_gate/run_all.py
```

## Maintainer Notes

- Keep pack execution order synchronized with dependency graph
- Update `PACKS` list in `run_all.py` when adding new test packs
- Aggregate logic in `aggregate.py` auto-detects latest versions
- All packs must follow the standard output format (tests.json with `status` field)
