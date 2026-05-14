import subprocess
from playwright.sync_api import sync_playwright

# Get chromium path
chromium_path = subprocess.run(["which", "chromium"], capture_output=True, text=True).stdout.strip()
print(f"Chromium path: {chromium_path}")

# Test basic playwright
with sync_playwright() as pw:
    print("Launching browser...")
    browser = pw.chromium.launch(executable_path=chromium_path, headless=True)
    print("Browser launched successfully!")
    
    context = browser.new_context()
    page = context.new_page()
    
    print("Navigating to page...")
    page.goto("http://127.0.0.1:5000/password.html")
    
    print("Getting page content...")
    content = page.content()
    print(f"Content length: {len(content)}")
    
    context.close()
    browser.close()
    print("Test complete!")
