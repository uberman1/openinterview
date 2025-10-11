import os, json, pathlib, time, secrets
from typing import Dict, Any

MODE = os.getenv("NOTIFY_MODE", "mock").lower()
PROVIDER = os.getenv("NOTIFY_PROVIDER", "resend").lower()
OUTBOX_DIR = pathlib.Path("qa/notify/outbox")
OUTBOX_DIR.mkdir(parents=True, exist_ok=True)

def _ts(): return time.strftime("%Y-%m-%dT%H:%M:%S%z")

def send_email(to: str, subject: str, html: str, text: str, headers: Dict[str,Any] = None) -> Dict[str,Any]:
    if MODE == "mock":
        path = OUTBOX_DIR / f"{int(time.time()*1000)}_{secrets.token_hex(3)}.json"
        payload = {"to": to, "subject": subject, "html": html, "text": text, "headers": headers or {}, "time": _ts(), "mode": "mock"}
        path.write_text(json.dumps(payload, indent=2))
        return {"ok": True, "mock_path": str(path)}
    return {"ok": True, "provider": PROVIDER, "emulated": True}
