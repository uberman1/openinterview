from fastapi import APIRouter, Request, HTTPException
import os, time, hmac, hashlib, secrets

router = APIRouter(prefix="/api/security", tags=["security"])

_BUCKET = {}
RATE_WINDOW = int(os.getenv("AUTH_RATE_WINDOW_SEC", "60"))
RATE_LIMIT = int(os.getenv("AUTH_RATE_LIMIT", "5"))
SESSION_TTL = int(os.getenv("SESSION_TTL_SEC", "1800"))
CSRF_SECRET = os.getenv("CSRF_SECRET", "csrf-dev-secret")

def key_for(request: Request):
    ip = request.headers.get("x-forwarded-for") or request.client.host
    ua = request.headers.get("user-agent","")
    return f"{ip}:{hashlib.sha256(ua.encode()).hexdigest()[:8]}"

def allow(request: Request, bucket: dict):
    now = int(time.time())
    k = key_for(request)
    window = now // RATE_WINDOW
    entry = bucket.get(k) or {"w": window, "c": 0}
    if entry["w"] != window:
        entry = {"w": window, "c": 0}
    entry["c"] += 1
    bucket[k] = entry
    return entry["c"] <= RATE_LIMIT

def issue_csrf(session_id: str):
    ts = str(int(time.time()))
    sig = hmac.new(CSRF_SECRET.encode(), f"{session_id}.{ts}".encode(), hashlib.sha256).hexdigest()
    return f"{ts}.{sig}"

def verify_csrf(session_id: str, token: str) -> bool:
    try:
        ts, sig = token.split(".", 1)
        if abs(int(time.time()) - int(ts)) > 3600:
            return False
        expect = hmac.new(CSRF_SECRET.encode(), f"{session_id}.{ts}".encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(sig, expect)
    except Exception:
        return False

@router.get("/csrf")
def csrf_endpoint(request: Request):
    sid = request.session.get("sid")
    if not sid:
        sid = secrets.token_hex(16)
        request.session["sid"] = sid
        request.session["touched"] = int(time.time())
    token = issue_csrf(sid)
    return {"csrf": token}

@router.post("/touch")
def touch_session(request: Request):
    now = int(time.time())
    touched = int(request.session.get("touched") or 0)
    if touched and (now - touched) > SESSION_TTL:
        request.session.clear()
        raise HTTPException(status_code=440, detail="session_expired")
    request.session["touched"] = now
    return {"ok": True, "touched": now}

@router.get("/rate_check")
def rate_check(request: Request):
    if not allow(request, _BUCKET):
        raise HTTPException(status_code=429, detail="rate_limited")
    return {"ok": True}
