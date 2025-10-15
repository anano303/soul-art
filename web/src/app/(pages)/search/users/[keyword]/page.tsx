"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { ArrowLeft, User as UserIcon, Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useParams, useSearchParams } from "next/navigation";
import HeartLoading from "@/components/HeartLoading/HeartLoading";
import { useLanguage } from "@/hooks/LanguageContext";

import { useRouter } from "next/navigation";
import { ProductGrid } from "@/modules/products/components/product-grid";
import { Product } from "@/types";
import "./users-search-page.css";

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

interface UsersResponse {
  users: User[];
  total: number;
}

function UsersSearchPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { language } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'users' | 'products'>('users');

  const keyword = (params?.keyword as string) || "";
  const currentPage = Number(searchParams?.get("page")) || 1;

  console.log("Users search keyword:", keyword);
  console.log("URL-decoded keyword:", decodeURIComponent(keyword || ""));

  // Fetch users based on the search keyword
  const { data: usersData, isLoading: usersLoading, error: usersError } = useQuery<UsersResponse>({
    queryKey: ["search-users", keyword, currentPage],
    queryFn: async () => {
      const decodedKeyword = decodeURIComponent(keyword || "");

      if (!decodedKeyword) {
        return { users: [], total: 0 };
      }

      console.log("Searching artists for:", decodedKeyword);

      const response = await fetchWithAuth(`/artists/search?q=${encodeURIComponent(decodedKeyword)}`);
      if (!response.ok) {
        throw new Error(`Error fetching artists: ${response.status}`);
      }

      const users = await response.json();
      console.log("Artists search response:", users);

      return {
        users: users || [],
        total: users?.length || 0,
      };
    },
    enabled: !!keyword && activeTab === 'users',
  });

  // Fetch products based on the search keyword
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery<{items: Product[], pages: number, totalItems: number}>({
    queryKey: ["search-products", keyword, currentPage],
    queryFn: async () => {
      const decodedKeyword = decodeURIComponent(keyword || "");

      const searchQuery = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
      });

      if (decodedKeyword) {
        searchQuery.append("keyword", decodedKeyword);
      }

      console.log("Search URL:", `/products?${searchQuery}`);
      console.log("Search keyword:", decodedKeyword);

      const response = await fetchWithAuth(`/products?${searchQuery}`);
      if (!response.ok) {
        throw new Error(`Error fetching products: ${response.status}`);
      }

      const result = await response.json();
      console.log("Products search response:", result);

      return {
        items: result.items || result.products || result || [],
        pages: result.pages || Math.ceil((result.total || 0) / 12) || 1,
        totalItems: result.total || result.totalItems || 0,
      };
    },
    enabled: !!keyword && activeTab === 'products',
  });

  const isLoading = activeTab === 'users' ? usersLoading : productsLoading;
  const error = activeTab === 'users' ? usersError : productsError;

  const getUserDisplayName = (user: User) => {
    return user.name;
  };

  const getUserImage = (user: User) => {
    // For avatar/logo: prioritize store logo path, then other logos, then profile image
    return user.storeLogoPath || user.storeLogo || user.profileImagePath;
  };

  const getUserCoverImage = (user: User) => {
    // For background: use artist cover image
    return user.artistCoverImage;
  };

  const handleUserClick = (user: User) => {
    router.push(`/artists/${user.slug}`);
  };

  if (isLoading) {
    return (
      <div className="users-search-page-container">
        <div className="users-search-content">
          <div className="users-search-loading">
            <HeartLoading size="large" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    console.error("Users search error:", error);
    return (
      <div className="users-search-page-container">
        <div className="users-search-content">
          <div className="users-search-header">
            <Link href="/" className="users-search-back-button">
              <ArrowLeft className="h-4 w-4" />
              {language === 'en' ? 'Back to Home' : 'მთავარზე დაბრუნება'}
            </Link>
            <h1 className="users-search-title">
              {language === 'en' ? 'Artist Search Results' : 'არტისტების ძიების შედეგები'}:{" "}
              <span className="users-search-keyword">
                {decodeURIComponent(keyword || "")}
              </span>
            </h1>
          </div>

          <div className="users-search-error">
            <h2 className="users-search-error-title">
              {language === 'en' ? 'Something went wrong' : 'რაღაც არ ისე მოხდა'}
            </h2>
            <p className="users-search-error-message">
              {language === 'en' ? 'Please try again later.' : 'სცადეთ მოგვიანებით.'}
            </p>
            <Link href="/" className="users-search-browse-button">
              {language === 'en' ? 'Back to Home' : 'მთავარზე დაბრუნება'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const hasUsers = usersData?.users && usersData.users.length > 0;
  const hasProducts = productsData?.items && productsData.items.length > 0;

  console.log("hasUsers:", hasUsers);
  console.log("hasProducts:", hasProducts);
  console.log("activeTab:", activeTab);

  return (
    <div className="users-search-page-container">
      <div className="users-search-content">
        {/* Header Section */}
        <div className="users-search-header">
          <Link href="/" className="users-search-back-button">
            <ArrowLeft className="h-4 w-4" />
            {language === 'en' ? 'Back to Home' : 'მთავარზე დაბრუნება'}
          </Link>
          <h1 className="users-search-title">
            {language === 'en' ? 'Search Results' : 'ძიების შედეგები'}:{" "}
            <span className="users-search-keyword">
              {decodeURIComponent(keyword || "")}
            </span>
          </h1>
        </div>

        {/* Search Tabs */}
        <div className="search-tabs-container">
          <div className="search-tabs">
            <button
              type="button"
              className={`search-tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              <UserIcon size={16} />
              {language === 'en' ? 'Artists' : 'არტისტები'}
              {usersData && (
                <span className="search-tab-count">({usersData.total})</span>
              )}
            </button>
            <button
              type="button"
              className={`search-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <Package size={16} />
              {language === 'en' ? 'Products' : 'პროდუქტები'}
              {productsData && (
                <span className="search-tab-count">({productsData.totalItems})</span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' && (
          <>
            {/* No Users Results State */}
            {!hasUsers && !isLoading && (
              <div className="users-search-no-results">
                <h2 className="users-search-no-results-title">
                  {language === 'en' ? 'No artists found' : 'არტისტები არ მოიძებნა'}
                </h2>
                <p className="users-search-no-results-message">
                  {language === 'en' ? 'No artists found for' : 'არტისტები არ მოიძებნა'} &ldquo;
                  <span className="users-search-keyword">
                    {decodeURIComponent(keyword || "")}
                  </span>
                  &rdquo;.
                  <br />
                  {language === 'en' ? 'Try different search terms' : 'სცადეთ სხვა საძიებო სიტყვები'}
                </p>
                <Link href="/" className="users-search-browse-button">
                  {language === 'en' ? 'Browse All Artists' : 'ყველა არტისტის ნახვა'}
                </Link>
              </div>
            )}

            {/* Users Results Section */}
            {hasUsers && (
              <>
                <div className="users-search-results-info">
                  <p className="users-search-results-count">
                    {language === "en" ? "Found" : "ნაპოვნია"}{" "}
                    <span className="highlight">{usersData!.total}</span>{" "}
                    {language === "en" 
                      ? (usersData!.total === 1 ? "artist" : "artists") 
                      : "არტისტი"
                    } {language === "en" ? "for" : ""} &ldquo;
                    <span className="users-search-keyword">
                      {decodeURIComponent(keyword || "")}
                    </span>
                    &rdquo;{language === "en" ? "" : "-ისთვის"}
                  </p>
                </div>

                <div className="users-search-results-container">
                  <div className="users-search-grid">
                    {usersData!.users.map((user) => (
                      <div
                        key={user.id}
                        className="users-search-card"
                        onClick={() => handleUserClick(user)}
                        style={{
                          backgroundImage: getUserCoverImage(user) 
                            ? `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.6)), url(${getUserCoverImage(user)})` 
                            : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                        }}
                      >
                        <div className="users-search-card-image">
                          {getUserImage(user) ? (
                            <img
                              src={getUserImage(user)!}
                              alt={getUserDisplayName(user)}
                              width={60}
                              height={60}
                              className="users-search-avatar"
                            />
                          ) : (
                            <div className="users-search-avatar-placeholder">
                              <UserIcon size={24} />
                            </div>
                          )}
                        </div>
                        
                        <div className="users-search-card-info">
                          <h3 className="users-search-card-name">
                            {getUserDisplayName(user)}
                          </h3>
                          
                          <span className="users-search-card-badge">
                            {language === 'en' ? 'Artist' : 'არტისტი'}
                          </span>
                          
                          <p className="users-search-card-subtitle">
                            @{user.slug}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Products Tab Content */}
        {activeTab === 'products' && (
          <>
            {/* No Products Results State */}
            {!hasProducts && !isLoading && (
              <div className="users-search-no-results">
                <h2 className="users-search-no-results-title">
                  {language === 'en' ? 'No products found' : 'პროდუქტები არ მოიძებნა'}
                </h2>
                <p className="users-search-no-results-message">
                  {language === 'en' ? 'No products found for' : 'პროდუქტები არ მოიძებნა'} &ldquo;
                  <span className="users-search-keyword">
                    {decodeURIComponent(keyword || "")}
                  </span>
                  &rdquo;.
                  <br />
                  {language === 'en' ? 'Try different search terms' : 'სცადეთ სხვა საძიებო სიტყვები'}
                </p>
                <Link href="/shop" className="users-search-browse-button">
                  {language === 'en' ? 'Browse All Products' : 'ყველა პროდუქტის ნახვა'}
                </Link>
              </div>
            )}

            {/* Products Results Section */}
            {hasProducts && (
              <>
                <div className="users-search-results-info">
                  <p className="users-search-results-count">
                    {language === "en" ? "Found" : "ნაპოვნია"}{" "}
                    <span className="highlight">{productsData!.totalItems}</span>{" "}
                    {language === "en" 
                      ? (productsData!.totalItems === 1 ? "product" : "products") 
                      : "პროდუქტი"
                    } {language === "en" ? "for" : ""} &ldquo;
                    <span className="users-search-keyword">
                      {decodeURIComponent(keyword || "")}
                    </span>
                    &rdquo;{language === "en" ? "" : "-ისთვის"}
                  </p>
                </div>

                <div className="users-search-products-container">
                  <ProductGrid
                    products={productsData!.items}
                    searchKeyword={keyword}
                    currentPage={currentPage}
                    totalPages={productsData?.pages || 1}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function UsersSearchPage() {
  return (
    <Suspense fallback={<HeartLoading size="large" />}>
      <UsersSearchPageContent />
    </Suspense>
  );
}