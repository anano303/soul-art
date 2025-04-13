"use client";

import { useEffect, useState } from 'react';

export function MessengerDebug() {
  const [logs, setLogs] = useState<string[]>([]);
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    
    const addLog = (message: string) => {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };
    
    addLog("დებაგერი ჩაირთო");
    
    // Check if FB SDK script exists
    const sdkScript = document.getElementById('facebook-jssdk');
    addLog(`FB SDK სკრიპტი ${sdkScript ? 'მოიძებნა' : 'ვერ მოიძებნა'}`);
    
    // Check if fb-root exists
    const fbRoot = document.getElementById('fb-root');
    addLog(`fb-root ელემენტი ${fbRoot ? 'მოიძებნა' : 'ვერ მოიძებნა'}`);
    
    // Check if chat div exists
    const chatDiv = document.querySelector('.fb-customerchat');
    addLog(`fb-customerchat ელემენტი ${chatDiv ? 'მოიძებნა' : 'ვერ მოიძებნა'}`);
    
    // Check if FB object exists
    addLog(`FB ობიექტი ${window.FB ? 'მოიძებნა' : 'ვერ მოიძებნა'}`);
    
    // Check for FB chat iframe
    const chatIframe = document.querySelector('iframe[title="Facebook Messenger"]');
    addLog(`Messenger Iframe ${chatIframe ? 'მოიძებნა' : 'ვერ მოიძებნა'}`);
    
    // Try to force XFBML parsing
    setTimeout(() => {
      if (window.FB?.XFBML?.parse) {
        window.FB.XFBML.parse();
        addLog("XFBML ხელახლა დაპარსულია");
      }
    }, 2000);
    
    return () => {
      addLog("დებაგერი გაითიშა");
    };
  }, []);
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  if (!visible) {
    return (
      <button 
        onClick={() => setVisible(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          background: '#4080ff',
          color: 'white',
          border: 'none',
          borderRadius: '3px',
          padding: '5px 10px',
          zIndex: 100000,
          cursor: 'pointer',
          fontSize: '12px'
        }}
      >
        FB დებაგერი
      </button>
    );
  }
  
  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        width: '300px',
        maxHeight: '400px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 100000,
        overflow: 'auto',
        fontSize: '12px'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <strong>Messenger დებაგი</strong>
        <button 
          onClick={() => setVisible(false)} 
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
        >
          X
        </button>
      </div>
      {logs.map((log, i) => (
        <div key={i} style={{ marginBottom: '3px', wordBreak: 'break-word' }}>{log}</div>
      ))}
      <button
        onClick={() => {
          if (window.FB?.XFBML?.parse) {
            window.FB.XFBML.parse();
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] XFBML ხელახლა დაპარსულია`]);
          } else {
            setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] FB ან XFBML ვერ მოიძებნა`]);
          }
        }}
        style={{
          background: '#4080ff',
          color: 'white',
          border: 'none',
          padding: '3px 8px',
          borderRadius: '3px',
          marginTop: '5px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        ხელახლა ინიციალიზაცია
      </button>
    </div>
  );
}
