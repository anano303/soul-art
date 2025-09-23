'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { queryClient } from '@/app/providers';
import { storeUserData } from '@/lib/auth';

export default function AuthCallback() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const success = urlParams.get('success');
        const errorParam = urlParams.get('error');
        
        if (success === 'true') {
          console.log('🔍 OAuth success detected, processing...');
          
          // Successfully authenticated - cookies are already set by server
          // Add a small delay to ensure cookies are properly set
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Log all cookies for debugging
          console.log('🍪 All cookies:', document.cookie);
          
          // Now fetch the user profile to store user data
          try {
            console.log('📡 Fetching user profile...');
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
              method: 'GET',
              credentials: 'include',
            });
            
            console.log('📡 Profile response status:', response.status);
            
            if (response.ok) {
              const userData = await response.json();
              console.log('👤 User data received:', userData);
              storeUserData(userData);
              
              // Invalidate user query to refetch user data
              queryClient.invalidateQueries({ queryKey: ["user"] });
              
              // Clear the URL params
              window.history.replaceState(null, '', window.location.pathname);
              
              console.log('✅ OAuth process completed successfully');
              // Redirect to home
              router.push('/');
            } else {
              console.error('❌ Failed to fetch user profile:', response.status, response.statusText);
              const errorText = await response.text();
              console.error('❌ Error details:', errorText);
              throw new Error(`Failed to fetch user profile: ${response.status}`);
            }
          } catch (fetchError) {
            console.error('❌ Failed to fetch user profile after OAuth:', fetchError);
            setError('Authentication succeeded but failed to load user profile. Please try logging in again.');
            setTimeout(() => {
              router.push('/login?error=profile_fetch_failed');
            }, 3000);
          }
        } else if (errorParam) {
          setError(`Authentication failed: ${errorParam}`);
          setTimeout(() => {
            router.push('/login?error=auth_failed');
          }, 2000);
        } else {
          setError('Authentication failed. Please try again.');
          setTimeout(() => {
            router.push('/login?error=auth_failed');
          }, 2000);
        }
      } catch (error) {
        console.error('Error processing authentication callback:', error);
        setError('An unexpected error occurred. Please try again.');
        setTimeout(() => {
          router.push('/login?error=auth_failed');
        }, 2000);
      } finally {
        setIsProcessing(false);
      }
    };

    handleOAuthCallback();
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
