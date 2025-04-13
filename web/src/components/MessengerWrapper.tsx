'use client'; // Mark as client component

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the Facebook Messenger component with SSR disabled
// This is OK here because we're in a Client Component
const FacebookMessengerSimple = dynamic(
  () => import('./FacebookMessengerSimple'),
  { ssr: false }
);

export default function MessengerWrapper() {
  const [mounted, setMounted] = useState(false);
  const [isSecure, setIsSecure] = useState(true);

  // Only render the component after mounting on the client and checking protocol
  useEffect(() => {
    setMounted(true);
    setIsSecure(window.location.protocol === 'https:' || process.env.NODE_ENV === 'production');
  }, []);

  // Don't render anything until client-side
  if (!mounted) {
    return null;
  }

  return (
    <>
      <FacebookMessengerSimple />
      
      {/* Show warning in development with HTTP */}
      {!isSecure && process.env.NODE_ENV === 'development' && (
        <div 
          style={{ 
            position: 'fixed',
            bottom: '10px',
            right: '10px',
            background: '#ffcccc',
            padding: '10px',
            border: '1px solid red',
            borderRadius: '5px',
            zIndex: 9999,
            maxWidth: '300px',
            fontSize: '12px'
          }}
        >
          <p>Facebook Messenger requires HTTPS and will only work in production.</p>
        </div>
      )}
    </>
  );
}
