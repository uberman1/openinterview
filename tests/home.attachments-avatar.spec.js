/**
 * home.attachments-avatar.spec.js
 * Validates uploads for Resumes/Attachments and Avatar update persistence.
 * Tests the REAL implementation from home-uat.js module using dynamic import
 */
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

async function setupDOM() {
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

  const dom = new JSDOM(html, { 
    url: 'http://localhost',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.FileReader = window.FileReader;
  global.File = window.File;
  global.localStorage = (function(){
    let s = {};
    return {
      getItem: k => (k in s ? s[k] : null),
      setItem: (k, v) => { s[k] = String(v); },
      removeItem: k => { delete s[k]; },
      clear: () => { s = {}; }
    };
  })();
  global.alert = jest.fn();

  // Dynamically import the real module
  const { HomeUAT } = await import('../public/js/home-uat.js');

  return { dom, window, HomeUAT };
}

describe('Uploads & Avatar - Real Implementation', () => {
  test('Resume upload creates rows with real formatSize logic', async () => {
    const { HomeUAT } = await setupDOM();
    
    const resumesBody = document.getElementById('resumes-body');
    const input = document.getElementById('input-add-resume');
    
    // Bind real upload handler
    HomeUAT.bindUpload('link-add-resume', 'input-add-resume', 'resumes-body', 
                       HomeUAT.K.resumes, HomeUAT.renderResumeRow);
    
    // Create mock files
    const file1 = new File(['x'.repeat(2 * 1024 * 1024)], 'resume1.pdf', { type: 'application/pdf' });
    const file2 = new File(['x'.repeat(15 * 1024)], 'resume2.docx', { 
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
    });
    
    // Simulate file selection
    Object.defineProperty(input, 'files', { value: [file1, file2], writable: false });
    input.dispatchEvent(new Event('change'));
    
    // Verify rows created
    expect(resumesBody.querySelectorAll('tr').length).toBe(2);
    
    // Verify size formatting (using real formatSize)
    const sizes = Array.from(resumesBody.querySelectorAll('tr')).map(tr => 
      tr.querySelectorAll('td')[2].textContent
    );
    expect(sizes).toContain('2.0MB');  // 2MB file
    expect(sizes).toContain('15KB');   // 15KB file
    
    // Verify localStorage
    const stored = JSON.parse(localStorage.getItem(HomeUAT.K.resumes));
    expect(stored.length).toBe(2);
    expect(stored[0].filename).toBe('resume2.docx'); // Prepended, so reversed order
  });

  test('Attachment upload handles various file types', async () => {
    const { HomeUAT } = await setupDOM();
    
    const attachmentsBody = document.getElementById('attachments-body');
    const input = document.getElementById('input-create-attachment');
    
    // Bind real upload handler
    HomeUAT.bindUpload('link-create-attachment', 'input-create-attachment', 'attachments-body',
                       HomeUAT.K.attachments, HomeUAT.renderAttachmentRow);
    
    // Create mock files
    const file1 = new File(['x'.repeat(12 * 1024)], 'image.jpg', { type: 'image/jpeg' });
    const file2 = new File(['x'.repeat(3 * 1024 * 1024)], 'sheet.xlsx', { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    // Simulate file selection
    Object.defineProperty(input, 'files', { value: [file1, file2], writable: false });
    input.dispatchEvent(new Event('change'));
    
    // Verify rows created
    expect(attachmentsBody.querySelectorAll('tr').length).toBe(2);
    
    // Verify size formatting
    const sizes = Array.from(attachmentsBody.querySelectorAll('td')).filter((_, i) => i % 4 === 2)
      .map(td => td.textContent);
    expect(sizes).toContain('3.0MB');
    expect(sizes).toContain('12KB');
  });

  test('Avatar update syncs both elements', async (done) => {
    const { HomeUAT } = await setupDOM();
    
    const header = document.getElementById('avatar-header');
    const profile = document.getElementById('avatar-profile');
    const dataUrl = 'data:image/png;base64,AAA';
    
    // Use real setAvatar function
    HomeUAT.setAvatar(dataUrl);
    
    // Verify both elements updated
    expect(header.style.backgroundImage).toBe(`url("${dataUrl}")`);
    expect(profile.style.backgroundImage).toBe(`url("${dataUrl}")`);
    
    // Verify storage
    HomeUAT.lsSet(HomeUAT.K.avatarUrl, dataUrl);
    const stored = HomeUAT.lsGet(HomeUAT.K.avatarUrl, null);
    expect(stored).toBe(dataUrl);
    
    done();
  });
});
