// /js/profile_edit.autopop.bind.js
// Phase 2: Resume auto-populate wiring with client-side mock (no backend required).
// Relies on existing data-store.js APIs in this codebase.

import { store } from '/js/data-store.js';

(function initAutoPopulate() {
  const section = document.querySelector('#resume-import-section');
  if (!section) return;

  const profileId = new URL(location.href).searchParams.get('id');
  if (!profileId) {
    console.warn('[auto-populate] No ?id= profile id found in URL.');
  }

  const selectEl = section.querySelector('select.form-select');
  const fileInput = section.querySelector('input[type="file"]');
  const browseLabel = section.querySelector('label input[type="file"]')?.closest('label');

  // Helper toasts (minimal, non-blocking)
  const toast = (msg) => {
    console.log('[auto-populate]', msg);
  };

  // Populate dropdown from assets
  async function hydrateDropdown() {
    try {
      const assets = await store.listAssets?.({ type: 'resume', profileId }) ?? [];
      // Clear options then rebuild
      selectEl.innerHTML = '';
      const optDefault = document.createElement('option');
      optDefault.value = '';
      optDefault.textContent = 'Select a resume';
      selectEl.appendChild(optDefault);

      for (const a of assets) {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = a.name || a.fileName || a.id;
        selectEl.appendChild(opt);
      }

      const optAdd = document.createElement('option');
      optAdd.value = 'add_new';
      optAdd.textContent = '-- Add new resume --';
      selectEl.appendChild(optAdd);
    } catch (e) {
      console.error('[auto-populate] Failed to list assets', e);
    }
  }

  // Apply parsed data to fields and persist into profile
  async function applyParsedData(assetId, data) {
    try {
      const contact = data?.contact || {};
      const bioShort = data?.bioShort || '';
      const highlights = Array.isArray(data?.highlights) ? data.highlights : [];

      // Update visible fields
      setVal("#contact-bio-section input[placeholder='City, Country']", contact.location);
      setVal("#contact-bio-section input[placeholder='e.g. +1 234 567 890']", contact.phone);
      setVal("#contact-bio-section input[placeholder='your.email@example.com']", contact.email);
      setVal("#contact-bio-section textarea", bioShort);
      setVal("#highlights-section textarea", highlights.join('\n'));

      // Persist to profile - CRITICAL: use display.* structure
      const prof = await store.getProfile?.({ id: profileId });
      if (!prof) {
        console.error('[auto-populate] Profile not found:', profileId);
        return;
      }

      const patch = {
        display: {
          ...(prof.display || {}),
          location: contact.location || prof.display?.location || '',
          phone: contact.phone || prof.display?.phone || '',
          email: contact.email || prof.display?.email || '',
          summary: bioShort || prof.display?.summary || '',
          highlights: highlights.length ? highlights : (prof.display?.highlights || [])
        },
        resume: {
          ...(prof.resume || {}),
          assetId: assetId
        }
      };
      
      const updated = await store.updateProfile?.(profileId, patch);
      console.log('[auto-populate] Profile updated:', updated);

      // Emit event for tests/observers
      window.dispatchEvent(new CustomEvent('resume:auto-populate:applied', {
        detail: {
          assetId,
          fieldsApplied: [
            contact.location && 'location',
            contact.phone && 'phone',
            contact.email && 'email',
            bioShort && 'summary',
            highlights.length && 'highlights',
            'resumeAssetId'
          ].filter(Boolean)
        }
      }));
      toast('Auto-populate applied.');
    } catch (e) {
      console.error('[auto-populate] Failed to apply parsed data', e);
    }
  }

  // Minimal "mock GPT" fetch — served as a static JSON fixture
  async function parseResumeMock(assetId) {
    window.dispatchEvent(new CustomEvent('resume:auto-populate-requested', { detail: { assetId } }));
    toast('Analyzing resume…');
    const res = await fetch('/fixtures/resume_parse_fixture.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Fixture not found');
    const payload = await res.json();
    return payload;
  }

  // Helpers
  function setVal(selector, value) {
    if (!value) return;
    const el = document.querySelector(selector);
    if (el) el.value = value;
  }

  async function onSelectChange(e) {
    const v = e.target.value;
    if (v === 'add_new') {
      fileInput?.click();
      return;
    }
    if (!v) return;
    try {
      const data = await parseResumeMock(v);
      await applyParsedData(v, data);
    } catch (err) {
      console.error('[auto-populate] parse failed', err);
      toast('Could not analyze resume.');
    }
  }

  async function onFileChosen(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const asset = await store.createAsset?.({ name: file.name, url: '#' }, {
        type: 'resume',
        name: file.name
      });
      // Insert/select new option
      const opt = document.createElement('option');
      opt.value = asset.id;
      opt.textContent = asset.name || file.name;
      selectEl.insertBefore(opt, selectEl.querySelector('option[value="add_new"]'));
      selectEl.value = asset.id;

      const data = await parseResumeMock(asset.id);
      await applyParsedData(asset.id, data);
    } catch (err) {
      console.error('[auto-populate] upload/register failed', err);
      toast('Upload failed.');
    } finally {
      e.target.value = ''; // reset file input
    }
  }

  // Wire up
  hydrateDropdown();
  selectEl?.addEventListener('change', onSelectChange);
  fileInput?.addEventListener('change', onFileChosen);
  // Clicking "Browse" label focuses hidden file input (native)
})();
