/**
 * PWA Link Interception Service Worker Extension
 * This extends the default next-pwa service worker with link interception
 */

// Import the generated workbox service worker
importScripts('/sw-config.js');

// Link interception for PWA
self.addEventListener('message', (event) => {
  console.log('[SW] Received message:', event.data);
  
  if (event.data && event.data.type === 'NAVIGATE_TO_URL') {
    const { url } = event.data;
    
    // Check if this is an external URL
    const isExternal = !url.startsWith(self.location.origin) && !url.startsWith('/');
    
    if (isExternal) {
      // For external URLs, open in iframe or handle specially
      console.log('[SW] Handling external URL:', url);
      
      // Send back to client for handling
      event.ports[0]?.postMessage({
        type: 'HANDLE_EXTERNAL_URL',
        url: url
      });
    } else {
      // For internal URLs, navigate normally
      console.log('[SW] Navigating to internal URL:', url);
      event.ports[0]?.postMessage({
        type: 'NAVIGATE_INTERNAL',
        url: url
      });
    }
  }
});

// Handle navigation requests
self.addEventListener('fetch', (event) => {
  const request = event.request;
  
  // Only handle navigation requests
  if (request.mode === 'navigate') {
    const url = new URL(request.url);
    
    // Check if this is a link that should be handled within the PWA
    if (url.hostname !== self.location.hostname) {
      console.log('[SW] Intercepting external navigation:', request.url);
      
      // Prevent the default navigation and handle within PWA
      event.respondWith(
        new Response('', {
          status: 200,
          headers: {
            'Content-Type': 'text/html',
          },
        })
      );
      
      // Notify the client to handle this URL
      event.waitUntil(
        self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'EXTERNAL_LINK_INTERCEPTED',
              url: request.url
            });
          });
        })
      );
      
      return;
    }
  }
});

console.log('[SW] PWA Link Interception Service Worker loaded');