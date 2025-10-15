
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.join(process.cwd(), 'home.html'), 'utf8');
const script = fs.readFileSync(path.join(process.cwd(), 'js/home-guardrails.js'), 'utf8');

function boot() {
  const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost" });
  const { window } = dom;
  Object.defineProperty(window, 'localStorage', {
    value: (() => { let s={}; return {
      getItem:k=>(k in s?s[k]:null), setItem:(k,v)=>{s[k]=String(v)}, removeItem:(k)=>{delete s[k]}, clear:()=>{s={}}
    }; })()
  });
  const tag = window.document.createElement('script');
  tag.textContent = script;
  window.document.body.appendChild(tag);
  return dom;
}

describe('Guardrails', () => {
  test('single attachments section; bottom link exists', () => {
    const dom = boot();
    const { document } = dom.window;
    const attachmentsHeaders = Array.from(document.querySelectorAll('h2')).filter(h=>h.textContent.trim()==='Attachments');
    expect(attachmentsHeaders.length).toBe(1);
    const link = document.getElementById('link-create-attachment');
    expect(link).toBeTruthy();
    expect(link.closest('div').className).toContain('mt-2');
  });

  test('resumes bottom link exists', () => {
    const dom = boot();
    const { document } = dom.window;
    const link = document.getElementById('link-add-resume');
    expect(link).toBeTruthy();
    expect(link.closest('div').className).toContain('mt-2');
  });

  test('avatar hydration works', () => {
    const dom = boot();
    const { document, localStorage } = dom.window;
    localStorage.setItem('oi.avatarUrl', 'data:image/png;base64,TEST');
    const s2 = document.createElement('script');
    s2.textContent = document.querySelectorAll('script')[document.querySelectorAll('script').length-1].textContent;
    document.body.appendChild(s2);
    expect(document.getElementById('avatar-header').style.backgroundImage).toContain('data:image');
    expect(document.getElementById('avatar-profile').style.backgroundImage).toContain('data:image');
  });
});
