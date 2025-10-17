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

  function wrapHeaderWithLink(headingText, linkText, onClick) {
    const h2 = $all('h1, h2, h3').find(h => h.textContent.trim().toLowerCase() === headingText.toLowerCase());
    if (!h2) return;
    
    const dupId = `section-link-${headingText.toLowerCase().replace(/\s+/g,'-')}`;
    if (document.getElementById(dupId)) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'mb-4 flex items-center justify-between';
    
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
    
    h2.parentNode.insertBefore(wrapper, h2);
    wrapper.appendChild(h2);
    wrapper.appendChild(a);
  }

  function init() {
    wrapHeaderWithLink('My Interviews', 'Create New', () => {
      // home-bindings.js will handle the actual creation flow
      // This just creates the link that home-bindings.js will bind to
    });

    // Note: My Resumes and Attachments now handled by home-guardrails-module.js
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
