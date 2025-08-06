/**
 * RSVP Token Handler
 * This utility extracts RSVP tokens from various sources to ensure maximum compatibility
 */

export function extractRsvpToken(): string | null {
  // Check window.rsvpToken first (set by server or index.html script)
  const windowToken = (window as any).rsvpToken;
  if (windowToken) {
    // Clear the token after using it to avoid reuse
    setTimeout(() => {
      (window as any).rsvpToken = undefined;
    }, 1000);
    return windowToken;
  }
  
  // Extract from URL path
  const pathMatch = window.location.pathname.match(/\/guest-rsvp\/(.+)/);
  if (pathMatch && pathMatch[1]) {
    // Handle case where path might be /guest-rsvp/guest-rsvp/TOKEN
    let token = pathMatch[1];
    if (token.startsWith('guest-rsvp/')) {
      token = token.replace('guest-rsvp/', '');
    }
    
    // Ensure the token isn't empty
    if (token && token.length > 0) {
      return token;
    }
  }
  
  // Check URL query parameters
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get('token');
  if (queryToken) {
    return queryToken;
  }
  
  // If we reach here, try to extract the token from localStorage as a last resort
  // This is a fallback in case all other methods fail
  const localToken = localStorage.getItem('rsvp_token');
  if (localToken) {
    // Clear after use
    setTimeout(() => {
      localStorage.removeItem('rsvp_token');
    }, 1000);
    return localToken;
  }
  
  return null;
}