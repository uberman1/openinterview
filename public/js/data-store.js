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
      display: {
        name: 'Ethan Carter',
        title: 'Senior Product Designer',
        location: 'San Francisco, CA',
        summary: 'Experienced product designer with a passion for creating intuitive and impactful user experiences.',
        avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBOyBBUWv-aZFP72bm6P1T0ooUqEElaCh-Z96b7war0IQSiII9PCL1cbQ3i46GqnnWPy4YZtRhZ8FfYw8hdnctP4i1UtYTsDYv8cqwt99zRPuo-o0W4JsZ6LYMBJxzjLzZmN94uXVV8j3h5eatY5GgIacHoEHFgW16iTY1_ddWTvBf8uRGO0-5FbIqgtP1XbJZJ-IgkJYlcTkQdKghrCgOQ9uZ9Hm36hxOzOFQWoM4BoLGXCCdnZYsLl12-E-VKce8Z3uml36Ei8c4',
        video: {
          posterUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCEWkqe3829dlPRN9mSVzmsZ29jFNPCEOdez7552lK-y6ncfxZmA91LJ14PEn7AAw59d27yP2QM0D1UxMBk_EJMkwX4qWEKei2CtS3cyy0SLxC6WUdmXvTORyfCdUB7dY-ittZ_3R_l4QuPX7Fn_tsJvl8AyxulVN84Z5AWgnrK2M3CLJC0k7nqFap67TqL24MZcrBimP27aaOaOZoPSU-bnBbwNaGnDklaOW-LVlT96Jh8144TEiIUVAtF6JDaaxUPwoAyi3f3Obk',
          sourceUrl: ''
        },
        highlights: [
          '5+ years of experience in product design',
          'Strong portfolio showcasing user-centered design',
          'Excellent communication and collaboration skills'
        ]
      },
      resume: { assetId: null, pdfUrl: '/files/resume.pdf', pageCount: 1 },
      attachments: [],
      availability: { tz: 'America/New_York', dailySlots: {}, exceptions: {} },
      share: { publicUrl: null, slug: null, lastSharedAt: null }
    };
    this._write(`profiles:${id}`, profile);
    const idx = this._idx();
    if (!idx.includes(id)) { idx.unshift(id); this._saveIdx(idx); }
    return profile;
  },

  getProfile({id, slug} = {}){
    if (id){
      return this._read(`profiles:${id}`, null);
    }
    if (slug){
      const ids = this._idx();
      for (const pid of ids) {
        const p = this._read(`profiles:${pid}`, null);
        if (p?.share?.slug === slug) return p;
      }
    }
    return null;
  },

  updateProfile(id, patch){
    const p = this.getProfile({id});
    if (!p) return null;
    const merged = structuredClone(p);
    if (patch.display) merged.display = { ...merged.display, ...patch.display };
    if (patch.resume) merged.resume = { ...merged.resume, ...patch.resume };
    if (patch.availability) merged.availability = { ...merged.availability, ...patch.availability };
    if (patch.attachments) merged.attachments = patch.attachments;
    if (patch.share) merged.share = { ...merged.share, ...patch.share };
    for (const [k,v] of Object.entries(patch)) {
      if (!['display','resume','availability','attachments','share'].includes(k)) merged[k] = v;
    }
    merged.updatedAt = new Date().toISOString();
    this._write(`profiles:${id}`, merged);
    return merged;
  },

  publishProfile(id){
    const p = this.getProfile({id});
    if (!p) throw new Error('Profile not found');
    const name = p.display?.name ?? 'profile';
    const title = p.display?.title ?? '';
    const slugBase = `${name}-${title}`.trim() || 'profile';
    const slug = `${this._slugify(slugBase).slice(0,64)}-${id.slice(-4)}`;
    const pub = this.updateProfile(id, {
      status:'live',
      share: { publicUrl: `/p/${slug}`, slug }
    });
    const idx = this._idx();
    const pos = idx.indexOf(id);
    if (pos > 0){ idx.splice(pos,1); idx.unshift(id); this._saveIdx(idx); }
    return pub;
  },

  listProfiles(){
    return this._idx().map(id => this._read(`profiles:${id}`, null)).filter(Boolean);
  },

  async syncAssetsFromAPI(){
    try {
      const response = await fetch('/api/v1/assets');
      if (!response.ok) return;
      const assets = await response.json();
      const ids = assets.map(a => a.id);
      this._saveAssets(ids);
      assets.forEach(a => this._write(`assets:${a.id}`, a));
    } catch (err) {
      console.warn('Failed to sync assets from API:', err);
    }
  },

  listAssets({type=null, q=''}={}){
    const ids = this._assets();
    let assets = ids.map(id => this._read(`assets:${id}`, null)).filter(Boolean);
    if (type) assets = assets.filter(a => a.type === type);
    if (q) {
      const qq = q.toLowerCase();
      assets = assets.filter(a => (a.name||'').toLowerCase().includes(qq) || (a.tags||[]).join(' ').toLowerCase().includes(qq));
    }
    return assets;
  },

  async createAsset(fileMeta={}, {type, name=null, tags=[]}={}){
    const id = this._id(type === 'resume' ? 'asset_res' : 'asset_att');
    const asset = {
      id, type,
      name: name || fileMeta.name || `${type}-${id}`,
      url: fileMeta.url || '',
      uploadedAt: new Date().toISOString(),
      ownerUserId: 'me',
      tags
    };
    
    // Save to localStorage immediately for UI
    this._write(`assets:${id}`, asset);
    const idx = this._assets();
    if (!idx.includes(id)) { idx.unshift(id); this._saveAssets(idx); }
    
    // Sync to API in background
    try {
      const response = await fetch('/api/v1/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asset)
      });
      if (response.ok) {
        const savedAsset = await response.json();
        this._write(`assets:${savedAsset.id}`, savedAsset);
      }
    } catch (err) {
      console.warn('Failed to sync asset to API:', err);
    }
    
    return asset;
  },

  async deleteAsset(id){
    // Remove from localStorage
    const idx = this._assets();
    const pos = idx.indexOf(id);
    if (pos >= 0) {
      idx.splice(pos, 1);
      this._saveAssets(idx);
    }
    localStorage.removeItem(this._k(`assets:${id}`));
    
    // Delete from API
    try {
      await fetch(`/api/v1/assets/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Failed to delete asset from API:', err);
    }
  }
};
