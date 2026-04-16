# Lightweight notify sandbox shim (Stage 6).
from fastapi import APIRouter
from pydantic import BaseModel, EmailStr
from .provider_flags import Flags
import os, json, time

router = APIRouter(prefix="/api/notify_ext", tags=["notify_ext"])
OUTBOX = os.path.join("qa","notify","outbox")

class NotifyIn(BaseModel):
    to: EmailStr
    template: str = "generic"
    subject: str = "Test"
    data: dict = {}

class NotifyOut(BaseModel):
    ok: bool
    mode: str
    sandbox: bool
    mocked: bool
    path: str

@router.post("/send", response_model=NotifyOut)
def send(inb: NotifyIn):
    mocked = (Flags.NOTIFY_MODE == "mock")
    sandbox = (Flags.NOTIFY_MODE == "sandbox")

    os.makedirs(OUTBOX, exist_ok=True)
    ts = int(time.time())
    fname = f"{ts}_{inb.template}.json"
    fpath = os.path.join(OUTBOX, fname)
    # Always write outbox; real providers would be wired here when NOTIFY_MODE='live'
    with open(fpath, "w", encoding="utf-8") as f:
        json.dump({"to": inb.to, "template": inb.template, "subject": inb.subject, "data": inb.data,
                   "sandbox": sandbox, "mocked": mocked, "ts": ts}, f, indent=2)
    return NotifyOut(ok=True, mode=inb.template, sandbox=sandbox, mocked=mocked, path=fpath)
