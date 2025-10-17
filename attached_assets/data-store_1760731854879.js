// src/js/data-store.js
export const store = {
  _k(k){ return `oi:${k}`; },
  _read(k, def){ try{ return JSON.parse(localStorage.getItem(this._k(k))) ?? def; }catch{ return def; } },
  _write(k, v){ localStorage.setItem(this._k(k), JSON.stringify(v)); },
  _idx(){ return this._read('profiles:index', []); },
  _saveIdx(arr){ this._write('profiles:index', arr); },
  _assets(){ return this._read('assets:index', []); },
  _saveAssets(arr){ this._write('assets:index', arr); },
  _id(prefix){ return `${prefix}_${Math.random().toString(36).slice(2,8)}${Date.now().toString(36).slice(-4)}`; },
  _slugify(s){ return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); },
  createDraftProfile(){
    const id = this._id('prof');
    const now = new Date().toISOString();
    const profile = {
      id, status:'draft', createdAt: now, updatedAt: now, ownerUserId: 'me',
      display: { name:'', title:'', location:'', summary:'', avatarUrl:'', video:{posterUrl:'',sourceUrl:''}, highlights:[] },
      resume: { assetId: null, pdfUrl: '', pageCount: 0 },
      attachments: [],
      availability: { tz:'America/New_York', dailySlots:{}, exceptions:{}, rules:{ minNotice:120, windowDays:30, inc:30, bufBefore:30, bufAfter:10, maxPerDay:5, durations:[15,30,45], defaultDuration:30 } },
      share: { publicUrl:null, slug:null, lastSharedAt:null }
    };
    this._write(`profiles:${id}`, profile);
    const idx = this._idx(); if (!idx.includes(id)) { idx.unshift(id); this._saveIdx(idx); }
    return profile;
  },
  getProfile({id, slug} = {}){
    if (id) return this._read(`profiles:${id}`, null);
    if (slug){
      const ids = this._idx();
      for (const pid of ids){ const p = this._read(`profiles:${pid}`, null); if (p?.share?.slug === slug) return p; }
    }
    return null;
  },
  updateProfile(id, patch){
    const p = this.getProfile({id}); if (!p) return null;
    const merged = structuredClone(p);
    const deepMerge = (t, s) => { for (const [k,v] of Object.entries(s)){ if (v && typeof v==='object' && !Array.isArray(v)) t[k]=deepMerge(t[k]||{}, v); else t[k]=v; } return t; };
    deepMerge(merged, patch);
    merged.updatedAt = new Date().toISOString();
    this._write(`profiles:${id}`, merged); return merged;
  },
  publishProfile(id){
    const p = this.getProfile({id}); if (!p) throw new Error('Profile not found');
    const name = (p.display?.name || 'profile').trim(); const title = (p.display?.title || '').trim();
    const slugBase = `${name}-${title}`.trim() || 'profile';
    const slug = `${this._slugify(slugBase).slice(0,64)}-${id.slice(-4)}`;
    const pub = this.updateProfile(id, { status:'live', share:{ publicUrl:`/p/${slug}`, slug } });
    const idx = this._idx(); const pos = idx.indexOf(id); if (pos > 0){ idx.splice(pos,1); idx.unshift(id); this._saveIdx(idx); }
    return pub;
  },
  listProfiles(){ return this._idx().map(id => this._read(`profiles:${id}`, null)).filter(Boolean); },
  listAssets({type=null, q=''}={}){
    const ids = this._assets();
    let assets = ids.map(id => this._read(`assets:${id}`, null)).filter(Boolean);
    if (type) assets = assets.filter(a => a.type === type);
    if (q){ const qq = q.toLowerCase(); assets = assets.filter(a => (a.name||'').toLowerCase().includes(qq) || (a.tags||[]).join(' ').toLowerCase().includes(qq)); }
    return assets;
  },
  createAsset(fileMeta={}, {type, name=null, tags=[]}={}){
    const id = this._id(type === 'resume' ? 'asset_res' : 'asset_att');
    const asset = { id, type, name: name || fileMeta.name || `${type}-${id}`, url: fileMeta.url || '', uploadedAt: new Date().toISOString(), ownerUserId:'me', tags };
    this._write(`assets:${id}`, asset);
    const idx = this._assets(); if (!idx.includes(id)) { idx.unshift(id); this._saveAssets(idx); }
    return asset;
  }
};
