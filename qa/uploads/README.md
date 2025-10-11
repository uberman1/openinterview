# Uploads Test Pack

**Version:** v0.1.0  
**Pack ID:** uploads  
**Page:** `/uploads_test.html`  
**Test Runner:** `PYTHONPATH=. python uploads_pack/run.py`

## Overview

The Uploads Pack validates client-side file upload functionality with size validation, progress tracking, cancel capability, and cross-pack avatar integration. This pack simulates file uploads using localStorage without requiring backend infrastructure, making it ideal for QA testing of upload UX flows.

## Test Coverage

### Contract Tests (7 selectors)
- Upload form (`#upload_form`)
- File input (`#file_input`)
- Upload button (`#upload_btn`)
- Cancel button (`#cancel_btn`)
- Error region (`#errors`)
- Progress bar (`#progress`)
- Uploads list (`#uploads_list`)

### Security Tests
- **CSP Validation**: Meta CSP header present
- **PII Leak Detection**: No credit card number hints in DOM
- **Secure File Handling**: No sensitive data exposure

### A11y Tests
- **Live Regions**: 
  - `#errors` with `aria-live="assertive"` for immediate feedback
  - `#status` with `aria-live="polite"` for status updates
- **Progress Indicator**: `aria-label="Progress"` with dynamic `aria-hidden` state
- **Semantic Structure**: Main content landmark (`#content`)

### Behavior Tests (3 workflows + 1 integration)

#### 1. Happy Path Upload
- Select file (tiny.png, 2KB)
- Click Upload button
- Verify "Upload complete" message
- Confirm file appears in uploads list

#### 2. Large File Rejection
- Select file exceeding 5MB limit (too_big.pdf, 6MB)
- Click Upload button
- Verify "File too large (max 5 MB)" error message
- Confirm upload is blocked client-side

#### 3. Cancel Upload
- Select file (tiny.png)
- Click Upload button
- Wait 300ms for progress to start
- Click Cancel button
- Verify "Upload canceled" message

#### 4. Avatar Integration (Cross-Pack)
- Upload image file
- Check if `profiles_list[0].avatar` updated in localStorage
- Status: WARN if no profiles_list available (acceptable)

### Visual Tests (1 baseline)
- **uploads-default**: Full page screenshot at initial state
- Viewport: Default (desktop)
- Format: PNG

## Features Validated

### Size Validation
- **Client-side enforcement**: 5MB maximum file size
- **Pre-upload check**: Prevents large files from starting upload
- **User feedback**: Clear error message when limit exceeded

### Progress Bar
- **Visual feedback**: Animated progress bar (0-100%)
- **Accessibility**: Dynamic `aria-hidden` state updates
- **Simulation**: Incremental progress with random variance (realistic UX)

### Cancel Capability
- **User control**: Ability to abort in-progress uploads
- **State management**: Proper cleanup of timer and progress
- **Feedback**: Status message confirms cancellation

### LocalStorage Persistence
- **Upload history**: Stores file metadata (name, size, type, timestamp)
- **Cross-session**: Persists across page reloads
- **Graceful degradation**: Try/catch blocks prevent errors

### Cross-Pack Integration
- **Avatar updates**: Image uploads automatically set `profiles_list[0].avatar`
- **Integration guard**: Validates profiles pack interaction
- **Isolation**: Works independently if profiles_list unavailable

## Installation

```bash
# From repository root
pip install -r uploads_pack/requirements.txt
python -m playwright install --with-deps chromium
```

## Running Tests

```bash
# Default (localhost:5000)
PYTHONPATH=. python uploads_pack/run.py

# Custom base URL
OI_BASE_URL="https://your-preview-domain" PYTHONPATH=. python uploads_pack/run.py
```

## Output Artifacts

All artifacts stored in `qa/uploads/v0.1.0/`:

- `tests.txt` - Human-readable test summary
- `tests.json` - Machine-parsable rollup
- `uploads.html.txt` - Page source snapshot placeholder
- `baselines/uploads-default.png` - Visual baseline screenshot
- `tiny.png` - Test file (2KB) used for happy path
- `too_big.pdf` - Test file (6MB) used for size validation

## E2E State Management

After successful test run, updates `qa/_state/session.json` with:

```json
{
  "uploads": {
    "upload_count": 1,
    "last_upload": {
      "name": "tiny.png",
      "size": 2048,
      "type": "image/png",
      "uploaded_at": "2025-10-11T16:59:45Z"
    },
    "features_validated": [
      "size_check",
      "progress_bar",
      "cancel",
      "avatar_integration"
    ],
    "max_size_mb": 5
  }
}
```

## Key Implementation Details

### Client-Side Architecture
The upload simulation uses pure JavaScript without server communication:

```javascript
// Size validation (5MB limit)
const sizeMB = file.size / (1024*1024);
if (sizeMB > MAX_MB) { 
  setError('File too large (max 5 MB)'); 
  return; 
}

// Simulated progress (120ms intervals)
timer = setInterval(() => {
  pct += 10 + Math.random()*10;
  if (pct >= 100) {
    // Store in localStorage
    const arr = getUploads();
    arr.push({ name, size, type, ts: Date.now() });
    setUploads(arr);
    updateAvatarIfImage(file);
  }
}, 120);
```

### Avatar Integration Logic
When uploading an image, automatically updates the first profile's avatar:

```javascript
function updateAvatarIfImage(file) {
  if (!file.type || !file.type.startsWith('image/')) return;
  try {
    const list = JSON.parse(localStorage.getItem('profiles_list')||'[]');
    if (list && list.length) {
      list[0].avatar = 'uploaded:' + file.name;
      localStorage.setItem('profiles_list', JSON.stringify(list));
    }
  } catch(e) {}
}
```

### Progress Bar State Management
- Hidden by default (`display:none`, `aria-hidden="true"`)
- Shown during upload (`display:block`, `aria-hidden="false"`)
- Reset after completion/cancellation
- Contract test uses `state="attached"` to check existence without requiring visibility

## Pass Criteria

**Overall PASS requires:**
- Contract: All 7 selectors exist (attached state, not visibility)
- Security: CSP present, no PII leaks
- A11y: Live regions properly configured, content visible
- Behavior: All 3 workflows complete successfully
- Integration: Avatar update succeeds OR profiles_list unavailable (WARN acceptable)
- Visual: Baseline created successfully

**Acceptable WARN conditions:**
- Integration-avatar: No profiles_list in localStorage (expected when run standalone)

**FAIL conditions:**
- Any selector missing
- CSP header absent
- Security leaks detected
- Workflow assertion failures
- Visual baseline creation errors

## Version History

### v0.1.0 (2025-10-11)
- Initial release
- 3 core workflows: happy path, size validation, cancel
- Avatar integration with profiles pack
- 1 visual baseline
- Client-side simulation using localStorage
- 8 test suites with 100% pass rate

## Related Packs

**Cross-Pack Dependencies:**
- None (fully standalone)

**Cross-Pack Integration:**
- Profiles Pack v0.1.0+ (optional avatar update feature)

**Parallel Packs:**
- Password Pack v0.1.6
- Subscription Pack v0.1.0+
- Availability Pack v0.1.0
- Shareable Profile Pack v0.1.0
- Profiles Pack v0.1.0

## Technical Notes

### Chromium Path
- System Chromium: `/nix/store/zi4f80l169xlmivz8vja8wlphq74qqk0-chromium-125.0.6422.141/bin/chromium`
- Configured in `run.py` for consistent headless testing

### File Upload Simulation
- Uses Playwright's `page.set_input_files()` to attach test files
- Creates dummy files with `make_dummy_file()` helper
- Test files stored in `qa/uploads/v0.1.0/` for inspection

### State Management
- `state="attached"` in contract tests handles hidden elements (progress bar)
- No special permissions required (unlike clipboard in shareable_profile)

### Helper Functions
- `ensure_dir()`: Creates output directories
- `update_test_index()`: Auto-updates `public/test2.html` with test row
- `make_dummy_file()`: Generates test files with specific sizes

## Supported File Types

**Accepted:**
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`
- Documents: `.pdf`

**Validation:**
- Enforced via `accept` attribute on file input
- MIME type stored in upload metadata
- Image detection for avatar integration

## Troubleshooting

### "Timeout waiting for #progress"
**Cause:** Default wait_for_selector() expects visible state  
**Fix:** Already resolved - uses `state="attached"` for hidden elements

### "No profiles_list available" warning
**Cause:** Integration test runs before profiles pack  
**Fix:** Acceptable condition - integration is optional feature

### Visual baseline changes
**Cause:** UI updates or browser rendering differences  
**Fix:** Regenerate baseline if intentional:
```bash
rm qa/uploads/v0.1.0/baselines/uploads-default.png
PYTHONPATH=. python uploads_pack/run.py
```

### ModuleNotFoundError
**Cause:** PYTHONPATH not set  
**Fix:** Always prefix with `PYTHONPATH=.`:
```bash
PYTHONPATH=. python uploads_pack/run.py
```

## Future Enhancements

**Potential Additions:**
- Multiple file upload support
- Drag-and-drop interface validation
- File type validation enforcement
- Upload resume/retry capability
- Backend integration variant (with real API)
- Thumbnail preview for images
- Upload queue management

## Contact

For issues or questions about this test pack, refer to the main QA documentation at `qa/README.md`.
