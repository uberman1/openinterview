// src/js/editor-page.js
import { store } from './data-store.js';
import { searchAssets, pickAndCreateAsset } from './asset-library.js';

function getParam(name){ const u = new URL(location.href); return u.searchParams.get(name); }
function bindValue(el, getter, setter){ if (!el) return; el.addEventListener('input', ()=>setter(el.value)); el.value = getter() || ''; }
function option(el,v,t){ const o=document.createElement('option'); o.value=v; o.textContent=t; el.appendChild(o); }
function initAssetDropdown(selectEl, type, currentId, onChange){
  if (!selectEl) return;
  selectEl.innerHTML=''; option(selectEl,'',`— Select ${type} —`);
  const assets = searchAssets({type});
  assets.forEach(a=>option(selectEl,a.id,a.name));
  if (currentId) selectEl.value=currentId;
  selectEl.addEventListener('change', ()=>{ const a=assets.find(x=>x.id===selectEl.value); onChange(a||null); });
}

function initAvailabilityBindings(profile){
  const avail = profile.availability || { tz:'America/New_York', dailySlots:{}, exceptions:{}, rules:{ minNotice:120, windowDays:30, inc:30, bufBefore:30, bufAfter:10, maxPerDay:5, durations:[15,30,45], defaultDuration:30 } };
  document.querySelectorAll('#weeklyList .add-block').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const row = btn.closest('[data-day]'); const day = row.getAttribute('data-day');
      const blocks=row.querySelector('.blocks'); const g=document.createElement('div');
      g.className='flex items-center gap-2';
      g.innerHTML=`<input type="time" class="rounded-lg border p-2 start"><span>–</span><input type="time" class="rounded-lg border p-2 end"><button type="button" class="icon-btn remove">×</button>`;
      blocks.appendChild(g); row.querySelector('.empty-note')?.classList.add('hidden');
      const apply=()=>{ const s=g.querySelector('.start').value, e=g.querySelector('.end').value;
        if (s && e){ avail.dailySlots[day]=avail.dailySlots[day]||[]; const key=`${s}-{e}`.replace('{', '').replace('}', ''); if (!avail.dailySlots[day].includes(key)) avail.dailySlots[day].push(key); } };
      g.querySelectorAll('input').forEach(i=>i.addEventListener('change', apply));
      g.querySelector('.remove').addEventListener('click', ()=>{
        const s=g.querySelector('.start').value, e=g.querySelector('.end').value;
        g.remove();
        const arr=avail.dailySlots[day]||[]; const key = `${s}-${e}`;
        avail.dailySlots[day]=arr.filter(x=>x!==key);
        if ((avail.dailySlots[day]||[]).length===0) row.querySelector('.empty-note')?.classList.remove('hidden');
      });
    });
  });
  const tz=document.getElementById('timezone'); if (tz){ tz.value=avail.tz||'America/New_York'; tz.addEventListener('change',()=>avail.tz=tz.value); }
  const setNum=(id,key)=>{ const el=document.getElementById(id); if (!el) return; el.value=String(avail.rules?.[key] ?? 0); el.addEventListener('change',()=> avail.rules[key]=Number(el.value)); };
  setNum('minNotice','minNotice'); setNum('windowDays','windowDays'); setNum('bufBefore','bufBefore'); setNum('bufAfter','bufAfter'); setNum('maxPerDay','maxPerDay');
  const incEls=document.querySelectorAll('input[name="inc"]'); incEls.forEach(r=>{ if (Number(r.value)===Number(avail.rules?.inc||30)) r.checked=true; r.addEventListener('change',()=>{ avail.rules.inc=Number(r.value); }); });
  const dWrap=document.getElementById('durations'); if (dWrap){
    dWrap.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
      if ((avail.rules?.durations||[15,30,45]).includes(Number(cb.value))) cb.checked=true;
      cb.addEventListener('change',()=>{
        const vals=Array.from(dWrap.querySelectorAll('input[type="checkbox"]')).filter(i=>i.checked).map(i=>Number(i.value));
        avail.rules.durations=vals;
      });
    });
  }
  const defDur=document.getElementById('defaultDuration');
  if (defDur){ defDur.value=String(avail.rules?.defaultDuration || 30); defDur.addEventListener('change',()=> avail.rules.defaultDuration=Number(defDur.value)); }
  return ()=>avail;
}

function init(){
  const id = getParam('id'); let profile = id ? store.getProfile({id}) : null; if (!profile) profile = store.createDraftProfile();
  bindValue(document.getElementById('inpName'), ()=>profile.display?.name, v=> profile = store.updateProfile(profile.id, { display:{ name:v } }));
  bindValue(document.getElementById('inpTitle'), ()=>profile.display?.title, v=> profile = store.updateProfile(profile.id, { display:{ title:v } }));
  bindValue(document.getElementById('inpLocation'), ()=>profile.display?.location, v=> profile = store.updateProfile(profile.id, { display:{ location:v } }));
  const bio=document.getElementById('inpBio'); if (bio){ bio.value=profile.display?.summary||''; bio.addEventListener('input', ()=>{ profile = store.updateProfile(profile.id, { display:{ summary: bio.value } }); }); }
  const avatar=document.getElementById('avatarBox'); const btnA=document.getElementById('btnAvatar');
  if (btnA && avatar){ btnA.addEventListener('click', async ()=>{ const a=await pickAndCreateAsset({type:'attachment'}); if (!a) return; avatar.style.backgroundImage=`url("${a.url}")`; profile = store.updateProfile(profile.id, { display:{ avatarUrl:a.url } }); }); if (profile.display?.avatarUrl) avatar.style.backgroundImage=`url("${profile.display.avatarUrl}")`; }

  const resumeUrl=document.getElementById('inpResumeUrl'); const resumeSelect=document.getElementById('resumeSelect');
  const initAssetDropdown2 = (selectEl, type, currentId, onChange) => {
    selectEl.innerHTML=''; const opt=document.createElement('option'); opt.value=''; opt.textContent=`— Select ${type} —`; selectEl.appendChild(opt);
    const assets = searchAssets({type});
    assets.forEach(a=>{ const o=document.createElement('option'); o.value=a.id; o.textContent=a.name; selectEl.appendChild(o); });
    if (currentId) selectEl.value=currentId;
    selectEl.addEventListener('change', ()=>{ const a=assets.find(x=>x.id===selectEl.value); onChange(a||null); });
  };
  initAssetDropdown2(resumeSelect, 'resume', profile.resume?.assetId, (asset)=>{
    if (!asset){ profile = store.updateProfile(profile.id, { resume:{ assetId:null, pdfUrl:'' } }); return; }
    resumeUrl.value = asset.url; profile = store.updateProfile(profile.id, { resume:{ assetId:asset.id, pdfUrl:asset.url } });
  });
  if (profile.resume?.pdfUrl) resumeUrl.value = profile.resume.pdfUrl;
  resumeUrl.addEventListener('change', ()=>{ profile = store.updateProfile(profile.id, { resume:{ pdfUrl: resumeUrl.value } }); });

  const setupAttachment = (inputId, selectId) => {
    const input=document.getElementById(inputId); const sel=document.getElementById(selectId);
    const assets=searchAssets({type:'attachment'});
    sel.innerHTML='<option value="">— Select attachment —</option>'+assets.map(a=>`<option value="${a.id}">${a.name}</option>`).join('');
    sel.addEventListener('change', ()=>{ const a=assets.find(x=>x.id===sel.value); if (!a) return; input.value=a.url; const base=profile.attachments||[]; const exists=base.find(x=>x.assetId===a.id); const next=exists?base:base.concat([{ assetId:a.id, label:a.name, url:a.url }]); profile = store.updateProfile(profile.id, { attachments: next }); });
    input.addEventListener('change', ()=>{ const url=input.value.trim(); if (!url) return; const next=(profile.attachments||[]).concat([{ assetId:null, label:'Link', url }]); profile = store.updateProfile(profile.id, { attachments: next }); });
  };
  setupAttachment('inpPortfolioUrl','portfolioSelect');
  setupAttachment('inpSocialUrl','socialSelect');

  const toggle=document.getElementById('toggleHighlights'); const wrap=document.getElementById('highlightsWrap'); const txt=document.getElementById('inpHighlights');
  if (toggle){ toggle.addEventListener('change', ()=> wrap.classList.toggle('hidden', !toggle.checked)); }
  if (txt){ txt.addEventListener('input', ()=>{ const lines = txt.value.split('\n').map(s=>s.trim()).filter(Boolean); profile = store.updateProfile(profile.id, { display:{ highlights: lines } }); }); }

  const getAvail = initAvailabilityBindings(profile);

  const saveBtn = document.getElementById('btnSaveProfile');
  if (saveBtn){
    saveBtn.addEventListener('click', ()=>{
      const avail = getAvail(); store.updateProfile(profile.id, { availability: avail });
      store.publishProfile(profile.id);
      window.location.href = `/profile/${encodeURIComponent(profile.id)}?justSaved=1`;
    });
  }
}
document.readyState==='loading' ? document.addEventListener('DOMContentLoaded', init) : init();
