
from fastapi import APIRouter, Depends, Response, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, constr
from typing import Optional, Dict
import os, secrets, time

router = APIRouter(prefix="/api/auth", tags=["auth"])

_otp_store: Dict[str, Dict] = {}
_session_store: Dict[str, Dict] = {}

def mint_csrf() -> str:
    return secrets.token_urlsafe(24)

def get_request_id(request: Request) -> str:
    return request.headers.get("x-request-id") or secrets.token_hex(8)

class SignupRequest(BaseModel):
    email: EmailStr
    invite_code: Optional[str] = None

class VerifyRequest(BaseModel):
    email: EmailStr
    code: constr(min_length=6, max_length=6)

INVITE_REQUIRED = os.getenv("INVITE_REQUIRED", "1") == "1"
INVITE_CODE = os.getenv("INVITE_CODE", "ALPHA2025")

def _email_send_mock(email: str, code: str):
    print(f"[AUTH MOCK EMAIL] To: {email} | OTP: {code}")

@router.post("/signup")
def signup(req: SignupRequest, response: Response, request: Request):
    rid = get_request_id(request)
    if INVITE_REQUIRED:
        if not req.invite_code or req.invite_code != INVITE_CODE:
            return JSONResponse(status_code=400, content={"error": {"code": "invite_required", "message": "Valid invite code required."}, "request_id": rid})
    code = f"{secrets.randbelow(1000000):06d}"
    _otp_store[req.email.lower()] = {"code": code, "ts": int(time.time())}
    _email_send_mock(req.email, code)
    csrf = mint_csrf()
    response.set_cookie("csrf_token", csrf, httponly=False, samesite="lax")
    return {"ok": True, "message": "Code sent", "request_id": rid}

@router.post("/verify")
def verify(req: VerifyRequest, response: Response, request: Request):
    rid = get_request_id(request)
    rec = _otp_store.get(req.email.lower())
    if not rec or rec["code"] != req.code:
        return JSONResponse(status_code=400, content={"error": {"code": "bad_code", "message": "Invalid code."}, "request_id": rid})
    sid = secrets.token_urlsafe(24)
    _session_store[sid] = {"email": req.email.lower(), "ts": int(time.time())}
    response.set_cookie("session", sid, httponly=True, samesite="lax")
    return {"ok": True, "email": req.email.lower(), "request_id": rid}

@router.post("/logout")
def logout(response: Response, request: Request):
    rid = get_request_id(request)
    sid = request.cookies.get("session")
    if sid and sid in _session_store:
        del _session_store[sid]
    response.delete_cookie("session")
    return {"ok": True, "request_id": rid}

@router.get("/session")
def session(request: Request):
    rid = get_request_id(request)
    sid = request.cookies.get("session")
    if not sid or sid not in _session_store:
        return {"authenticated": False, "request_id": rid}
    return {"authenticated": True, "email": _session_store[sid]["email"], "request_id": rid}

@router.get("/csrf")
def csrf(response: Response, request: Request):
    rid = get_request_id(request)
    csrf = mint_csrf()
    response.set_cookie("csrf_token", csrf, httponly=False, samesite="lax")
    return {"csrf": csrf, "request_id": rid}
