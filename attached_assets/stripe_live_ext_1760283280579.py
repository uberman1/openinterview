# Lightweight Stripe sandbox shim for Stage 6.
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from .provider_flags import Flags

router = APIRouter(prefix="/api/stripe_ext", tags=["stripe_ext"])

class CheckoutIn(BaseModel):
    plan: str
    email: EmailStr

class CheckoutOut(BaseModel):
    url: str
    mode: str
    sandbox: bool
    mocked: bool

@router.post("/checkout", response_model=CheckoutOut)
def checkout(inb: CheckoutIn):
    # Mock-first behavior
    mocked = Flags.STRIPE_MOCK
    sandbox = Flags.STRIPE_TEST and not mocked

    # Always safe response; if sandbox enabled, pretend to return a real Checkout URL
    url = "https://sandbox.stripe.com/checkout/session/test" if sandbox else "/subscription/success.html"
    return CheckoutOut(url=url, mode="subscription", sandbox=sandbox, mocked=mocked)

class WebhookIn(BaseModel):
    payload: dict
    signature: str = ""

class WebhookOut(BaseModel):
    ok: bool
    mode: str
    sandbox: bool
    mocked: bool

@router.post("/webhook", response_model=WebhookOut)
def webhook(inb: WebhookIn):
    mocked = Flags.STRIPE_MOCK
    sandbox = Flags.STRIPE_TEST and not mocked
    # Stage 6: we do not verify real signatures here—Bundle A already covers sig validation logic.
    return WebhookOut(ok=True, mode="webhook", sandbox=sandbox, mocked=mocked)
