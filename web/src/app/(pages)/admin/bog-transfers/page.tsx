"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface AccountBalance {
  accountNumber: string;
  availableBalance: number;
  currentBalance: number;
  currency: string;
}

interface PendingWithdrawal {
  _id: string;
  seller: {
    _id: string;
    email: string;
    ownerFirstName: string;
    ownerLastName: string;
    accountNumber: string;
  };
  amount: number;
  type: string;
  description: string;
  createdAt: string;
  bogStatus?: {
    status: string;
    statusText: string;
    resultCode: number;
    rejectCode?: number;
  };
}

export default function BogTransfersPage() {
  const [balance, setBalance] = useState<AccountBalance | null>(null);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<PendingWithdrawal[]>([]);
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<{ uniqueKey: number; withdrawalId: string } | null>(null);
  const [isBogAuthenticated, setIsBogAuthenticated] = useState<boolean | null>(null); // null = checking, true = authenticated, false = not authenticated
  const [bogUser, setBogUser] = useState<{ name?: string; companyId?: string; userId?: string } | null>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/admin/bog/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.data);
      }
    } catch {
      console.error("Failed to fetch balance");
    }
  }, []);

  const fetchPendingWithdrawals = useCallback(async () => {
    try {
      const res = await fetchWithAuth("/balance/admin/pending-withdrawals");
      if (res.ok) {
        const data = await res.json();
        setPendingWithdrawals(data.requests || []);
      }
    } catch {
      console.error("Failed to fetch pending withdrawals");
    }
  }, []);

  const fetchData = useCallback(async () => {
    await Promise.all([
      fetchBalance(),
      fetchPendingWithdrawals(),
    ]);
  }, [fetchBalance, fetchPendingWithdrawals]);

  useEffect(() => {
    // Check BOG authentication status first
    const checkBogAuth = async () => {
      try {
        const res = await fetchWithAuth("/admin/bog/auth/status");
        const data = await res.json();
        console.log('BOG auth status response:', data);
        setIsBogAuthenticated(data.authenticated);
        setBogUser(data.user);
        
        // Only fetch data if authenticated
        if (data.authenticated) {
          await fetchData();
        }
      } catch (error) {
        console.error('Failed to check BOG auth:', error);
        setIsBogAuthenticated(false);
        setBogUser(null);
      }
    };

    checkBogAuth();
    
    // Check if user just came back from OAuth authorization
    const urlParams = new URLSearchParams(window.location.search);
    const authStatus = urlParams.get('auth');
    const authError = urlParams.get('error');
    
    if (authStatus === 'success') {
      // Check if there's a pending sign operation
      const pendingSign = sessionStorage.getItem('pendingSign');
      if (pendingSign) {
        const { uniqueKey, withdrawalId } = JSON.parse(pendingSign);
        sessionStorage.removeItem('pendingSign');
        
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
        
        // Refresh auth status to get user info, then trigger sign
        checkBogAuth().then(() => {
          setSuccess("ავტორიზაცია წარმატებულია! იწყება დოკუმენტის ხელმოწერა...");
          setTimeout(() => {
            handleSignClick(uniqueKey, withdrawalId);
          }, 1000);
        });
      } else {
        setSuccess("ავტორიზაცია წარმატებულია!");
        window.history.replaceState({}, '', window.location.pathname);
        // Refresh auth status to get user info
        checkBogAuth();
      }
    } else if (authError) {
      setError(`ავტორიზაცია ვერ მოხერხდა: ${authError}`);
      sessionStorage.removeItem('pendingSign');
      window.history.replaceState({}, '', window.location.pathname);
      setIsBogAuthenticated(false);
    }
    
    // Refresh every minute if authenticated
    const interval = setInterval(() => {
      if (isBogAuthenticated) {
        fetchData();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchData, isBogAuthenticated]);

  const signDocumentWithOtp = async () => {
    if (!selectedDocument || !otp) {
      setError("გთხოვთ შეიყვანოთ OTP კოდი");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetchWithAuth("/admin/bog/sign-document", {
        method: "POST",
        body: JSON.stringify({ uniqueKey: selectedDocument.uniqueKey, otp }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(data.message);
        setOtp("");
        setShowOtpModal(false);
        setSelectedDocument(null);
        // Refresh data
        await fetchData();
      } else {
        setError(data.message || "დოკუმენტის ხელმოწერა ვერ მოხერხდა");
      }
    } catch {
      setError("დოკუმენტის ხელმოწერა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const handleSignClick = async (uniqueKey: number, withdrawalId: string) => {
    setSelectedDocument({ uniqueKey, withdrawalId });
    setOtp("");
    setError("");
    setLoading(true);

    try {
      // Request OTP for this specific document
      const res = await fetchWithAuth("/admin/bog/request-otp", {
        method: "POST",
        body: JSON.stringify({ uniqueKey }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowOtpModal(true);
        setSuccess(data.message);
      } else {
        setError(data.message || "OTP-ის მოთხოვნა ვერ მოხერხდა");
      }
    } catch {
      setError("OTP-ის მოთხოვნა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const closeOtpModal = () => {
    setShowOtpModal(false);
    setSelectedDocument(null);
    setOtp("");
    setError("");
  };

  const handleLogout = async () => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ გასვლა BOG-დან?")) {
      return;
    }
    
    try {
      // Call logout endpoint to clear server-side token
      await fetchWithAuth("/admin/bog/auth/logout", {
        method: "POST",
      });
    } catch {
      // Ignore errors, just log out locally
    }
    
    // Reset local state
    setIsBogAuthenticated(false);
    setBalance(null);
    setPendingWithdrawals([]);
  };

  const rejectWithdrawal = async (transactionId: string) => {
    if (!confirm("დარწმუნებული ხართ, რომ გსურთ მოთხოვნის უარყოფა?")) {
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetchWithAuth(`/balance/admin/withdrawal/${transactionId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason: "ადმინისტრატორის მიერ უარყოფილი" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("მოთხოვნა უარყოფილია და ბალანსი აღდგენილია");
        // Refresh data
        await fetchData();
      } else {
        setError(data.message || "მოთხოვნის უარყოფა ვერ მოხერხდა");
      }
    } catch {
      setError("მოთხოვნის უარყოფა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  };

  const extractUniqueKey = (description: string): number | null => {
    const match = description.match(/UniqueKey: (\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ka-GE");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ka-GE", {
      style: "currency",
      currency: "GEL",
    }).format(amount);
  };

  // Show loading state while checking authentication
  if (isBogAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff600a] mx-auto mb-4"></div>
          <p className="text-gray-600">BOG ავტორიზაციის შემოწმება...</p>
        </div>
      </div>
    );
  }

  // Show BOG sign-in screen if not authenticated
  if (isBogAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#fae0d3] to-[#f9ede6] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12 max-w-md w-full">
          {/* BOG Logo placeholder */}
          <div className="text-center mb-8">
            <div className="bg-gradient-to-r from-[#ff600a] to-[#ff6c1d] w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BOG ავტორიზაცია
            </h1>
            <p className="text-gray-600">
              საქართველოს ბანკის გადარიცხვების სისტემის გამოსაყენებლად საჭიროა ავტორიზაცია
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Sign in button */}
          <button
            onClick={() => {
              window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/admin/bog/auth/authorize`;
            }}
            className="w-full bg-gradient-to-r from-[#ff600a] to-[#ff6c1d] hover:from-[#ff6c1d] hover:to-[#fe7f3a] text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              BOG-ში შესვლა
            </div>
          </button>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 text-center">
              🔒 უსაფრთხო ავტორიზაცია საქართველოს ბანკის მეშვეობით
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main page content - only shown when authenticated
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col md:!flex-row justify-between items-start md:!items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BOG გადარიცხვების მართვა
            </h1>
            <p className="text-gray-600">
              საქართველოს ბანკის გადარიცხვების სისტემა
            </p>
          </div>
          <div className="flex flex-col md:!flex-row items-stretch md:!items-center gap-4 w-full md:w-auto">
            {/* BOG User Info */}
            {bogUser && (
              <div className="flex items-center gap-3 bg-white rounded-lg px-4 py-2 border border-gray-200 shadow-sm">
                <div className="bg-gradient-to-r from-[#ff600a] to-[#ff6c1d] w-10 h-10 rounded-full flex items-center justify-center text-white font-bold">
                  {bogUser.name ? bogUser.name.charAt(0).toUpperCase() : 'B'}
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {bogUser.name || 'BOG User'}
                  </p>
                  <div className="space-y-0.5">
                    {bogUser.companyId && (
                      <p className="text-xs text-gray-500">Company: {bogUser.companyId}</p>
                    )}
                    {bogUser.userId && (
                      <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]" title={bogUser.userId}>
                  User: {bogUser.userId.split(':').pop()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-white hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg border border-gray-300 shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              გასვლა
            </button>
          </div>
        </div>

        {/* Account Balance Card */}
        {balance && (
          <div className="bg-gradient-to-r from-[#ff600a] to-[#ff6c1d] rounded-lg shadow-lg p-6 mb-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[#fbc8ac] text-sm mb-1">ანგარიშის ბალანსი</p>
                <h2 className="text-4xl font-bold">
                  {formatCurrency(balance.availableBalance)}
                </h2>
                <p className="text-[#fbc8ac] text-sm mt-2">
                  {balance.accountNumber}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[#fbc8ac] text-sm">მიმდინარე ბალანსი</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(balance.currentBalance)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                className="py-4 px-6 font-medium text-sm border-b-2 border-blue-500 text-blue-600"
              >
                გასატანი მოთხოვნები
                {pendingWithdrawals.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                    {pendingWithdrawals.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Pending Withdrawals Content */}
          <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">გასატანი მოთხოვნები</h3>
                <button
                  onClick={fetchPendingWithdrawals}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  🔄 განახლება
                </button>
              </div>

              {pendingWithdrawals.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">არ არის გასატანი მოთხოვნები</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          სელერი
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          ანგარიში
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          თანხა
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          თარიღი
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          სტატუსი
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          მოქმედება
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {pendingWithdrawals.map((withdrawal) => {
                        const uniqueKey = extractUniqueKey(withdrawal.description);
                        return (
                          <tr key={withdrawal._id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">
                                {withdrawal.seller.ownerFirstName}{" "}
                                {withdrawal.seller.ownerLastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {withdrawal.seller.email}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {withdrawal.seller.accountNumber}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-red-600">
                                {formatCurrency(Math.abs(withdrawal.amount))}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(withdrawal.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="space-y-1">
                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                  ელოდება დამტკიცებას
                                </span>
                                {withdrawal.bogStatus && (
                                  <div className="text-xs text-gray-600">
                                    BOG: {withdrawal.bogStatus.statusText}
                                  </div>
                                )}
                                {uniqueKey && (
                                  <div className="text-xs text-gray-500">
                                    UniqueKey: {uniqueKey}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {uniqueKey ? (
                                <div className="flex gap-2">
                                  {/* Only show sign button if status is 'A' (To be Signed) */}
                                  {withdrawal.bogStatus?.status === 'A' ? (
                                    <>
                                      <button
                                        onClick={() => handleSignClick(uniqueKey, withdrawal._id)}
                                        disabled={loading}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        ხელმოწერა
                                      </button>
                                      <button
                                        onClick={() => rejectWithdrawal(withdrawal._id)}
                                        disabled={loading}
                                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        უარყოფა
                                      </button>
                                    </>
                                  ) : withdrawal.bogStatus?.status === 'S' || withdrawal.bogStatus?.status === 'T' || withdrawal.bogStatus?.status === 'Z' ? (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm text-blue-600 font-medium">
                                        {withdrawal.bogStatus.status === 'S' && '✓ ხელმოწერილია'}
                                        {withdrawal.bogStatus.status === 'T' && '⏳ მიმდინარეობს'}
                                        {withdrawal.bogStatus.status === 'Z' && '🔄 იწერება ხელმოწერა'}
                                      </span>
                                      <button
                                        onClick={() => rejectWithdrawal(withdrawal._id)}
                                        disabled={loading}
                                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        უარყოფა
                                      </button>
                                    </div>
                                  ) : withdrawal.bogStatus?.status === 'P' ? (
                                    <span className="text-sm text-green-600 font-medium">✓ დასრულებულია</span>
                                  ) : withdrawal.bogStatus?.status === 'R' ? (
                                    <span className="text-sm text-red-600 font-medium">✗ უარყოფილია</span>
                                  ) : (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleSignClick(uniqueKey, withdrawal._id)}
                                        disabled={loading}
                                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        ხელმოწერა
                                      </button>
                                      <button
                                        onClick={() => rejectWithdrawal(withdrawal._id)}
                                        disabled={loading}
                                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                      >
                                        უარყოფა
                                      </button>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-gray-400">UniqueKey არარის</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="text-center text-sm text-gray-500 mt-4">
          მონაცემები ავტომატურად ახლდება ყოველ წუთში
        </div>

        {/* OTP Modal */}
        {showOtpModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">
                OTP კოდის შეყვანა
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                დოკუმენტი: {selectedDocument?.uniqueKey}
              </p>
              <p className="text-sm text-green-600 mb-4">
                OTP კოდი გამოგზავნილია თქვენს ტელეფონზე/ელფოსტაზე
              </p>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4 text-sm">
                  {error}
                </div>
              )}

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="შეიყვანეთ OTP კოდი"
                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4"
                maxLength={6}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && otp) {
                    signDocumentWithOtp();
                  }
                }}
              />

              <div className="flex gap-3">
                <button
                  onClick={signDocumentWithOtp}
                  disabled={loading || !otp}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "მიმდინარეობს..." : "ხელმოწერა"}
                </button>
                <button
                  onClick={closeOtpModal}
                  disabled={loading}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 disabled:opacity-50"
                >
                  გაუქმება
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
