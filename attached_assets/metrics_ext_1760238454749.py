
from fastapi import APIRouter
from time import monotonic
from typing import Dict

router = APIRouter()
START = monotonic()
COUNTERS: Dict[str, int] = {}

def inc(metric: str, labels: str = ""):
    key = f"{metric}{labels}"
    COUNTERS[key] = COUNTERS.get(key, 0) + 1

@router.get("/metrics", tags=["metrics"])
def metrics():
    lines = []
    for key, val in sorted(COUNTERS.items()):
        if "{" in key:
            metric, rest = key.split("{", 1)
            lines.append(f"{metric}{{{rest}")
        else:
            lines.append(f"{key} {val}")
    if not lines:
        lines.append("app_actions_total 0")
    return "\n".join(lines) + "\n"

@router.get("/health/extended", tags=["metrics"])
def extended():
    uptime_ms = int((monotonic() - START) * 1000)
    db_ms = 5
    return {"status":"ok","uptime_ms":uptime_ms,"db_ms":db_ms}
