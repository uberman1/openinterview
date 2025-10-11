import os, json, glob

def read_json(path, default=None):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return default

def find_latest_tests():
    results = {}
    # look for qa/<pack>/<version>/tests.txt or tests.json
    for pack in ["password","subscription","availability","shareable_profile","profiles","uploads","home","auth"]:
        base = os.path.join("qa", pack)
        if not os.path.isdir(base):
            continue
        versions = sorted([d for d in os.listdir(base) if os.path.isdir(os.path.join(base,d))])
        if not versions:
            continue
        latest = versions[-1]
        p_txt = os.path.join(base, latest, "tests.txt")
        p_json = os.path.join(base, latest, "tests.json")
        results[pack] = {
            "version": latest,
            "tests_txt": p_txt if os.path.exists(p_txt) else None,
            "tests_json": p_json if os.path.exists(p_json) else None,
            "json": read_json(p_json, default=None),
        }
    return results

def overall_status(results):
    ok = True
    details = {}
    for pack, info in results.items():
        status = None
        if info["json"] and isinstance(info["json"], dict):
            status = info["json"].get("status") or info["json"].get("Status")
        if status is None and info["tests_txt"] and os.path.exists(info["tests_txt"]):
            try:
                with open(info["tests_txt"], 'r', encoding='utf-8') as f:
                    txt = f.read(256).lower()
                    status = "PASS" if "pass" in txt else "FAIL"
            except Exception:
                status = "UNKNOWN"
        if not status:
            status = "UNKNOWN"
        details[pack] = status
        if status.upper() != "PASS":
            ok = False
    return ok, details
