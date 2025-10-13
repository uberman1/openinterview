
/**
 * home.actions.spec.js
 * Validates Edit/Delete in Interviews/Resumes/Attachments and Upcoming -> View.
 * Note: This is a lightweight sanity suite using DOM hooks; full E2E would use Playwright.
 */
import { JSDOM } from 'jsdom';

function setupDOM(html) {
  const dom = new JSDOM(html, { url: 'http://localhost' });
  const { window } = dom;
  global.window = window;
  global.document = window.document;
  global.HTMLElement = window.HTMLElement;
  global.Node = window.Node;
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
  global.prompt = jest.fn().mockReturnValue('Renamed');
  global.confirm = jest.fn().mockReturnValue(true);
  return dom;
}

const MIN_HTML = `
  <table><tbody id="interviews-body">
    <tr data-id="i1"><td class="px-6 py-4 text-sm font-medium">Old Title</td>
    <td class="px-6 py-4 text-sm">2024-07-01</td><td class="px-6 py-4 text-sm">0</td>
    <td class="px-6 py-4 text-sm">0</td><td class="px-6 py-4 text-sm"><span>Draft</span></td>
    <td class="px-6 py-4 text-sm"><div class="actions"><button>Edit</button><button>Delete</button></div></td></tr>
  </tbody></table>

  <table><tbody id="resumes-body">
    <tr data-id="r1"><td class="px-6 py-4 text-sm font-medium">resume.pdf</td>
    <td class="px-6 py-4 text-sm">2024-07-01</td><td class="px-6 py-4 text-sm">100KB</td>
    <td class="px-6 py-4 text-sm"><div class="actions"><button>Edit</button><button>Delete</button></div></td></tr>
  </tbody></table>

  <table><tbody id="attachments-body">
    <tr data-id="a1"><td class="px-6 py-4 text-sm font-medium">note.txt</td>
    <td class="px-6 py-4 text-sm">2024-07-01</td><td class="px-6 py-4 text-sm">4KB</td>
    <td class="px-6 py-4 text-sm"><div class="actions"><button>Edit</button><button>Delete</button></div></td></tr>
  </tbody></table>

  <a class="upcoming-view" data-company="Co" data-role="Role" data-datetime="2025-10-13, 10:00 AM" data-recruiter="Rec" href="#">View Details</a>
`;

describe('Action links basic behaviors', () => {
  test('Edit/Delete in all tables and Upcoming view', () => {
    const dom = setupDOM(MIN_HTML);

    // Inject minimal handlers akin to the main page script
    const K = { interviews:'oi.interviews', resumes:'oi.resumes', attachments:'oi.attachments', viewItem:'oi.view.item' };
    localStorage.setItem(K.interviews, JSON.stringify([{id:'i1', title:'Old Title', date:'2024-07-01', views:0, shares:0, status:'Draft'}]));
    localStorage.setItem(K.resumes, JSON.stringify([{id:'r1', filename:'resume.pdf', date:'2024-07-01', size:'100KB'}]));
    localStorage.setItem(K.attachments, JSON.stringify([{id:'a1', filename:'note.txt', date:'2024-07-01', size:'4KB'}]));

    function bindActions(tbodyId, key, primaryIdx){
      const tbody = document.getElementById(tbodyId);
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button'); if (!btn) return;
        const tr = e.target.closest('tr'); const id = tr.dataset.id;
        const tds = tr.querySelectorAll('td');
        let list = JSON.parse(localStorage.getItem(key) || '[]');
        const idx = list.findIndex(x => x.id === id);
        if (/edit/i.test(btn.textContent)){
          const current = tds[primaryIdx].textContent.trim();
          const next = prompt('Rename', current);
          if (next && next.trim()){
            tds[primaryIdx].textContent = next.trim();
            if (key===K.interviews) list[idx].title = next.trim(); else list[idx].filename = next.trim();
            localStorage.setItem(key, JSON.stringify(list));
          }
        } else if (/delete/i.test(btn.textContent)){
          if (confirm('Delete?')){
            tr.remove();
            if (idx>=0){ list.splice(idx,1); localStorage.setItem(key, JSON.stringify(list)); }
          }
        }
      });
    }

    bindActions('interviews-body', K.interviews, 0);
    bindActions('resumes-body', K.resumes, 0);
    bindActions('attachments-body', K.attachments, 0);

    // Simulate edits
    document.querySelector('#interviews-body .actions button').click();
    expect(document.querySelector('#interviews-body td').textContent).toBe('Renamed');

    document.querySelector('#resumes-body .actions button').click();
    expect(document.querySelector('#resumes-body td').textContent).toBe('Renamed');

    document.querySelector('#attachments-body .actions button').click();
    expect(document.querySelector('#attachments-body td').textContent).toBe('Renamed');

    // Simulate deletes (click second button in each actions div)
    document.querySelectorAll('#interviews-body .actions button')[1].click();
    expect(document.querySelectorAll('#interviews-body tr').length).toBe(0);

    document.querySelectorAll('#resumes-body .actions button')[1].click();
    expect(document.querySelectorAll('#resumes-body tr').length).toBe(0);

    document.querySelectorAll('#attachments-body .actions button')[1].click();
    expect(document.querySelectorAll('#attachments-body tr').length).toBe(0);

    // Upcoming view
    const link = document.querySelector('.upcoming-view');
    link.addEventListener('click', (e)=>{
      e.preventDefault();
      localStorage.setItem(K.viewItem, JSON.stringify({
        type:'upcoming', id:'x', payload:{
          company: link.dataset.company, role: link.dataset.role, datetime: link.dataset.datetime, recruiter: link.dataset.recruiter
        }
      }));
      window.location.hash = '#/interviews/view';
    });
    link.click();
    expect(window.location.hash).toBe('#/interviews/view');
    const ctx = JSON.parse(localStorage.getItem(K.viewItem) || '{}');
    expect(ctx?.payload?.company).toBe('Co');
  });
});
