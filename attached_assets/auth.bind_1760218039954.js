
(function(){
  const $ = (id)=>document.getElementById(id);
  const apiBase = (localStorage.getItem("qa_health_url") || "http://127.0.0.1:8000").replace(/\/health$/, "");
  const statusEl = $("status");
  function say(msg){ statusEl.textContent = msg; }

  async function post(path, body){
    const res = await fetch(apiBase + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body||{})
    });
    return res.json();
  }
  async function get(path){
    const res = await fetch(apiBase + path, { credentials: "include" });
    return res.json();
  }

  $("signup_btn").addEventListener("click", async ()=>{
    const email = $("email").value.trim();
    const invite = $("invite").value.trim();
    const r = await post("/api/auth/signup", { email, invite_code: invite });
    if(r && r.ok){ say("Code sent. Check console (mock)."); $("verify_group").classList.remove("hidden"); }
    else { say((r && r.error && r.error.message) || "Error"); }
  });

  $("verify_btn").addEventListener("click", async ()=>{
    const email = $("email").value.trim();
    const code = $("code").value.trim();
    const r = await post("/api/auth/verify", { email, code });
    if(r && r.ok){ say("Logged in as " + r.email); }
    else { say((r && r.error && r.error.message) || "Error"); }
  });

  $("session_btn").addEventListener("click", async ()=>{
    const r = await get("/api/auth/session");
    say(r.authenticated ? ("Authenticated: " + r.email) : "Not authenticated");
  });

  $("logout_btn").addEventListener("click", async ()=>{
    const r = await post("/api/auth/logout", {});
    say("Logged out");
  });
})();
