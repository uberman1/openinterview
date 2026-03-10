
from fastapi import APIRouter, Query
from typing import List, Dict, Any, Optional
import hashlib, json, time

router = APIRouter()
AUDIT: List[Dict[str, Any]] = []

def _hash_entry(e: Dict[str, Any]) -> str:
    ser = json.dumps(e, sort_keys=True, separators=(",",":")).encode("utf-8")
    return hashlib.sha256(ser).hexdigest()

def append_audit(actor: str, action: str, resource: str, meta: Optional[Dict[str, Any]]=None):
    prev_hash = AUDIT[-1]["hash"] if AUDIT else "GENESIS"
    entry = {
        "ts": int(time.time()*1000),
        "actor": actor,
        "action": action,
        "resource": resource,
        "prev_hash": prev_hash,
        "meta": meta or {},
    }
    entry["hash"] = _hash_entry(entry)
    AUDIT.append(entry)
    return entry

@router.get("/api/audit", tags=["audit"])
def get_audit(limit: int = Query(10, ge=1, le=100)):
    return {"items": AUDIT[-limit:], "count": len(AUDIT)}

@router.post("/api/audit/export", tags=["audit"])
def export_audit():
    redacted = []
    for e in AUDIT:
        c = json.loads(json.dumps(e))
        for k, v in list(c.get("meta", {}).items()):
            if isinstance(v, str) and "@" in v:
                c["meta"][k] = "[redacted]"
        redacted.append(c)
    return {"items": redacted, "count": len(AUDIT), "strategy": "basic-email-redaction"}
