/**
 * home.guardrails.spec.js
 * Tests the guardrails features: deduplication and smart uploader positioning
 */
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

async function setupDOM(bodyHtml) {
  const html = `<!DOCTYPE html><html><body>${bodyHtml}</body></html>`;
  const dom = new JSDOM(html, { 
    url: 'http://localhost',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
  global.File = window.File;
  global.Event = window.Event;
  global.localStorage = (function(){
    let s = {};
    return {
      getItem: k => (k in s ? s[k] : null),
      setItem: (k, v) => { s[k] = String(v); },
      removeItem: k => { delete s[k]; },
      clear: () => { s = {}; }
    };
  })();
  
  // Dynamically import the real module
  const { HomeUAT } = await import('../public/js/home-uat.js');
  
  return { dom, window, document: window.document, HomeUAT };
}

describe('Guardrails Features', () => {
  test('dedupeAttachments removes duplicate sections', async () => {
    const html = `
      <div class="flex flex-col gap-6">
        <h2>Attachments</h2>
        <p>Section 1</p>
      </div>
      <div class="flex flex-col gap-6">
        <h2>Attachments</h2>
        <p>Section 2 (duplicate)</p>
      </div>
      <div class="flex flex-col gap-6">
        <h2>Attachments</h2>
        <p>Section 3 (duplicate)</p>
      </div>
    `;
    
    const { HomeUAT } = await setupDOM(html);
    
    // Before: 3 sections
    expect(document.querySelectorAll('h2').length).toBe(3);
    
    // Run deduplication
    HomeUAT.dedupeAttachments();
    
    // After: 1 section (first one kept)
    const remainingSections = Array.from(document.querySelectorAll('h2'))
      .filter(h => h.textContent.trim() === 'Attachments');
    expect(remainingSections.length).toBe(1);
    
    // Verify the first section was kept
    const firstSection = remainingSections[0].closest('.flex.flex-col.gap-6');
    expect(firstSection.textContent).toContain('Section 1');
  });

  test('ensureBottomUploader creates missing upload controls', async () => {
    const html = `
      <div id="test-section" class="flex flex-col gap-6">
        <h2>Test Section</h2>
        <table><tbody id="test-body"></tbody></table>
      </div>
    `;
    
    const { HomeUAT } = await setupDOM(html);
    
    // Before: no upload controls
    expect(document.getElementById('test-link')).toBeNull();
    expect(document.getElementById('test-input')).toBeNull();
    
    // Ensure uploader
    HomeUAT.ensureBottomUploader({
      sectionId: 'test-section',
      linkId: 'test-link',
      inputId: 'test-input',
      accept: '.pdf',
      tbodyId: 'test-body',
      storageKey: 'test.key',
      linkText: 'Add File'
    });
    
    // After: controls exist
    const link = document.getElementById('test-link');
    const input = document.getElementById('test-input');
    
    expect(link).toBeTruthy();
    expect(link.textContent).toBe('Add File');
    expect(input).toBeTruthy();
    expect(input.getAttribute('accept')).toBe('.pdf');
    
    // Verify positioned at bottom
    const wrapper = link.closest('div');
    expect(wrapper.className).toContain('mt-2');
  });

  test('ensureBottomUploader removes duplicate upload links', async () => {
    const html = `
      <div id="test-section" class="flex flex-col gap-6">
        <h2>Test Section</h2>
        <table><tbody id="test-body"></tbody></table>
        <div class="mt-2">
          <a id="test-link" href="#">Old Link 1</a>
          <input id="test-input" type="file"/>
        </div>
        <div class="mt-2">
          <a id="test-link" href="#">Old Link 2 (duplicate)</a>
          <input id="test-input" type="file"/>
        </div>
        <div class="mt-2">
          <a id="test-link" href="#">Old Link 3 (duplicate)</a>
          <input id="test-input" type="file"/>
        </div>
      </div>
    `;
    
    const { HomeUAT } = await setupDOM(html);
    
    // Before: 3 duplicate links
    expect(document.querySelectorAll('#test-link').length).toBe(3);
    
    // Ensure uploader (should clean up duplicates)
    HomeUAT.ensureBottomUploader({
      sectionId: 'test-section',
      linkId: 'test-link',
      inputId: 'test-input',
      accept: '.pdf',
      tbodyId: 'test-body',
      storageKey: 'test.key',
      linkText: 'Add File'
    });
    
    // After: Only 1 link remains (the last one)
    const remainingLinks = document.querySelectorAll('#test-link');
    expect(remainingLinks.length).toBe(1);
    expect(remainingLinks[0].textContent).toContain('Old Link 3');
  });

  test('ensureBottomUploader binds upload handler correctly', async () => {
    const html = `
      <div id="test-section" class="flex flex-col gap-6">
        <table><tbody id="test-body"></tbody></table>
      </div>
    `;
    
    const { HomeUAT } = await setupDOM(html);
    
    // Create uploader
    HomeUAT.ensureBottomUploader({
      sectionId: 'test-section',
      linkId: 'test-link',
      inputId: 'test-input',
      accept: '.pdf',
      tbodyId: 'test-body',
      storageKey: 'oi.test',
      linkText: 'Add File'
    });
    
    const link = document.getElementById('test-link');
    const input = document.getElementById('test-input');
    const tbody = document.getElementById('test-body');
    
    // Mock file
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    Object.defineProperty(input, 'files', { value: [mockFile], writable: false });
    
    // Trigger upload
    input.dispatchEvent(new Event('change'));
    
    // Verify row created
    expect(tbody.querySelectorAll('tr').length).toBe(1);
    
    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem('oi.test'));
    expect(stored.length).toBe(1);
    expect(stored[0].filename).toBe('test.pdf');
  });
});
