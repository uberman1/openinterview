from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
import os, hmac, hashlib, time, json

router = APIRouter(prefix="/api/stripe", tags=["stripe-live"])

STRIPE_SIGNING_SECRET = os.getenv("STRIPE_SIGNING_SECRET", "whsec_dev")
STRIPE_TEST = os.getenv("STRIPE_TEST", "1") == "1"

class Checkout(BaseModel):
    plan: str
    email: str

def sign_webhook(payload: dict, secret: str):
    ts = str(int(time.time()))
    raw = ts + "." + json.dumps(payload, separators=(",", ":"), sort_keys=True)
    sig = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
    header = f"t={ts},v1={sig}"
    return header, raw

def verify_webhook(signature: str, raw: str, secret: str) -> bool:
    try:
        parts = dict(x.split("=",1) for x in signature.split(","))
        v1 = parts.get("v1"); ts = parts.get("t")
        if not v1 or not ts: return False
        expect = hmac.new(secret.encode(), raw.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(v1, expect)
    except Exception:
        return False

@router.post("/checkout")
def create_checkout(data: Checkout):
    if STRIPE_TEST:
        return {"ok": True, "url": f"/subscription/success.html?plan={data.plan}"}
    return {"ok": True, "url": "https://checkout.stripe.com/pay/TODO"}

@router.post("/webhook")
async def webhook(request: Request):
    raw = await request.body()
    sig = request.headers.get("stripe-signature","")
    ok = verify_webhook(sig, raw.decode(), STRIPE_SIGNING_SECRET)
    if not ok:
        raise HTTPException(status_code=400, detail="bad_signature")
    return {"ok": True, "handled": True}
