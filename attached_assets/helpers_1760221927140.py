import pathlib, json

def artifacts_dir(version: str) -> pathlib.Path:
    out = pathlib.Path(f"qa/notify/{version}")
    out.mkdir(parents=True, exist_ok=True)
    (out / "baselines").mkdir(parents=True, exist_ok=True)
    return out

def mirror_state_into_localstorage(page):
    # Mirror qa/_state/session.json into localStorage (if present)
    p = pathlib.Path("qa/_state/session.json")
    state = {}
    if p.exists():
        try:
            state = json.loads(p.read_text())
        except Exception:
            state = {}
    page.add_init_script(f"localStorage.setItem('qa_state', {json.dumps(json.dumps(state))});")
    # ensure same-origin base for binders
    page.add_init_script("localStorage.setItem('qa_api_base', 'http://localhost:8000');")
