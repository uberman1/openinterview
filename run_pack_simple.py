#!/usr/bin/env python3
import subprocess
import os
from playwright.sync_api import sync_playwright

# Get chromium path
chromium_path = subprocess.run(["which", "chromium"], capture_output=True, text=True).stdout.strip()
print(f"Chromium: {chromium_path}")

# Launch browser and capture page
base_url = "http://127.0.0.1:5000"
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=chromium_path, headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    
    print(f"Visiting {base_url}/password.html...")
    resp = page.goto(base_url + "/password.html")
    
    resp_headers = resp.headers if resp else {}
    html_content = page.content()
    
    print(f"Content length: {len(html_content)}")
    print(f"Response headers count: {len(resp_headers)}")
    
    # Save to file
    os.makedirs("public", exist_ok=True)
    with open("public/password.html", "w", encoding="utf-8") as f:
        f.write(html_content)
    
    print("Saved to public/password.html")
    
    # Check for required IDs in the captured HTML
    required_ids = [
        "password-form",
        "email",
        "token",
        "new_password",
        "confirm_password",
        "toggle_pw",
        "submit_btn",
        "pw_strength",
        "pw_rules",
        "errors",
        "back_to_login",
        "csrf_token"
    ]
    
    print("\nChecking required IDs:")
    for rid in required_ids:
        if f'id="{rid}"' in html_content or f"id='{rid}'" in html_content:
            print(f"  ✓ {rid}")
        else:
            print(f"  ✗ {rid} MISSING")
    
    ctx.close()
    browser.close()
    
print("\nDone!")
