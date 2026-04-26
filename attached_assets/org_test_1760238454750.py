
import requests

def main(base_url, outdir):
    headers_owner = {"X-Demo-User":"owner@example.com"}
    headers_member = {"X-Demo-User":"member@example.com"}

    r = requests.post(f"{base_url}/api/org", json={"name":"Acme Inc"}, headers=headers_owner, timeout=10)
    if r.status_code != 200:
        return {"status":"FAIL","step":"create_org","code":r.status_code,"body":r.text}
    org = r.json()
    org_id = org["id"]

    r = requests.post(f"{base_url}/api/org/invite", json={"org_id":org_id,"email":"member@example.com","role":"member"}, headers=headers_owner, timeout=10)
    if r.status_code != 200:
        return {"status":"FAIL","step":"invite","code":r.status_code,"body":r.text}

    r = requests.post(f"{base_url}/api/org/accept", json={"org_id":org_id,"email":"member@example.com"}, headers=headers_member, timeout=10)
    if r.status_code != 200:
        return {"status":"FAIL","step":"accept","code":r.status_code,"body":r.text}

    r = requests.get(f"{base_url}/api/org/members", params={"org_id":org_id}, headers=headers_member, timeout=10)
    if r.status_code != 200 or "member@example.com" not in r.json().get("members", {}):
        return {"status":"FAIL","step":"members","code":r.status_code,"body":r.text}

    r = requests.post(f"{base_url}/api/org/role", json={"org_id":org_id, "email":"member@example.com","role":"admin"}, headers=headers_member, timeout=10)
    if r.status_code != 403:
        return {"status":"FAIL","step":"rbac_block_expected_403","got":r.status_code}

    r = requests.post(f"{base_url}/api/org/role", json={"org_id":org_id, "email":"member@example.com","role":"admin"}, headers=headers_owner, timeout=10)
    if r.status_code != 200:
        return {"status":"FAIL","step":"owner_role_change","code":r.status_code,"body":r.text}

    return {"status":"PASS","org_id":org_id}
