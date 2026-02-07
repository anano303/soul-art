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
        const isPopup = urlParams.get('popup') === 'true';
        const isSeller = urlParams.get('isSeller') === 'true';
        const needsSellerRegistration = urlParams.get('needsSellerRegistration') === 'true';
        
        if (success === 'true') {
          console.log('🔍 OAuth success detected, processing...');
          
          // Successfully authenticated - cookies are already set by server
          // Add a small delay to ensure cookies are properly set
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
              
              // Set a client-side cookie that middleware can see
              // This bridges the gap between HTTP-only API cookies and Next.js middleware
              document.cookie = 'auth_session=active; path=/; max-age=3600; SameSite=Lax';
              
              // Invalidate user query to refetch user data
              queryClient.invalidateQueries({ queryKey: ["user"] });
              
              // If this was a popup that fell back to redirect, try to close
              if (isPopup) {
                // Set localStorage flag for opener to detect
                localStorage.setItem('google_auth_success', JSON.stringify({ type: 'GOOGLE_AUTH_SUCCESS' }));
                
                // Try to close the window
                window.close();
                
                // If window didn't close (not a popup or blocked), redirect
                setTimeout(() => {
                  router.push('/');
                }, 500);
                return;
              }
              
              console.log('✅ OAuth process completed successfully');
              
              // Use window.location.href for full page reload to ensure cookie is sent with request
              // router.push does client-side navigation which may not pick up the fresh cookie
              if (needsSellerRegistration) {
                window.location.href = '/become-seller?fromOauth=true';
              } else if (isSeller) {
                window.location.href = '/profile';
              } else {
                window.location.href = '/';
              }
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
