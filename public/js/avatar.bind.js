(function(){
  function $(id){ return document.getElementById(id); }
  document.addEventListener('DOMContentLoaded', function(){
    var avatar=$('bodyAvatar'), btn=$('avatarEditBtn'), file=$('avatarFile');
    if(!avatar||!btn||!file) return;
    try{ var saved=localStorage.getItem('oi.avatarUrl'); if(saved) avatar.style.backgroundImage='url("'+saved+'")'; }catch(e){}
    avatar.addEventListener('mouseenter',()=>btn.style.display='flex');
    avatar.addEventListener('mouseleave',()=>btn.style.display='none');
    btn.addEventListener('mouseenter',()=>btn.style.display='flex');
    btn.addEventListener('mouseleave',()=>btn.style.display='none');
    [btn, avatar].forEach(n=>n.addEventListener('click',()=>file.click()));
    file.addEventListener('change', async function(){
      var f=file.files&&file.files[0]; if(!f) return;
      if(!f.type.startsWith('image/')){ alert('Please choose an image file.'); return; }
      if(f.size>5*1024*1024){ alert('Max image size is 5MB.'); return; }
      var fd=new FormData(); fd.append('avatar', f);
      try{
        const res=await fetch('/api/profile/avatar',{method:'POST', body:fd});
        if(!res.ok) throw new Error('Upload failed');
        const data=await res.json().catch(()=>({}));
        const url=data.url || (URL.createObjectURL?URL.createObjectURL(f):'');
        if(url){
          avatar.style.backgroundImage='url("'+url+'")';
          try{ localStorage.setItem('oi.avatarUrl', url); }catch(e){}
          window.dispatchEvent(new CustomEvent('avatar:updated',{detail:{url}}));
        }
      }catch(err){ console.error(err); alert('Could not upload avatar.'); }
    });
  });
})();
