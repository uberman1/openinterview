// Availability vertical weekly layout support
const $ = (s, el=document)=>el.querySelector(s);
const $$ = (s, el=document)=>[...el.querySelectorAll(s)];

const defaultState = () => ({
  userId: window.__USER_ID__ || 'u1',
  timezone: 'America/Los_Angeles',
  weekly: { Mon:[], Tue:[], Wed:[], Thu:[], Fri:[], Sat:[], Sun:[] },
  rules: {
    minNoticeMinutes: 120, windowDays: 30, incrementsMinutes: 30,
    bufferBeforeMinutes: 30, bufferAfterMinutes: 10, maxPerDay: 5,
    durations: [15,30,45], defaultDuration: 30
  },
  exceptions: []
});

let state = defaultState();

async function loadFromAPI(){
  try{
    const r = await fetch(`/api/availability?userId=${encodeURIComponent(state.userId)}`);
    if (r.ok){ state = await r.json(); state.userId = state.userId || 'u1'; }
  }catch{}
}

async function saveToAPI(){
  const r = await fetch(`/api/availability`, {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body: JSON.stringify(state)
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function showTab(name){
  ['weekly','rules','exceptions','preview','troubleshoot'].forEach(t=>{
    $('#tab-'+t).classList.toggle('hidden', t!==name);
  });
  $$('.tab').forEach(b=>{
    const active = b.dataset.tab===name;
    b.classList.toggle('bg-primary', active);
    b.classList.toggle('text-white', active);
  });
  if (name==='preview') renderPreview();
}

function renderWeekly(){
  // For each .blocks container, render that day's rows
  $$('.blocks').forEach(el=>{
    const day = el.closest('[data-day]').dataset.day;
    el.innerHTML = '';
    const blocks = state.weekly[day] || [];
    const emptyNote = el.parentElement.querySelector('.empty-note');
    emptyNote.style.display = blocks.length ? 'none' : 'block';

    blocks.forEach((blk,i)=>{
      const row = document.createElement('div');
      row.className='flex items-center gap-2';
      row.innerHTML = `
        <input type="time" value="${blk[0]}" class="rounded-lg flex-none w-32 start">
        <span class="text-muted-light">–</span>
        <input type="time" value="${blk[1]}" class="rounded-lg flex-none w-32 end">
        <button class="icon-btn remove" title="Remove">×</button>
        <button class="icon-btn add-inline" title="Add">+</button>
        <button class="icon-btn duplicate" title="Copy to weekdays">⧉</button>
      `;
      row.querySelector('.start').addEventListener('change',e=>{ blk[0]=e.target.value; });
      row.querySelector('.end').addEventListener('change',e=>{ blk[1]=e.target.value; });
      row.querySelector('.remove').addEventListener('click',()=>{
        state.weekly[day].splice(i,1); renderWeekly();
      });
      row.querySelector('.add-inline').addEventListener('click',()=>{
        state.weekly[day].splice(i+1,0,[blk[0],blk[1]]); renderWeekly();
      });
      row.querySelector('.duplicate').addEventListener('click',()=>{
        // Copy this day's blocks to all weekdays (Mon–Fri) like Calendly clone
        const copy = (state.weekly[day]||[]).map(b=>[...b]);
        ['Mon','Tue','Wed','Thu','Fri'].forEach(d=> state.weekly[d] = copy.map(b=>[...b]));
        renderWeekly();
      });
      el.appendChild(row);
    });
  });
}

function bindWeekly(){
  // Day-level add buttons
  $$('.add-block').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const d = btn.closest('[data-day]').dataset.day;
      state.weekly[d] = state.weekly[d] || [];
      state.weekly[d].push(['09:00','17:00']);
      renderWeekly();
    });
  });
  // Quick actions (same as before)
  $('#copyWeekdays')?.addEventListener('click',()=>{
    const src = state.weekly.Mon || [];
    ['Tue','Wed','Thu','Fri'].forEach(d=> state.weekly[d] = src.map(b=>[...b]));
    renderWeekly();
  });
  $('#applyWeekdays')?.addEventListener('click',()=>{
    const merged = (state.weekly.Mon||[]).length? state.weekly.Mon : [['09:00','12:00'],['13:00','17:00']];
    ['Mon','Tue','Wed','Thu','Fri'].forEach(d=> state.weekly[d] = merged.map(b=>[...b]));
    state.weekly.Sat = []; state.weekly.Sun = [];
    renderWeekly();
  });
  $('#resetAll')?.addEventListener('click',()=>{
    state.weekly = { Mon:[], Tue:[], Wed:[], Thu:[], Fri:[], Sat:[], Sun:[] };
    renderWeekly();
  });
  $('#timezone').value = state.timezone;
  $('#timezone').addEventListener('change',e=>{ state.timezone=e.target.value; });
}

function bindRules(){
  $('#minNotice').value = state.rules.minNoticeMinutes;
  $('#minNotice').addEventListener('change',e=>{ state.rules.minNoticeMinutes=+e.target.value; });
  $('#windowDays').value = state.rules.windowDays;
  $('#windowDays').addEventListener('change',e=>{ state.rules.windowDays=+e.target.value; });
  $$('input[name="inc"]').forEach(r=>{
    r.checked = (+r.value===state.rules.incrementsMinutes);
    r.addEventListener('change',()=>{ state.rules.incrementsMinutes=+r.value; });
  });
  $('#bufBefore').value = state.rules.bufferBeforeMinutes;
  $('#bufAfter').value  = state.rules.bufferAfterMinutes;
  $('#bufBefore').addEventListener('change',e=>{ state.rules.bufferBeforeMinutes=+e.target.value; });
  $('#bufAfter').addEventListener('change',e=>{ state.rules.bufferAfterMinutes=+e.target.value; });
  $('#maxPerDay').value = state.rules.maxPerDay;
  $('#maxPerDay').addEventListener('change',e=>{ state.rules.maxPerDay=+e.target.value; });
  const durWrap = $('#durations');
  $$('input[type="checkbox"]', durWrap).forEach(c=>{
    c.checked = state.rules.durations.includes(+c.value);
    c.addEventListener('change',()=>{
      const v = +c.value; const set = new Set(state.rules.durations);
      c.checked ? set.add(v) : set.delete(v);
      state.rules.durations = [...set].sort((a,b)=>a-b);
    });
  });
  $('#defaultDuration').value = state.rules.defaultDuration;
  $('#defaultDuration').addEventListener('change',e=>{ state.rules.defaultDuration=+e.target.value; });
}

function renderPreview(){
  const wrap = $('#previewSlots'); wrap.innerHTML='';
  const demo = ['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM'];
  demo.forEach(t=>{
    const b = document.createElement('button');
    b.className='px-3 py-2 rounded-lg border hover:bg-subtle-light'; b.textContent=t;
    wrap.appendChild(b);
  });
}

function bindExceptions(){
  const type = $('#exType'), custom = $('#exCustom');
  type.addEventListener('change',()=> custom.classList.toggle('hidden', type.value!=='custom'));
  $('#addException').addEventListener('click',()=>{
    const date = $('#exDate').value;
    if (!date) return alert('Pick a date');
    if (type.value==='block') {
      state.exceptions.push({date, type:'block'});
    } else {
      const s=$('#exStart').value, e=$('#exEnd').value;
      if (!s || !e) return alert('Enter custom hours');
      state.exceptions.push({date, type:'custom', blocks:[[s,e]]});
    }
    renderExceptions();
  });
}

function renderExceptions(){
  const ul=$('#exList'); ul.innerHTML='';
  state.exceptions.forEach((ex,i)=>{
    const li=document.createElement('li');
    li.className='flex items-center justify-between border rounded px-2 py-1';
    li.innerHTML = `<div><strong>${ex.date}</strong> — ${ex.type==='block'?'Blocked':`Custom: ${ex.blocks.map(b=>b.join('–')).join(', ')}`}</div>
    <button class="px-2 py-1 border rounded remove">Remove</button>`;
    li.querySelector('.remove').addEventListener('click',()=>{ state.exceptions.splice(i,1); renderExceptions(); });
    ul.appendChild(li);
  });
}

async function init(){
  await loadFromAPI();
  $$('.tab').forEach(b=> b.addEventListener('click',()=> showTab(b.dataset.tab)));
  bindWeekly(); renderWeekly();
  bindRules();
  bindExceptions(); renderExceptions();
  renderPreview();
  $('#runTroubleshoot').addEventListener('click', ()=>{
    const date=$('#tsDate').value, time=$('#tsTime').value, dur=$('#tsDuration').value;
    fetch(`/api/slots?userId=${encodeURIComponent(state.userId)}&date=${date}&duration=${dur}`)
      .then(r=>r.json()).then(d=>$('#tsResult').textContent=JSON.stringify(d,null,2))
      .catch(()=>$('#tsResult').textContent='Server error');
  });
  $('#btnSave').addEventListener('click', async ()=>{
    try{ await saveToAPI(); alert('Saved'); }catch(e){ alert('Save failed: '+e.message); }
  });
  $('#btnRevert').addEventListener('click', ()=> location.reload());
}
document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', init) : init();
