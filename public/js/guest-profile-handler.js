// // Guest Profile Handler - Links guest profiles to authenticated users
// (async function initGuestProfileHandler() {
//   // Check if we're on profile edit page with guest flag OR owner preview page
//   const urlParams = new URLSearchParams(window.location.search);
//   const isGuest = urlParams.get('guest') === 'true';
//   const profileId = urlParams.get('id');
  

//    // Get profile ID from URL path if not in query params
//   function getProfileIdFromPath() {
//     const path = window.location.pathname;
//     const match = path.match(/\/profile\/([^\/]+)/);
//     return match ? match[1] : null;
//   }
//   // if (!isGuest || !profileId) {
//   //   return; // Not a guest profile
//   // }
//     if (!profileId) {
//     return; // No profile ID found
//   }
  
//   console.log('[guest-handler] Guest profile detected:', profileId);
  
//   // Check if user is authenticated
//   try {
//     const authResponse = await fetch('/api/profiles/mine', {
//       credentials: 'include'
//     });
    
//     if (authResponse.ok) {
//       // User is authenticated - link the guest profile
//       console.log('[guest-handler] User authenticated, linking profile...');
      
//    // Get profile details to check if it belongs to anonymous user
//       const profileResponse = await fetch(`/api/profiles/${profileId}`, {
//         credentials: 'include'
//       });


//       const linkResponse = await fetch('/api/link-guest-profile', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         credentials: 'include',
//         body: JSON.stringify({ profileId })
//       });
      
//       if (linkResponse.ok) {
//         console.log('[guest-handler] Profile linked successfully');
//         // Remove guest flag from URL
//         const newUrl = `/profile_edit.html?id=${profileId}`;
//         window.history.replaceState({}, '', newUrl);
//       } else {
//         const error = await linkResponse.json();
//         console.error('[guest-handler] Failed to link profile:', error);
//       }
//     } else {
//       // User not authenticated - show message about signing in to share
//       console.log('[guest-handler] User not authenticated, guest mode active');
//       showGuestModeMessage();
//     }
//   } catch (error) {
//     console.error('[guest-handler] Error:', error);
//   }
// })();

// function showGuestModeMessage() {
//   // Add a banner or message indicating guest mode
//   const banner = document.createElement('div');
//   banner.id = 'guest-mode-banner';
//   banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 text-center z-50';
//   banner.innerHTML = `
//     <p class="text-sm font-medium">
//       You're editing as a guest. 
//       <a href="/login-page.html?returnTo=${encodeURIComponent(window.location.href)}" class="underline font-bold">Sign in</a> 
//       to save and share your profile.
//     </p>
//   `;
//   document.body.prepend(banner);
  
//   // Add class to body to add padding for banner
//   document.body.classList.add('has-guest-banner');
// }



console.log('[DEBUG] Guest profile handler script loaded');
console.log('[DEBUG] Current URL:', window.location.href);
console.log('[DEBUG] Current pathname:', window.location.pathname);
// Guest Profile Handler - Links guest profiles to authenticated users
(async function initGuestProfileHandler() {
  // Check if we're on profile edit page with guest flag OR owner preview page
  const urlParams = new URLSearchParams(window.location.search);
  const isGuest = urlParams.get('guest') === 'true';
  const profileId = urlParams.get('id') || getProfileIdFromPath();
  
  // Get profile ID from URL path if not in query params
  function getProfileIdFromPath() {
    const path = window.location.pathname;
    const match = path.match(/\/profile\/([^\/]+)/);
    return match ? match[1] : null;
  }
  
  if (!profileId) {
    return; // No profile ID found
  }
  
  console.log('[guest-handler] Profile detected:', profileId);
  
  // Check if user is authenticated
  try {
    const authResponse = await fetch('/api/profiles/mine', {
      credentials: 'include'
    });
    
    if (authResponse.ok) {
      // User is authenticated - check if profile needs linking
      console.log('[guest-handler] User authenticated, checking profile ownership...');
      
      // Get profile details to check if it belongs to anonymous user
      const profileResponse = await fetch(`/api/profiles/${profileId}`, {
        credentials: 'include'
      });
      
      if (profileResponse.ok) {
        const profile = await profileResponse.json();
        console.log('[guest-handler] Profile data:', profile);
        
        // Get current authenticated user to check ownership
        const userResponse = await fetch('/auth/me', {
          credentials: 'include'
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('[guest-handler] Current user:', userData.user.id);
          console.log('[guest-handler] Profile owner:', profile.userId);
          
          // Check if profile already belongs to current user
          if (profile.userId === userData.user.id) {
            console.log('[guest-handler] Profile already belongs to current user - no linking needed');
            return; // Exit early, no linking needed
          }
          
          // Check if profile belongs to anonymous user (usr_ prefix with anonymous status)
          if (profile.userId && profile.userId.startsWith('usr_')) {
            console.log('[guest-handler] Anonymous profile detected, attempting to link...');
            
            const linkResponse = await fetch('/api/link-guest-profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ profileId })
            });
            
            console.log('[guest-handler] Link API response status:', linkResponse.status);
            
            if (linkResponse.ok) {
              const linkResult = await linkResponse.json();
              console.log('[guest-handler] Link API success response:', linkResult);
              console.log('[guest-handler] Profile linked successfully');
              // Remove guest flag from URL if present
              if (isGuest) {
                const newUrl = window.location.pathname + `?id=${profileId}`;
                window.history.replaceState({}, '', newUrl);
              }
              // Don't reload - let the page continue normally
            } else {
              const error = await linkResponse.json();
              console.log('[guest-handler] Link API error response:', error);
              console.error('[guest-handler] Failed to link profile:', error);
            }
          } else {
            console.log('[guest-handler] Profile does not belong to anonymous user');
          }
        } else {
          console.error('[guest-handler] Failed to get current user data');
        }
      }
    } else {
      // User not authenticated - show message about signing in to share (only on edit pages)
      if (isGuest || window.location.pathname.includes('profile_edit')) {
        console.log('[guest-handler] User not authenticated, guest mode active');
        showGuestModeMessage();
      }
    }
  } catch (error) {
    console.error('[guest-handler] Error:', error);
  }
})();

function showGuestModeMessage() {
  // Add a banner or message indicating guest mode
  const banner = document.createElement('div');
  banner.id = 'guest-mode-banner';
  banner.className = 'fixed top-0 left-0 right-0 bg-blue-600 text-white px-4 py-3 text-center z-50';
  banner.innerHTML = `
    <p class="text-sm font-medium">
      You're editing as a guest. 
      <a href="/login-page.html?returnTo=${encodeURIComponent(window.location.href)}" class="underline font-bold">Sign in</a> 
      to save and share your profile.
    </p>
  `;
  document.body.prepend(banner);
  
  // Add class to body to add padding for banner
  document.body.classList.add('has-guest-banner');
}
