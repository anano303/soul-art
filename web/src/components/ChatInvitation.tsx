'use client';

import { useState } from 'react';

interface ChatInvitationProps {
  pageId: string;
}

export default function ChatInvitation({ pageId }: ChatInvitationProps) {
  const [isVisible] = useState(true);
  
  const openMessenger = () => {
    // Open Facebook Messenger in a new tab
    window.open(`https://m.me/${pageId}`, '_blank');
  };
  
  if (!isVisible) return null;
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: '#6b32a8',
        color: 'white',
        borderRadius: '50%',
        width: '60px',
        height: '60px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
        zIndex: 999
      }}
      onClick={openMessenger}
      title="დაგვიკავშირდით მესენჯერში"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.486 2 2 6.262 2 11.5C2 14.045 3.088 16.487 5 18.213V22L8.5 20.5L9 20.722C9.946 20.908 10.957 21 12 21C17.514 21 22 16.738 22 11.5C22 6.262 17.514 2 12 2ZM13 15L10.5 12.5L6 15L11 9L13.5 11.5L18 9L13 15Z" fill="white"/>
      </svg>
    </div>
  );
}
