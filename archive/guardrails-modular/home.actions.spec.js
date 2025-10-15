/**
 * home.actions.spec.js
 * Validates Edit/Delete in Interviews/Resumes/Attachments and Upcoming -> View.
 * Tests the REAL implementation from home-uat.js module using dynamic import
 */
import { jest } from '@jest/globals';
import { JSDOM } from 'jsdom';

async function setupDOM(html) {
  const dom = new JSDOM(html, { 
    url: 'http://localhost',
    runScripts: 'outside-only'
  });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
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
  global.prompt = jest.fn();
  global.confirm = jest.fn();
  global.location = { hash: '' };
  
  // Dynamically import the real module
  const { HomeUAT } = await import('../public/js/home-uat.js');
  
  return { dom, window, HomeUAT };
}

const TEST_HTML = `
  <table><tbody id="interviews-body">
    <tr data-id="i1">
      <td class="px-6 py-4 text-sm font-medium">Old Title</td>
      <td class="px-6 py-4 text-sm">2024-07-01</td>
      <td class="px-6 py-4 text-sm">0</td>
      <td class="px-6 py-4 text-sm">0</td>
      <td class="px-6 py-4 text-sm"><span>Draft</span></td>
      <td class="px-6 py-4 text-sm">
        <div class="actions">
          <button>Edit</button>
          <button>Delete</button>
        </div>
      </td>
    </tr>
  </tbody></table>

  <table><tbody id="resumes-body">
    <tr data-id="r1">
      <td class="px-6 py-4 text-sm font-medium">resume.pdf</td>
      <td class="px-6 py-4 text-sm">2024-07-01</td>
      <td class="px-6 py-4 text-sm">100KB</td>
      <td class="px-6 py-4 text-sm">
        <div class="actions">
          <button>Edit</button>
          <button>Delete</button>
        </div>
      </td>
    </tr>
  </tbody></table>

  <table><tbody id="attachments-body">
    <tr data-id="a1">
      <td class="px-6 py-4 text-sm font-medium">note.txt</td>
      <td class="px-6 py-4 text-sm">2024-07-01</td>
      <td class="px-6 py-4 text-sm">4KB</td>
      <td class="px-6 py-4 text-sm">
        <div class="actions">
          <button>Edit</button>
          <button>Delete</button>
        </div>
      </td>
    </tr>
  </tbody></table>

  <a class="upcoming-view" data-company="Co" data-role="Role" 
     data-datetime="2025-10-13, 10:00 AM" data-recruiter="Rec" href="#">View Details</a>
`;

describe('Action links - Real Implementation', () => {
  test('Edit action renames items using real module', async () => {
    const { HomeUAT } = await setupDOM(TEST_HTML);
    global.prompt.mockReturnValue('Renamed Title');
    
    // Initialize storage
    localStorage.setItem(HomeUAT.K.interviews, JSON.stringify([
      {id:'i1', title:'Old Title', date:'2024-07-01', views:0, shares:0, status:'Draft'}
    ]));
    
    // Bind real actions handler
    HomeUAT.bindActions('interviews-body', HomeUAT.K.interviews, 0);
    
    // Simulate edit click
    const editBtn = document.querySelector('#interviews-body .actions button');
    editBtn.click();
    
    // Verify DOM updated
    expect(document.querySelector('#interviews-body td').textContent).toBe('Renamed Title');
    
    // Verify localStorage updated
    const stored = JSON.parse(localStorage.getItem(HomeUAT.K.interviews));
    expect(stored[0].title).toBe('Renamed Title');
  });

  test('Delete action removes items using real module', async () => {
    const { HomeUAT } = await setupDOM(TEST_HTML);
    global.confirm.mockReturnValue(true);
    
    // Initialize storage
    localStorage.setItem(HomeUAT.K.resumes, JSON.stringify([
      {id:'r1', filename:'resume.pdf', date:'2024-07-01', size:'100KB'}
    ]));
    
    // Bind real actions handler
    HomeUAT.bindActions('resumes-body', HomeUAT.K.resumes, 0);
    
    // Simulate delete click (second button)
    const deleteBtn = document.querySelectorAll('#resumes-body .actions button')[1];
    deleteBtn.click();
    
    // Verify DOM row removed
    expect(document.querySelectorAll('#resumes-body tr').length).toBe(0);
    
    // Verify localStorage updated
    const stored = JSON.parse(localStorage.getItem(HomeUAT.K.resumes));
    expect(stored.length).toBe(0);
  });

  test('View Details navigates and stores context using real bindUpcomingView', async () => {
    const { HomeUAT } = await setupDOM(TEST_HTML);
    
    // Bind real upcoming view handler from module
    HomeUAT.bindUpcomingView();
    
    // Simulate click on the view link
    const link = document.querySelector('.upcoming-view');
    link.click();
    
    // Verify navigation
    expect(location.hash).toBe('#/interviews/view');
    
    // Verify context stored using real implementation
    const ctx = HomeUAT.lsGet(HomeUAT.K.viewItem, {});
    expect(ctx.type).toBe('upcoming');
    expect(ctx.payload.company).toBe('Co');
    expect(ctx.payload.role).toBe('Role');
    expect(ctx.payload.datetime).toBe('2025-10-13, 10:00 AM');
    expect(ctx.payload.recruiter).toBe('Rec');
  });
});
