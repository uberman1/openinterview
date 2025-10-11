from playwright.sync_api import sync_playwright
import json, pathlib, subprocess

def run():
    chromium_path = subprocess.run(["which", "chromium"], capture_output=True, text=True).stdout.strip()
    if not chromium_path:
        raise RuntimeError("System chromium not found. Install via: nix-env -iA nixpkgs.chromium")
    
    res = {}
    outbox_dir = pathlib.Path("qa/notify/outbox")
    initial_count = len(list(outbox_dir.glob("*.json"))) if outbox_dir.exists() else 0
    
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=chromium_path, args=["--no-sandbox"], headless=True)
        page = b.new_page()
        
        # Test OTP send via notify extension
        r = page.request.post("http://localhost:8000/api/notify/otp", data=json.dumps({
            "email": "test@example.com"
        }), headers={"content-type": "application/json"})
        res["otp_send"] = "PASS" if r.ok else "FAIL"
        
        # Test generic send
        r2 = page.request.post("http://localhost:8000/api/notify/send", data=json.dumps({
            "to": "user@example.com",
            "subject": "Test",
            "template": "generic",
            "data": {"message": "Hello"}
        }), headers={"content-type": "application/json"})
        res["generic_send"] = "PASS" if r2.ok else "FAIL"
        
        # Verify outbox has new messages
        final_count = len(list(outbox_dir.glob("*.json"))) if outbox_dir.exists() else 0
        res["outbox_growth"] = "PASS" if final_count > initial_count else "FAIL"
        
        b.close()
    return res

if __name__ == "__main__":
    print(json.dumps(run(), indent=2))
