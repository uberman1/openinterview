// home.structure.bind.js - Injects HTML structure for avatar edit and attachments
(function(){
  function el(html){ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstChild; }
  
  document.addEventListener('DOMContentLoaded', function(){
    // 1. Add header avatar class for syncing
    const headerAvatars = document.querySelectorAll('header .aspect-square.w-10.rounded-full');
    headerAvatars.forEach(av => av.classList.add('header-avatar'));
    
    // 2. Modify body avatar for editing
    const bodyAvatar = document.querySelector('main .aspect-square.w-20.rounded-full');
    if(bodyAvatar && !document.getElementById('bodyAvatar')){
      bodyAvatar.id = 'bodyAvatar';
      bodyAvatar.classList.add('ring-1', 'ring-primary/10');
      const parent = bodyAvatar.parentElement;
      if(parent && !parent.classList.contains('group')){
        parent.classList.add('relative', 'group');
        const btn = el('<button id="avatarEditBtn" type="button" class="absolute inset-0 hidden group-hover:flex items-center justify-center rounded-full bg-black/40 text-white text-xs font-semibold">Edit</button>');
        const input = el('<input id="avatarFile" type="file" accept="image/*" class="hidden" />');
        parent.appendChild(btn);
        parent.appendChild(input);
      }
    }
    
    // 3. Add Attachments section after Resumes
    const resumesSection = Array.from(document.querySelectorAll('h2.text-2xl')).find(h => h.textContent.includes('My Resumes'));
    if(resumesSection && !document.getElementById('attachmentsBody')){
      const attachmentsHTML = `
        <div class="flex flex-col gap-6">
          <h2 class="text-2xl font-bold tracking-tight">Attachments</h2>
          <div class="overflow-hidden rounded border border-primary/10 bg-white dark:border-white/10 dark:bg-primary">
            <table class="w-full text-left">
              <thead>
                <tr class="border-b border-primary/10 dark:border-white/10">
                  <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">File Name</th>
                  <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">Upload Date</th>
                  <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60">Size</th>
                  <th class="px-6 py-3 text-sm font-medium text-primary/60 dark:text-white/60 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-primary/10 dark:divide-white/10" id="attachmentsBody">
              </tbody>
            </table>
          </div>
        </div>`;
      const resumesContainer = resumesSection.closest('.flex.flex-col.gap-6');
      if(resumesContainer && resumesContainer.parentElement){
        resumesContainer.parentElement.appendChild(el(attachmentsHTML));
      }
    }
  });
})();
