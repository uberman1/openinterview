
(function(){
  const $ = (id)=>document.getElementById(id);
  // Prefer explicit qa_api_base, otherwise SAME ORIGIN.
  const apiBase =
    (localStorage.getItem("qa_api_base") || window.location.origin).replace(/\/health$/, "");
  const statusEl = $("status");
  function say(msg){ statusEl.textContent = msg; }

  async function post(path, body){
    const res = await fetch(apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body||{})
    });
    if (!res.ok) {
      const txt = await res.text().catch(()=> "");
      throw new Error(`POST ${path} failed: ${res.status} ${txt}`);
    }
    return res.json();
  }
  async function get(path){
    const res = await fetch(apiBase + path, { credentials: "include" });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  $("signup_btn").addEventListener("click", async ()=>{
    const email = $("email").value.trim();
    const invite = $("invite").value.trim();
    try {
      const r = await post("/api/auth/signup", { email, invite_code: invite });
      if(r && r.ok){
        say("Code sent. Check console (mock).");
        $("verify_group").classList.remove("hidden");
      } else {
        say((r && r.error && r.error.message) || "Error");
      }
    } catch (e) {
      console.error(e);
      say("Signup failed (network/CORS).");
    }
  });

  $("verify_btn").addEventListener("click", async ()=>{
    const email = $("email").value.trim();
    const code = $("code").value.trim();
    try {
      const r = await post("/api/auth/verify", { email, code });
      if(r && r.ok){ say("Logged in as " + r.email); }
      else { say((r && r.error && r.error.message) || "Error"); }
    } catch (e) {
      console.error(e);
      say("Verify failed.");
    }
  });

  $("session_btn").addEventListener("click", async ()=>{
    try {
      const r = await get("/api/auth/session");
      say(r.authenticated ? ("Authenticated: " + r.email) : "Not authenticated");
    } catch (e) {
      console.error(e);
      say("Session check failed.");
    }
  });

  $("logout_btn").addEventListener("click", async ()=>{
    try {
      await post("/api/auth/logout", {});
      say("Logged out");
    } catch (e) {
      console.error(e);
      say("Logout failed.");
    }
  });
})();
