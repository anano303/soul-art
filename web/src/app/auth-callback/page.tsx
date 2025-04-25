'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { parseTokensFromHash } from '@/lib/auth';
import { queryClient } from '@/app/providers';

export default function AuthCallback() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Parse tokens from hash and store them
    try {
      console.log('🔄 Processing authentication callback...');
      const { accessToken, refreshToken, userData } = parseTokensFromHash();
      
      if (accessToken && refreshToken) {
        console.log('✅ Authentication successful');
        
        // Update user data in React Query
        if (userData) {
          queryClient.setQueryData(["user"], userData);
        }
        
        // Successfully authenticated
        router.push('/');
      } else {
        console.log('❌ Missing tokens in callback');
        setError('Authentication failed. Please try again.');
        setTimeout(() => {
          router.push('/login?error=auth_failed');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error processing auth callback:', error);
      setError('An unexpected error occurred. Please try again.');
      setTimeout(() => {
        router.push('/login?error=auth_failed');
      }, 2000);
    } finally {
      setIsProcessing(false);
    }
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        {isProcessing ? (
          <>
            <h1 className="text-2xl font-bold mb-4">Authenticating...</h1>
            <p>Please wait while we complete your authentication.</p>
          </>
        ) : error ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-red-600">შეცდომა ავტორიზაციისას</h1>
            <p>{error}</p>
            <p className="mt-2">გადამისამართება ავტორიზაციის გვერდზე...</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-4 text-green-600">ავტორიზაცია წარმატებულია</h1>
            <p>Redirecting to homepage...</p>
          </>
        )}
      </div>
    </div>
  );
}
