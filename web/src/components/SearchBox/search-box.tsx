"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, User } from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useDebounce } from "@/hooks/use-debounce";

import "./SearchBox.css";

interface User {
  id: string;
  slug: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  artistCoverImage?: string | null;
  storeLogo?: string | null;
  storeLogoPath?: string | null;
  profileImagePath?: string | null;
}

export default function SearchBox() {
  const router = useRouter();
  const { language } = useLanguage();
  const [keyword, setKeyword] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedKeyword = useDebounce(keyword, 300);

    // Search artists API call
  const searchUsers = async (query: string): Promise<User[]> => {
    if (!query || query.length < 2) return [];
    try {
      console.log('Searching for artists with query:', query);
      console.log('API URL:', `${process.env.NEXT_PUBLIC_API_URL}/artists/search?q=${encodeURIComponent(query)}`);
      
      const response = await fetchWithAuth(`/artists/search?q=${encodeURIComponent(query)}`);
      
      console.log('Search response status:', response.status);
      console.log('Search response ok:', response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Search results:', data);
        return Array.isArray(data) ? data : [];
      } else {
        console.error('Search failed with status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
        return [];
      }
    } catch (error) {
      console.error('Error searching artists:', error);
      return [];
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (debouncedKeyword && debouncedKeyword.length >= 2) {
      setIsLoading(true);
      searchUsers(debouncedKeyword).then((results) => {
        setUsers(results);
        setShowPopup(true);
        setIsLoading(false);
      });
    } else {
      setUsers([]);
      setShowPopup(false);
      setIsLoading(false);
    }
  }, [debouncedKeyword]);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowPopup(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (keyword.trim()) {
      setShowPopup(false);
      
      try {
        // Get search ranking to determine which tab to show first
        const response = await fetchWithAuth(`/artists/search/ranking?q=${encodeURIComponent(keyword.trim())}`);
        
        if (response.ok) {
          const ranking = await response.json();
          console.log('Search ranking:', ranking);
          
          // Navigate to search page with recommended tab as URL parameter
          const recommendedTab = ranking.recommendedTab === 'products' ? 'products' : 'users';
          router.push(`/search/users/${keyword.trim()}?tab=${recommendedTab}`);
        } else {
          // Fallback to default behavior if ranking fails
          router.push(`/search/users/${keyword.trim()}`);
        }
      } catch (error) {
        console.error('Error getting search ranking:', error);
        // Fallback to default behavior
        router.push(`/search/users/${keyword.trim()}`);
      }
    }
  };

  const handleUserClick = (user: User) => {
    setShowPopup(false);
    setKeyword("");
    router.push(`/artists/${user.slug}`);
  };

  const getUserDisplayName = (user: User) => {
    return user.name;
  };

  const getUserImage = (user: User) => {
    // Prioritize store logo path, then other logos, then profile image
    return user.storeLogoPath || user.storeLogo || user.profileImagePath;
  };

  return (
    <div className="search-container" ref={searchRef}>
      <form onSubmit={onSubmit} className="search-form">
        <input
          ref={inputRef}
          type="text"
          placeholder="ძიება..."
          value={keyword}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setKeyword(e.target.value);
          }}
          onFocus={() => {
            if (keyword.length >= 2) {
              setShowPopup(true);
            }
          }}
          className="search-input"
        />
        <button type="submit" className="search-button">
          <Search size={18} />
        </button>
      </form>

      {/* User Results Popup */}
      {showPopup && (keyword.length >= 2) && (
        <div className="search-popup">
          {isLoading ? (
            <div className="search-popup-loading">
              {language === 'en' ? 'Searching...' : 'ძიება...'}
            </div>
          ) : (
            <>
              {users.length > 0 && (
                <div className="search-popup-section">
                  <h4 className="search-popup-title">
                    {language === 'en' ? 'Artists' : 'არტისტები'}
                  </h4>
                  {users.slice(0, 5).map((user) => (
                    <button
                      key={user.id}
                      className="search-popup-item"
                      onClick={() => handleUserClick(user)}
                    >
                      <div className="search-popup-item-image">
                        {getUserImage(user) ? (
                          <img
                            src={getUserImage(user)!}
                            alt={getUserDisplayName(user)}
                            width={32}
                            height={32}
                            className="search-popup-avatar"
                          />
                        ) : (
                          <div className="search-popup-avatar-placeholder">
                            <User size={16} />
                          </div>
                        )}
                      </div>
                      <div className="search-popup-item-info">
                        <span className="search-popup-item-name">
                          {getUserDisplayName(user)}
                        </span>
                        <span className="search-popup-item-badge">
                          {language === 'en' ? 'Artist' : 'არტისტი'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {users.length === 0 && (
                <div className="search-popup-empty">
                  {language === 'en' ? 'No artists found' : 'არტისტები არ მოიძებნა'}
                </div>
              )}

              {/* View All Results Link */}
              <div className="search-popup-footer">
                <button
                  type="button"
                  className="search-popup-view-all"
                  onClick={() => {
                    setShowPopup(false);
                    if (keyword.trim()) {
                      router.push(`/search/users/${keyword.trim()}`);
                    }
                  }}
                >
                  {language === 'en' ? 'View all results' : 'ყველა შედეგის ნახვა'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
