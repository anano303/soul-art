"use client";

import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface GeoData {
  // Frontend (Next.js Middleware)
  cookies: {
    country?: string;
    currency?: string;
    city?: string;
    region?: string;
    detectedAt?: string;
  };
  // Backend response
  backend: {
    success: boolean;
    receivedCountry?: string;
    receivedHeaders?: Record<string, string>;
    ipAddress?: string;
    timestamp?: string;
    error?: string;
  };
}

export default function GeoTestPage() {
  const [geoData, setGeoData] = useState<GeoData>({
    cookies: {},
    backend: { success: false },
  });
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Read cookies from browser
  const getCookie = (name: string): string | undefined => {
    if (typeof document === "undefined") return undefined;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(";").shift();
    return undefined;
  };

  // Load geo data from cookies
  const loadGeoData = () => {
    const cookies = {
      country: getCookie("user_country"),
      currency: getCookie("user_currency"),
      city: getCookie("user_city"),
      region: getCookie("user_region"),
      detectedAt: getCookie("geo_detected_at"),
    };

    // Debug logging
    console.log('[Geo Test] All cookies:', document.cookie);
    console.log('[Geo Test] Parsed geo cookies:', cookies);

    setGeoData((prev) => ({
      ...prev,
      cookies,
    }));
  };

  // Test backend endpoint
  const testBackend = async () => {
    setTesting(true);
    try {
      const country = getCookie("user_country"); // Don't fallback - show real state
      
      const response = await fetchWithAuth("/geo/test", {
        method: "GET",
        headers: country ? {
          "X-User-Country": country,
        } : {}, // Only send header if cookie exists
      });

      if (response.ok) {
        const data = await response.json();
        setGeoData((prev) => ({
          ...prev,
          backend: {
            success: true,
            ...data,
          },
        }));
      } else {
        setGeoData((prev) => ({
          ...prev,
          backend: {
            success: false,
            error: `HTTP ${response.status}: ${response.statusText}`,
          },
        }));
      }
    } catch (error) {
      setGeoData((prev) => ({
        ...prev,
        backend: {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }));
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    loadGeoData();
    testBackend();
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshData = () => {
    setLoading(true);
    loadGeoData();
    testBackend();
    setTimeout(() => setLoading(false), 500);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading geo data...</p>
      </div>
    );
  }

  const StatusBadge = ({ success }: { success: boolean }) => (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
        success
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {success ? "✓ Working" : "✗ Failed"}
    </span>
  );

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">🌍 Geolocation Test Dashboard</h1>
          <p className="text-gray-600">
            Admin-only endpoint to verify Vercel Edge geolocation and backend integration
          </p>
        </div>
        <button
          onClick={refreshData}
          disabled={loading || testing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading || testing ? "Refreshing..." : "🔄 Refresh"}
        </button>
      </div>

      <div className="grid gap-6">
        {/* Environment Info */}
        <div className="bg-purple-50 rounded-lg shadow-md p-6 border border-purple-200">
          <h2 className="text-2xl font-semibold mb-4">🔍 Environment Info</h2>
          <div className="space-y-2">
            <div className="flex justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Current URL:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {typeof window !== 'undefined' ? window.location.href : 'SSR'}
              </code>
            </div>
            <div className="flex justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Running On:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') 
                  ? '✅ Vercel Production' 
                  : typeof window !== 'undefined' && window.location.hostname.includes('localhost')
                  ? '⚠️ Localhost (geo won\'t work)'
                  : typeof window !== 'undefined' 
                  ? `🌐 ${window.location.hostname}`
                  : 'Unknown'}
              </code>
            </div>
            <div className="flex justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Middleware Cookies Set:</span>
              <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                {typeof window !== 'undefined' && document.cookie.includes('geo_detected_at') 
                  ? '✅ Yes' 
                  : '❌ No'}
              </code>
            </div>
          </div>
        </div>

        {/* Frontend (Middleware) Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Frontend (Vercel Edge Middleware)</h2>
            <StatusBadge success={!!geoData.cookies.country} />
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Country Code</p>
                <p className="text-xl font-mono font-bold text-blue-600">
                  {geoData.cookies.country || "❌ Not detected"}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Currency</p>
                <p className="text-xl font-mono font-bold text-green-600">
                  {geoData.cookies.currency || "❌ Not detected"}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">City</p>
                <p className="text-xl font-mono">
                  {geoData.cookies.city || "Not available"}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Region</p>
                <p className="text-xl font-mono">
                  {geoData.cookies.region || "Not available"}
                </p>
              </div>
            </div>

            {geoData.cookies.detectedAt && (
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 mb-1">Detected At</p>
                <p className="text-sm font-mono text-blue-900">
                  {new Date(geoData.cookies.detectedAt).toLocaleString()}
                </p>
              </div>
            )}
          </div>

          {!geoData.cookies.country && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>No geo data detected.</strong> This could mean:
              </p>
              <ul className="list-disc list-inside text-yellow-700 text-sm mt-2 space-y-1">
                <li>You&apos;re running in local development (localhost)</li>
                <li>Vercel Edge is disabled or not deployed</li>
                <li>Middleware is not processing requests</li>
              </ul>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-300 rounded">
                <p className="text-blue-800 text-sm font-semibold">💡 To test with real geo data:</p>
                <p className="text-blue-700 text-xs mt-1">
                  Deploy to Vercel and visit: <code className="bg-blue-100 px-1">https://your-app.vercel.app/admin/geo-test</code>
                </p>
                <p className="text-blue-700 text-xs mt-1">
                  Vercel Edge geolocation only works on their network, not localhost.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Backend Section */}
        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold">Backend (NestJS API)</h2>
            <StatusBadge success={geoData.backend.success} />
          </div>

          {geoData.backend.success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Received Country Header</p>
                  <p className={`text-xl font-mono font-bold ${geoData.backend.receivedCountry ? 'text-purple-600' : 'text-red-600'}`}>
                    {geoData.backend.receivedCountry || "❌ Not sent"}
                  </p>
                  {!geoData.backend.receivedCountry && (
                    <p className="text-xs text-gray-500 mt-1">
                      Frontend didn&apos;t send country header (no cookie)
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Client IP Address</p>
                  <p className="text-lg font-mono">
                    {geoData.backend.ipAddress || "Unknown"}
                  </p>
                </div>
              </div>

              {geoData.backend.receivedHeaders && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">All Received Headers</p>
                  <pre className="text-xs font-mono bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
                    {JSON.stringify(geoData.backend.receivedHeaders, null, 2)}
                  </pre>
                </div>
              )}

              {geoData.backend.timestamp && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-800 mb-1">Backend Response Time</p>
                  <p className="text-sm font-mono text-green-900">
                    {new Date(geoData.backend.timestamp).toLocaleString()}
                  </p>
                </div>
              )}

              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 text-sm">
                  ✅ <strong>Backend integration working!</strong>
                </p>
                <p className="text-green-700 text-sm mt-1">
                  Your backend successfully received the country header from the frontend.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-semibold mb-2">❌ Backend Test Failed</p>
              <p className="text-red-700 text-sm">
                {geoData.backend.error || "Unknown error occurred"}
              </p>
              <p className="text-red-600 text-xs mt-2">
                Check that your backend server is running and the /geo/test endpoint exists.
              </p>
            </div>
          )}
        </div>

        {/* Integration Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow-md p-6 border border-blue-200">
          <h2 className="text-2xl font-semibold mb-4">📊 Integration Summary</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Vercel Edge Detection</span>
              <StatusBadge success={!!geoData.cookies.country} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Cookie Storage</span>
              <StatusBadge success={!!geoData.cookies.country && !!geoData.cookies.currency} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">Backend Reception</span>
              <StatusBadge success={geoData.backend.success} />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-white rounded-lg">
              <span className="font-medium">End-to-End Pipeline</span>
              <StatusBadge 
                success={
                  !!geoData.cookies.country && 
                  !!geoData.cookies.currency && 
                  geoData.backend.success
                } 
              />
            </div>
          </div>

          {!!geoData.cookies.country && geoData.backend.success && (
            <div className="mt-4 p-4 bg-green-100 border border-green-300 rounded-lg">
              <p className="text-green-900 font-semibold text-center">
                🎉 All systems operational! Your geolocation pipeline is working perfectly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
