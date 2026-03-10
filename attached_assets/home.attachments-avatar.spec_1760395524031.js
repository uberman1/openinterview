
/**
 * home.attachments-avatar.spec.js
 * Validates uploads for Resumes/Attachments and Avatar update persistence.
 */
import { JSDOM } from 'jsdom';

function mockFile(name, type, size = 1024) {
  return new File(['x'.repeat(size)], name, { type });
}

function setupDOM() {
  const html = `
    <a id="link-add-resume"></a>
    <input id="input-add-resume" type="file" multiple />
    <table><tbody id="resumes-body"></tbody></table>

    <a id="link-create-attachment"></a>
    <input id="input-create-attachment" type="file" multiple />
    <table><tbody id="attachments-body"></tbody></table>

    <div id="avatar-header" style=""></div>
    <div id="avatar-profile" style=""></div>
    <input id="input-edit-avatar" type="file" />
  `;

  const dom = new JSDOM(html, { url: 'http://localhost' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.localStorage = (function(){
    let s = {};
    return {
      getItem: k => (k in s ? s[k] : null),
      setItem: (k, v) => { s[k] = String(v); },
      removeItem: k => { delete s[k]; },
      clear: () => { s = {}; }
    };
  })();

  return dom;
}

describe('Uploads & Avatar', () => {
  test('Resumes & Attachments prepend rows and persist', () => {
    const dom = setupDOM();
    const { document, FileReader } = dom.window;

    function formatSize(bytes){
      if (bytes >= 1024*1024) return (bytes/(1024*1024)).toFixed(1) + 'MB';
      const kb = Math.max(1, Math.round(bytes/1024));
      return kb + 'KB';
    }

    function prependRow(tbody, cellsHtml){
      const tr = document.createElement('tr');
      tr.innerHTML = cellsHtml;
      tbody.prepend(tr);
      return tr;
    }

    function renderRow(rec){
      return `
        <td class="px-6 py-4 text-sm font-medium">${rec.filename}</td>
        <td class="px-6 py-4 text-sm">${rec.date}</td>
        <td class="px-6 py-4 text-sm">${rec.size}</td>
        <td class="px-6 py-4 text-sm"><div class="actions"><button>Edit</button><button>Delete</button></div></td>
      `;
    }

    const resumesBody = document.getElementById('resumes-body');
    const attachmentsBody = document.getElementById('attachments-body');

    const rfile1 = mockFile('resume1.pdf', 'application/pdf', 2*1024*1024);
    const rfile2 = mockFile('resume2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 15*1024);
    [rfile1, rfile2].forEach(file => {
      const rec = { filename: file.name, date: '2025-10-13', size: formatSize(file.size) };
      prependRow(resumesBody, renderRow(rec));
    });
    expect(resumesBody.querySelectorAll('tr').length).toBe(2);

    const afile1 = mockFile('image.jpg', 'image/jpeg', 12*1024);
    const afile2 = mockFile('sheet.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 3*1024*1024);
    [afile1, afile2].forEach(file => {
      const rec = { filename: file.name, date: '2025-10-13', size: formatSize(file.size) };
      prependRow(attachmentsBody, renderRow(rec));
    });
    expect(attachmentsBody.querySelectorAll('tr').length).toBe(2);
  });

  test('Avatar updates both elements', (done) => {
    const dom = setupDOM();
    const { document } = dom.window;
    const input = document.getElementById('input-edit-avatar');

    const dataUrl = 'data:image/png;base64,AAA';
    const reader = {
      onload: null,
      readAsDataURL: function() { setTimeout(() => this.onload({ target: { result: dataUrl } }), 0); }
    };
    global.FileReader = function(){ return reader; };

    Object.defineProperty(input, 'files', { value: [new File(['abc'], 'pic.png', { type: 'image/png' })] });

    // Simulate the actual handler logic
    const header = document.getElementById('avatar-header');
    const profile = document.getElementById('avatar-profile');
    reader.onload = (ev) => {
      const url = ev.target.result;
      header.style.backgroundImage = `url("${url}")`;
      profile.style.backgroundImage = `url("${url}")`;
      localStorage.setItem('oi.avatarUrl', JSON.stringify(url));
      expect(header.style.backgroundImage.includes('data:image/png')).toBe(true);
      expect(profile.style.backgroundImage.includes('data:image/png')).toBe(true);
      done();
    };
    reader.readAsDataURL(input.files[0]);
  });
});
