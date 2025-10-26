# GitHub Actions Workflows

## E2E Tests (`e2e-tests.yml`)

Automatically runs Playwright end-to-end tests on every push and pull request.

### What It Does

1. ✅ Runs on every push to `main`, `master`, or `develop` branches
2. ✅ Runs on every pull request to those branches
3. ✅ Can be manually triggered via GitHub UI (workflow_dispatch)
4. ✅ Installs all dependencies and Playwright browsers
5. ✅ Starts the application on port 5000
6. ✅ Waits for app to be ready (up to 60 seconds)
7. ✅ Runs all 9 E2E tests
8. ✅ Uploads test reports as artifacts (kept for 30 days)
9. ✅ Uploads screenshots on failure for debugging

### Test Coverage

- **Phase 1:** Save & Return, Profile Name validation, Help text
- **Phase 2:** Resume dropdown, Auto-populate, Asset upload  
- **Phase 3:** Availability blocks, Slot rendering
- **Regression:** Data persistence

### Viewing Results

1. **Go to your GitHub repo** → **Actions** tab
2. Click on any workflow run to see results
3. If tests fail, download the artifacts to see screenshots

### Manual Trigger

1. Go to **Actions** → **E2E Tests**
2. Click **Run workflow** button
3. Select branch and click **Run workflow**

### Cost

GitHub Actions is **FREE** for public repositories with generous limits:
- 2,000 minutes/month for private repos (free tier)
- Unlimited for public repos

Each test run takes ~2-3 minutes, so you can run hundreds of times per month for free.

### Troubleshooting

**Tests failing in CI but passing locally?**
- Check if environment variables are set in GitHub Secrets
- Verify port 5000 is being used
- Check the uploaded artifacts for screenshots

**App not starting?**
- Increase timeout in the "Wait for app" step
- Check if `npm run dev` command is correct
- Verify all dependencies are in package.json

**Need to skip tests temporarily?**
- Add `[skip ci]` to your commit message
- Example: `git commit -m "WIP: feature [skip ci]"`
