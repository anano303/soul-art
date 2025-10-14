'use client';

import { useEffect, useState } from 'react';

export default function PWADebugPage() {
  const [debugInfo, setDebugInfo] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const info = {
      // PWA Detection Methods
      standalone: window.matchMedia('(display-mode: standalone)').matches,
      fullscreen: window.matchMedia('(display-mode: fullscreen)').matches,
      minimalUi: window.matchMedia('(display-mode: minimal-ui)').matches,
      
      // iOS Specific
      navigatorStandalone: 'standalone' in window.navigator ? (window.navigator as { standalone?: boolean }).standalone : 'not available',
      
      // Android Specific
      referrerAndroid: document.referrer.includes('android-app://'),
      referrer: document.referrer,
      
      // User Agent Info
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      
      // URL Info
      currentUrl: window.location.href,
      urlParams: window.location.search,
      
      // Service Worker
      serviceWorkerSupported: 'serviceWorker' in navigator,
      serviceWorkerController: navigator.serviceWorker?.controller ? 'Available' : 'Not available',
      
      // Other PWA indicators
      isSecureContext: window.isSecureContext,
      beforeInstallPrompt: 'onbeforeinstallprompt' in window,
    };

    setDebugInfo(info);
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard?.writeText(JSON.stringify(debugInfo, null, 2));
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">PWA Debug Information</h1>
        
        <div className="mb-4">
          <button 
            onClick={copyToClipboard}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Copy to Clipboard
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(debugInfo).map(([key, value]) => (
            <div key={key} className="border-b pb-2">
              <div className="flex flex-wrap">
                <strong className="w-full sm:w-1/3 text-gray-700 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                </strong>
                <span className="w-full sm:w-2/3 text-gray-600 break-all">
                  {typeof value === 'boolean' ? (
                    <span className={value ? 'text-green-600' : 'text-red-600'}>
                      {value ? '✅ True' : '❌ False'}
                    </span>
                  ) : (
                    String(value)
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-yellow-800">Instructions:</h2>
          <ul className="text-yellow-700 space-y-1 text-sm">
            <li>1. Open this page in Safari on iPhone</li>
            <li>2. Add to Home Screen</li>
            <li>3. Open from Home Screen (PWA mode)</li>
            <li>4. Compare the values before and after</li>
            <li>5. Try clicking external links to test interception</li>
          </ul>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2 text-blue-800">Test Link:</h2>
          <a 
            href="https://google.com" 
            className="text-blue-600 underline hover:text-blue-800"
            target="_self"
          >
            Click this external link (Google)
          </a>
        </div>
      </div>
    </div>
  );
}