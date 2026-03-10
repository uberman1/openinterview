(function(){
  const $ = (id)=>document.getElementById(id);
  const apiBase = (localStorage.getItem("qa_api_base") || window.location.origin);
  const say = (m)=>{ $("status").textContent = m; };
  async function post(path, body){
    const res = await fetch(apiBase + path, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      credentials: "include",
      body: JSON.stringify(body||{})
    });
    if(!res.ok){ throw new Error("HTTP " + res.status); }
    return res.json();
  }
  async function get(path){
    const res = await fetch(apiBase + path, { credentials: "include" });
    if(!res.ok){ throw new Error("HTTP " + res.status); }
    return res.json();
  }
  async function refreshOutbox(){
    const r = await get("/api/notify/outbox");
    const list = $("outbox_list");
    list.innerHTML = "";
    (r.items||[]).slice(-5).reverse().forEach(function(item){
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
  }
  $("send_otp_btn").addEventListener("click", async ()=>{
    try{
      const email = $("email").value.trim() || "qa_tester@example.com";
      const r = await post("/api/notify/otp", { email, code: "123456" });
      say(r.ok ? "OTP sent (mock)" : "Failed");
      await refreshOutbox();
    }catch(e){ console.error(e); say("Error sending OTP"); }
  });
  $("send_generic_btn").addEventListener("click", async ()=>{
    try{
      const email = $("email").value.trim() || "qa_tester@example.com";
      const r = await post("/api/notify/send", { to: email, template: "generic", subject: "Hello from QA", variables: { test: true }});
      say(r.ok ? "Email queued (mock)" : "Failed");
      await refreshOutbox();
    }catch(e){ console.error(e); say("Error sending email"); }
  });
  refreshOutbox();
})();
