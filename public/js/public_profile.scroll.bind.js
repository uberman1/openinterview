// public_profile.scroll.bind.js - Enhances scroll layout for shareable profile
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    // Target the main container
    const container = document.querySelector('.mx-auto.max-w-7xl');
    if(!container) return;
    
    // Make body full height with overflow hidden
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    
    // Update container to use full height grid
    container.className = 'h-screen px-4 sm:px-6 lg:px-8';
    
    // Find the grid container
    const gridContainer = container.querySelector('.lg\\:grid');
    if(gridContainer){
      gridContainer.className = 'h-full grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-16 py-6';
    }
    
    // Find main content area (lg:col-span-8)
    const mainArea = container.querySelector('main.lg\\:col-span-8');
    if(mainArea){
      mainArea.className = 'lg:col-span-8 flex flex-col overflow-hidden rounded-lg bg-white dark:bg-background-dark';
      
      // Find the sticky video/hero area
      const stickyHero = mainArea.querySelector('.sticky.top-12');
      if(stickyHero){
        stickyHero.className = 'sticky top-0 z-10';
      }
      
      // Find the scrollable content area
      const scrollArea = mainArea.querySelector('.overflow-y-auto');
      if(scrollArea){
        scrollArea.className = 'min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 space-y-12';
      }
    }
    
    // Find sidebar (lg:col-span-4) and make it sticky
    const sidebar = container.querySelector('aside.lg\\:col-span-4');
    if(sidebar){
      sidebar.className = 'lg:col-span-4 overflow-y-auto';
      
      // Wrap sidebar content in sticky container
      const sidebarContent = sidebar.querySelector('.space-y-6');
      if(sidebarContent && !sidebarContent.parentElement.classList.contains('sticky')){
        const wrapper = document.createElement('div');
        wrapper.className = 'sticky top-6 space-y-6 overflow-y-auto max-h-[calc(100vh-3rem)]';
        sidebarContent.parentElement.insertBefore(wrapper, sidebarContent);
        wrapper.appendChild(sidebarContent);
      }
    }
  });
})();
