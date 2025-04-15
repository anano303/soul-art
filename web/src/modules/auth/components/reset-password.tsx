'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';

import './reset-password.css';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get the token from URL query parameters
  const token = searchParams?.get('token') || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate token exists
    if (!token) {
      setError('Invalid password reset link. Please request a new one.');
      return;
    }

    setLoading(true);

    try {
      // Send request to API with token and newPassword
      await apiClient.post('/auth/reset-password', {
        token, // Don't rename this, send it as 'token' as expected by the API
        newPassword // Don't rename this, send it as 'newPassword' as expected by the API
      });

      // Show success message
      toast({
        title: 'Password reset successful',
        description: 'Your password has been updated. You can now log in.',
        variant: 'default',
      });

      // Redirect to login page
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: unknown) {
      console.error('Password reset failed:', error);
      
      // Properly type the error response
      interface ApiErrorResponse {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
      
      const apiError = error as ApiErrorResponse;
      setError(
        apiError?.response?.data?.message ||
        'Password reset failed. Please try again or request a new reset link.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      {!token ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <p className="text-yellow-700">
            Invalid password reset link. Please request a new one from the login page.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="block text-sm font-medium">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              required
              disabled={loading}
              className="w-full"
            />
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Updating Password...' : 'Reset Password'}
          </button>
        </form>
      )}
    </div>
  );
}
