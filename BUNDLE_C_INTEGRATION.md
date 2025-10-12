# Bundle C v0.2.0 - Governance Extensions Integration

## Overview

Bundle C v0.2.0 introduces comprehensive **Governance Extensions** covering Organizations, Audit Logging, and Metrics. This completes the quality gate trilogy alongside Bundle A (API Security) and Bundle B (UI Quality), providing enterprise-grade features for multi-tenant applications.

## ✅ Features Deployed

### 1. Organization Management (`org_ext.py`)
**Multi-tenant organization system with RBAC:**

**Features:**
- Organization creation with automatic owner assignment
- Member invitation system
- Role-based access control (owner, admin, member)
- Member management (list, change roles)
- Header-based demo authentication (`X-Demo-User`)

**API Endpoints:**
- `POST /api/org` - Create organization
- `POST /api/org/invite` - Invite member (owner only)
- `POST /api/org/accept` - Accept invitation
- `GET /api/org/members` - List members
- `POST /api/org/role` - Change member role (owner only)

**RBAC Rules:**
- Only owners can invite members
- Only owners can change roles
- Members can view member list
- Non-members get 403 Forbidden

### 2. Audit Log (`audit_ext.py`)
**Blockchain-inspired audit trail with hash chaining:**

**Features:**
- Immutable audit log with cryptographic hash chain
- Genesis block initialization
- Automatic timestamping (milliseconds)
- PII redaction on export (email addresses)
- SHA-256 hash verification

**Data Structure:**
```json
{
  "ts": 1697123456789,
  "actor": "user@example.com",
  "action": "create_org",
  "resource": "org:123",
  "prev_hash": "abc123...",
  "hash": "def456...",
  "meta": {"name": "Acme Inc"}
}
```

**API Endpoints:**
- `GET /api/audit?limit=10` - Retrieve audit entries
- `POST /api/audit/export` - Export with PII redaction

**Redaction:**
- Automatically redacts email addresses in metadata
- Marks redacted fields as `[redacted]`

### 3. Metrics & Health (`metrics_ext.py`)
**Prometheus-compatible metrics and extended health checks:**

**Features:**
- Action counter with labels
- Prometheus exposition format
- Extended health endpoint with uptime
- In-memory metrics storage

**Metrics Tracked:**
- `app_actions_total{action="create_org"}`
- `app_actions_total{action="invite"}`
- `app_actions_total{action="accept_invite"}`
- `app_actions_total{action="role_change"}`

**API Endpoints:**
- `GET /metrics` - Prometheus metrics
- `GET /health/extended` - Extended health check

**Extended Health Response:**
```json
{
  "status": "ok",
  "uptime_ms": 123456,
  "db_ms": 5
}
```

## 📁 File Structure

```
backend/addons/
├── org_ext.py           # Organization management
├── audit_ext.py         # Audit log with hash chain
└── metrics_ext.py       # Prometheus metrics

bundle_c/
├── tests_api/
│   ├── __init__.py
│   ├── org_test.py      # Org RBAC tests
│   ├── audit_test.py    # Hash chain + redaction tests
│   └── metrics_test.py  # Metrics validation
├── run_bundle_c_tests.py  # Test orchestrator
├── requirements.txt       # requests==2.32.3
└── README.md

qa/bundle_c/v0.2.0/
├── tests.json           # JSON results
└── tests.txt            # Human-readable results

scripts/
├── apply_bundle_c_gate_patch.py  # Auto-patch backend
└── update_test2_index_bundle_c.py  # Infrastructure tracker

ci/snippets/
└── bundle_c_quality_gate.yml  # GitHub Actions

release_gate/
└── run_all.py           # UPDATED: Bundle C added as pack #12
```

## 🧪 Test Coverage

### Organization Tests (`org_test.py`)
**E2E workflow validation:**

1. **Create Organization**
   - Owner creates "Acme Inc"
   - Verifies org ID assigned

2. **Invite Member**
   - Owner invites member@example.com
   - Verifies invitation created

3. **Accept Invitation**
   - Member accepts invitation
   - Verifies membership

4. **List Members**
   - Member retrieves member list
   - Verifies member@example.com present

5. **RBAC Validation**
   - Member attempts role change (expects 403)
   - Owner changes member role (expects 200)

### Audit Tests (`audit_test.py`)
**Hash chain integrity:**

1. **Retrieve Audit Log**
   - Fetches audit entries
   - Verifies items exist

2. **Chain Integrity**
   - Validates each entry's `prev_hash` matches previous entry's `hash`
   - Ensures no tampering

3. **Export with Redaction**
   - Exports audit log
   - Verifies email addresses redacted
   - Validates `[redacted]` markers

### Metrics Tests (`metrics_test.py`)
**Prometheus validation:**

1. **Extended Health**
   - Calls `/health/extended`
   - Verifies `status: ok`
   - Checks uptime_ms present

2. **Metrics Endpoint**
   - Calls `/metrics`
   - Validates action counters present
   - Verifies Prometheus format

## 🚀 Running Tests

### Prerequisites

```bash
# Install dependencies
pip install -r bundle_c/requirements.txt
```

### Method 1: Standalone Execution

**Start backend:**
```bash
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

**Run tests:**
```bash
PYTHONPATH=. python bundle_c/run_bundle_c_tests.py
```

**Output artifacts:**
- `qa/bundle_c/v0.2.0/tests.json` - Full JSON results
- `qa/bundle_c/v0.2.0/tests.txt` - Human-readable results

### Method 2: Via Release Gate

```bash
# Ensure backend is running on port 8000, then:
PYTHONPATH=. python release_gate/run_all.py
```

Bundle C runs automatically as pack #12.

### Method 3: Infrastructure Tracking

```bash
python scripts/update_test2_index_bundle_c.py
```

Adds Bundle C to `public/test2.html` "Quality Gate – Governance" section.

## 📊 Expected Output

### Success Case
```json
{
  "bundle_c_v0_2_0": {
    "bundle_c.tests_api.org_test": {
      "status": "PASS",
      "org_id": 1
    },
    "bundle_c.tests_api.audit_test": {
      "status": "PASS",
      "count": 7
    },
    "bundle_c.tests_api.metrics_test": {
      "status": "PASS"
    }
  },
  "status": "PASS",
  "timestamp": "2025-10-12T02:30:00Z",
  "base_url": "http://127.0.0.1:8000"
}
```

### Failure Examples

**Organization RBAC failure:**
```json
{
  "bundle_c.tests_api.org_test": {
    "status": "FAIL",
    "step": "rbac_block_expected_403",
    "got": 200
  }
}
```

**Audit chain integrity failure:**
```json
{
  "bundle_c.tests_api.audit_test": {
    "status": "FAIL",
    "step": "chain_integrity"
  }
}
```

**Metrics missing:**
```json
{
  "bundle_c.tests_api.metrics_test": {
    "status": "FAIL",
    "step": "metrics_missing",
    "missing": ["action=\"create_org\""]
  }
}
```

## 🔧 Configuration

### Environment Variables

- `OI_BASE_URL` - Base URL for tests (default: `http://127.0.0.1:8000`)

### Demo Authentication

Use `X-Demo-User` header for testing:

```bash
# As owner
curl -H "X-Demo-User: owner@example.com" \
  -X POST http://localhost:8000/api/org \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org"}'

# As member
curl -H "X-Demo-User: member@example.com" \
  -X GET "http://localhost:8000/api/org/members?org_id=1"
```

## 🎯 Integration Points

### Cross-Bundle Dependencies

**Organization → Audit:**
```python
from .audit_ext import append_audit

append_audit(actor, "create_org", f"org:{org.id}", {"name": body.name})
```

**Organization → Metrics:**
```python
from .metrics_ext import inc

inc("app_actions_total", '{action="create_org"} 1')
```

### Audit Events Tracked

| Action | Resource | Metadata |
|--------|----------|----------|
| `create_org` | `org:{id}` | `{name}` |
| `invite_sent` | `org:{id}` | `{email, role}` |
| `invite_accepted` | `org:{id}` | `{role}` |
| `role_changed` | `org:{id}` | `{email, role}` |

## 📈 Prometheus Metrics

### Scraping Configuration

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'openinterview'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

### Example Metrics Output

```
app_actions_total{action="accept_invite"} 1
app_actions_total{action="create_org"} 1
app_actions_total{action="invite"} 1
app_actions_total{action="role_change"} 1
```

### Grafana Dashboard

**Panel 1: Action Rate**
```promql
rate(app_actions_total[5m])
```

**Panel 2: Action by Type**
```promql
sum by (action) (app_actions_total)
```

## 🔐 Security Considerations

### RBAC Implementation

- **Owner-only operations:** Invites, role changes
- **Member operations:** View members
- **Public operations:** Accept invitation (with valid invite)

### Audit Log Integrity

- **Hash chaining:** Each entry references previous hash
- **Immutability:** Append-only log
- **Tamper detection:** Chain verification on export

### PII Protection

- **Redaction strategy:** Email addresses automatically redacted
- **Export safety:** Always use `/api/audit/export` for sharing
- **Retention:** Implement log rotation in production

## 🎯 CI/CD Integration

### GitHub Actions

```yaml
- name: Install Bundle C deps
  run: pip install -r bundle_c/requirements.txt

- name: Start Backend
  run: |
    cd backend
    uvicorn main:app --host 0.0.0.0 --port 8000 &
    sleep 5

- name: Run Bundle C Tests
  run: PYTHONPATH=. python bundle_c/run_bundle_c_tests.py

- name: Upload Results
  uses: actions/upload-artifact@v4
  with:
    name: bundle-c-results
    path: qa/bundle_c/v0.2.0/
```

Or use: `ci/snippets/bundle_c_quality_gate.yml`

## 🔄 Integration with Bundles A & B

| Bundle | Focus | Tool | Tests | Coverage |
|--------|-------|------|-------|----------|
| **A** | API Security | requests | 7 | CSRF, Stripe, Email |
| **B** | UI Quality | Playwright | 28+ | A11y, Perf, Responsive |
| **C** | Governance | requests | 13+ | Org, Audit, Metrics |

**Combined:** 48+ tests across security, UX, and governance!

## 🐛 Troubleshooting

### Backend Not Starting

```bash
# Check if port 8000 is in use
lsof -i :8000

# Kill existing process
kill -9 $(lsof -t -i:8000)

# Restart
cd backend && uvicorn main:app --host 0.0.0.0 --port 8000
```

### Import Errors

```bash
# Ensure PYTHONPATH is set
export PYTHONPATH=.

# Or run with prefix
PYTHONPATH=. python bundle_c/run_bundle_c_tests.py
```

### Test Failures

**Org test fails on RBAC:**
- Verify owner role assignment
- Check `X-Demo-User` header handling

**Audit chain fails:**
- Check if previous tests ran (chain needs entries)
- Run org_test first to populate audit log

**Metrics missing:**
- Ensure org operations executed
- Check metrics endpoint returns data

## ✅ Verification Checklist

- [x] Organization CRUD operations
- [x] RBAC enforcement (owner vs member)
- [x] Audit log hash chain
- [x] PII redaction on export
- [x] Prometheus metrics
- [x] Extended health endpoint
- [x] Release gate integration
- [x] Infrastructure tracking
- [x] CI/CD snippet
- [x] Documentation complete

## 🚀 Next Steps

1. **Run Tests:** Execute Bundle C against your backend
2. **Review Results:** Check `qa/bundle_c/v0.2.0/tests.json`
3. **Production Setup:**
   - Replace demo auth with real authentication
   - Add audit log rotation
   - Configure Prometheus scraping
   - Set up Grafana dashboards
4. **Extend:**
   - Add more organization features (billing, settings)
   - Enhance audit events (IP logging, user agent)
   - Add custom metrics

**Bundle C v0.2.0 provides enterprise-grade governance for multi-tenant applications!** 🏢
