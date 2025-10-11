from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, Dict, Any
import os, time, json, pathlib, secrets, base64, hmac, hashlib

router = APIRouter(prefix="/api/notify", tags=["notify"])

MODE = os.getenv("NOTIFY_MODE", "mock").lower()  # mock | smtp | provider
OUTBOX_DIR = pathlib.Path("qa/notify/outbox")
STATE_PATH = pathlib.Path("qa/_state/session.json")
SECRET = os.getenv("NOTIFY_SIGNING_SECRET", "dev-secret")

def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S%z")

def ensure_dirs():
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)

def merge_state(key: str, data: Dict[str, Any]):
    ensure_dirs()
    state = {}
    if STATE_PATH.exists():
        try:
            state = json.loads(STATE_PATH.read_text())
        except Exception:
            state = {}
    state.setdefault("notifications", {})
    state["notifications"][key] = data
    STATE_PATH.write_text(json.dumps(state, indent=2))

def sign_link(payload: Dict[str, Any], ttl_seconds: int = 900) -> str:
    payload = dict(payload)
    payload["exp"] = int(time.time()) + ttl_seconds
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    sig = hmac.new(SECRET.encode(), raw, hashlib.sha256).digest()
    token = base64.urlsafe_b64encode(raw + b"." + sig).decode().rstrip("=")
    return token

def verify_token(token: str) -> bool:
    try:
        raw = base64.urlsafe_b64decode(token + "===")
        raw_payload, sig = raw.rsplit(b".", 1)
        expect = hmac.new(SECRET.encode(), raw_payload, hashlib.sha256).digest()
        if not hmac.compare_digest(sig, expect):
            return False
        data = json.loads(raw_payload.decode())
        if int(time.time()) > int(data.get("exp", 0)):
            return False
        return True
    except Exception:
        return False

class SendPayload(BaseModel):
    to: EmailStr
    template: str = Field(..., description="otp|booking_confirm|booking_cancel|profile_published|generic")
    subject: str
    variables: Dict[str, Any] = {}

class OtpPayload(BaseModel):
    email: EmailStr
    code: str

def render_html_text(template: str, variables: Dict[str, Any]):
    html = f"""<!doctype html><html><body>
<h1>OpenInterview Notification: {template}</h1>
<p>{json.dumps(variables)}</p>
<hr/>
<p style="font-size:12px;color:#666">If you didn't request this, please ignore.</p>
</body></html>"""
    text = f"OpenInterview Notification: {template}\n{json.dumps(variables)}\n--\nIf you didn't request this, please ignore."
    return html, text

def outbox_write(item: Dict[str, Any]):
    ensure_dirs()
    ts = int(time.time()*1000)
    path = OUTBOX_DIR / f"{ts}_{secrets.token_hex(4)}.json"
    path.write_text(json.dumps(item, indent=2))
    return str(path)

@router.post("/send")
def send_email(payload: SendPayload):
    html, text = render_html_text(payload.template, payload.variables)
    mail = {
        "mode": MODE,
        "to": payload.to,
        "subject": payload.subject,
        "template": payload.template,
        "html": html,
        "text": text,
        "headers": {
            "List-Unsubscribe": "<mailto:noreply@openinterview.me?subject=unsubscribe>, <https://openinterview.me/unsubscribe>",
        },
        "time": now_iso(),
    }
    path = outbox_write(mail)
    merge_state("last_send", {"to": payload.to, "template": payload.template, "subject": payload.subject, "outbox": path, "time": now_iso()})
    return {"ok": True, "outbox": path}

@router.post("/otp")
def send_otp(payload: OtpPayload):
    token = sign_link({"email": payload.email, "code": payload.code})
    html, text = render_html_text("otp", {"email": payload.email, "code": payload.code, "token": token})
    mail = {
        "mode": MODE,
        "to": payload.email,
        "subject": "Your OpenInterview verification code",
        "template": "otp",
        "html": html,
        "text": text,
        "token": token,
        "time": now_iso(),
    }
    path = outbox_write(mail)
    merge_state("otp", {"email": payload.email, "token_ok": verify_token(token), "outbox": path, "time": now_iso()})
    return {"ok": True, "token": token, "outbox": path}

@router.get("/outbox")
def list_outbox():
    ensure_dirs()
    items = sorted([str(p) for p in OUTBOX_DIR.glob("*.json")])
    return {"ok": True, "items": items}
