
import requests

def main(base_url, outdir):
    r = requests.get(f"{base_url}/api/audit", timeout=10)
    if r.status_code != 200:
        return {"status":"FAIL","step":"get_audit","code":r.status_code}

    items = r.json().get("items", [])
    if not items:
        return {"status":"FAIL","step":"no_audit_items"}

    ok_chain = True
    for i in range(1, len(items)):
        if items[i]["prev_hash"] != items[i-1]["hash"]:
            ok_chain = False
            break

    r2 = requests.post(f"{base_url}/api/audit/export", timeout=10)
    if r2.status_code != 200:
        return {"status":"FAIL","step":"export","code":r2.status_code}
    exported = r2.json().get("items", [])
    redacted = any("[redacted]" in (str(e.get("meta")) if e.get("meta") else "") for e in exported)

    if not ok_chain:
        return {"status":"FAIL","step":"chain_integrity"}
    if not redacted:
        return {"status":"FAIL","step":"redaction_missing"}

    return {"status":"PASS","count": len(items)}
