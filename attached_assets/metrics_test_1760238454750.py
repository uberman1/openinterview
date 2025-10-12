
import requests

def main(base_url, outdir):
    h = requests.get(f"{base_url}/health/extended", timeout=10)
    if h.status_code != 200 or h.json().get("status") != "ok":
        return {"status":"FAIL","step":"extended_health","code":h.status_code,"body":h.text}

    m = requests.get(f"{base_url}/metrics", timeout=10)
    if m.status_code != 200:
        return {"status":"FAIL","step":"metrics_fetch","code":m.status_code}
    text = m.text
    needed = ["action=\"create_org\"", "action=\"invite\"", "action=\"accept_invite\"", "action=\"role_change\""]
    missing = [x for x in needed if x not in text]
    if missing:
        return {"status":"FAIL","step":"metrics_missing","missing":missing,"metrics":text[:400]}
    return {"status":"PASS"}
