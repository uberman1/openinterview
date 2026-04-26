(function () {
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $all(sel, ctx=document){ return Array.from(ctx.querySelectorAll(sel)); }

  function getActionsStyle() {
    const th = $all('th').find(el => el.textContent.trim().toLowerCase() === 'actions');
    const base = { fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: '500', lineHeight: '1.25rem', color: '#000' };
    if (!th) return base;
    const cs = getComputedStyle(th);
    return {
      fontFamily: cs.fontFamily || base.fontFamily,
      fontSize: cs.fontSize || base.fontSize,
      fontWeight: cs.fontWeight || base.fontWeight,
      lineHeight: cs.lineHeight || base.lineHeight,
      color: '#000'
    };
  }

  function insertLinkBar(headingText, linkText, onClick) {
    const h2 = $all('h1, h2, h3').find(h => h.textContent.trim().toLowerCase() === headingText.toLowerCase());
    if (!h2) return;
    const dupId = `section-link-${headingText.toLowerCase().replace(/\s+/g,'-')}`;
    if (document.getElementById(dupId)) return;
    const bar = document.createElement('div');
    bar.style.display = 'flex';
    bar.style.justifyContent = 'flex-end';
    bar.style.alignItems = 'center';
    bar.style.marginTop = '4px';
    bar.style.marginBottom = '6px';
    const a = document.createElement('a');
    a.id = dupId;
    a.href = '#';
    a.textContent = linkText;
    const style = getActionsStyle();
    a.style.fontFamily = style.fontFamily;
    a.style.fontSize = style.fontSize;
    a.style.fontWeight = style.fontWeight;
    a.style.lineHeight = style.lineHeight;
    a.style.color = style.color;
    a.style.textDecoration = 'none';
    a.addEventListener('mouseenter', () => a.style.textDecoration = 'underline');
    a.addEventListener('mouseleave', () => a.style.textDecoration = 'none');
    a.addEventListener('click', (e) => { e.preventDefault(); onClick?.(); });
    bar.appendChild(a);
    h2.insertAdjacentElement('afterend', bar);
  }

  function ensureHiddenFileInput(id) {
    let input = document.getElementById(id);
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = id;
      input.style.display = 'none';
      document.body.appendChild(input);
    }
    return input;
  }

  function init() {
    insertLinkBar('My Interviews', 'Create New', () => {
      if (typeof window.startNewProfileFlow === 'function') {
        window.startNewProfileFlow();
      } else {
        window.location.href = '/interviews/new';
      }
    });

    insertLinkBar('My Resumes', 'Add New', () => {
      const input = ensureHiddenFileInput('resume-file-input');
      input.click();
    });

    insertLinkBar('Attachments', 'Add New', () => {
      const input = ensureHiddenFileInput('attachment-file-input');
      input.click();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
