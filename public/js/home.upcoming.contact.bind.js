// home.upcoming.contact.bind.js - Patches Upcoming Interviews: Actions → Contact, View Details → Recruiter Email
(function(){
  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  // Default email mapping: recruiter name → email
  const recruiterToEmail = {
    'John Doe': 'john.doe@innovate-inc.com',
    'Jane Smith': 'jane.smith@techsolutions.com'
  };

  function patchUpcomingInterviews(){
    // Find Upcoming Interviews section
    const upcomingH2 = qa('h2.text-2xl').find(h => h.textContent.includes('Upcoming Interviews'));
    if (!upcomingH2) return;

    const table = upcomingH2.parentElement.querySelector('table');
    if (!table) return;

    // 1. Change "Actions" header to "Contact"
    const actionsHeader = qa('th', table).find(th => th.textContent.trim() === 'Actions');
    if (actionsHeader) {
      actionsHeader.textContent = 'Contact';
    }

    // 2. Replace "View Details" links with recruiter emails
    const rows = qa('tbody tr', table);
    rows.forEach(row => {
      const cells = qa('td', row);
      if (cells.length < 5) return;

      const recruiterCell = cells[3]; // 4th column: Recruiter
      const actionsCell = cells[4];   // 5th column: Actions/Contact

      // Get recruiter name
      const recruiterName = recruiterCell.textContent.trim();
      
      // Get email from mapping or generate default
      const email = recruiterToEmail[recruiterName] || `${recruiterName.toLowerCase().replace(/\s+/g, '.')}@company.com`;

      // Find and replace "View Details" link
      const viewDetailsLink = q('a', actionsCell);
      if (viewDetailsLink && viewDetailsLink.textContent.includes('View Details')) {
        // Replace link with email text
        const emailSpan = document.createElement('span');
        emailSpan.className = 'text-sm text-gray-800 dark:text-gray-200 break-all';
        emailSpan.textContent = email;
        viewDetailsLink.replaceWith(emailSpan);
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchUpcomingInterviews);
  } else {
    patchUpcomingInterviews();
  }
})();
