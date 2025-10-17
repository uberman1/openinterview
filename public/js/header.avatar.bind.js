(function(){
  function apply(url){
    if(!url) return;
    var nodes = document.querySelectorAll('header [data-avatar], header .header-avatar, header .rounded-full, header #avatar-header, header img.header-avatar');
    nodes.forEach(function(el){
      if(el.tagName === 'IMG') el.src = url; else el.style.backgroundImage = 'url("'+url+'")';
    });
  }
  document.addEventListener('DOMContentLoaded', function(){
    try{ apply(localStorage.getItem('oi.avatarUrl')); }catch(e){}
  });
  window.addEventListener('avatar:updated', function(ev){
    apply((ev.detail && ev.detail.url) || localStorage.getItem('oi.avatarUrl'));
  });
})();
