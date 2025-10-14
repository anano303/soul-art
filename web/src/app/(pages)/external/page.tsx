'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ExternalPageContent() {
  const searchParams = useSearchParams();
  const [externalUrl, setExternalUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const url = searchParams.get('url');
    if (url) {
      try {
        const decodedUrl = decodeURIComponent(url);
        // Validate URL
        new URL(decodedUrl);
        setExternalUrl(decodedUrl);
      } catch (error) {
        console.error('Invalid URL:', error);
      }
    }
    setIsLoading(false);
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!externalUrl) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-xl font-bold mb-4">არასწორი ბმული</h1>
        <p className="text-gray-600 mb-4">მითითებული ბმული არასწორია ან არ არსებობს.</p>
        <button 
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          უკან დაბრუნება
        </button>
      </div>
    );
  }

  const domain = new URL(externalUrl).hostname;

  return (
    <div className="min-h-screen flex flex-col">
      {/* External Link Header */}
      <div className="bg-blue-50 border-b p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-gray-600">გარე საიტი: <strong>{domain}</strong></span>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => window.open(externalUrl, '_blank')}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              ახალ ფანჯარაში გახსნა
            </button>
            <button 
              onClick={() => window.history.back()}
              className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              უკან
            </button>
          </div>
        </div>
      </div>

      {/* External Content */}
      <div className="flex-1 relative">
        <iframe
          src={externalUrl}
          className="w-full h-full border-0"
          style={{ minHeight: 'calc(100vh - 80px)' }}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          loading="lazy"
          title={`External content from ${domain}`}
        />
      </div>
    </div>
  );
}

export default function ExternalPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ExternalPageContent />
    </Suspense>
  );
}