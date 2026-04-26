
import os, json, pathlib
def artifacts_dir(version="v0.1.0"):
    p = pathlib.Path(f"qa/auth/{version}")
    p.mkdir(parents=True, exist_ok=True)
    return p
def mirror_state_into_localstorage(page, state_path="qa/_state/session.json"):
    try:
        with open(state_path, "r") as f:
            data = f.read()
        page.add_init_script(f"localStorage.setItem('qa_state', {json.dumps(data)});")
    except FileNotFoundError:
        pass
