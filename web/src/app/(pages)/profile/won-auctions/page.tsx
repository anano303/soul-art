"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { toast } from "react-hot-toast";
import {
  Trophy,
  CreditCard,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import "./won-auctions.css";

interface WonAuction {
  _id: string;
  title: string;
  mainImage: string;
  currentPrice: number;
  endDate: string;
  endedAt?: string;
  isPaid: boolean;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  seller: {
    _id: string;
    name?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    storeName?: string;
  };
}

export default function WonAuctionsPage() {
  const { language } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useUser();
  const [auctions, setAuctions] = useState<WonAuction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWonAuctions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<WonAuction[]>(
        "/auctions/my-wins/all",
      );
      setAuctions(response.data || []);
    } catch (error: unknown) {
      console.error("Failed to load won auctions", error);
      toast.error(
        language === "en"
          ? "Failed to load won auctions"
          : "მოგებული აუქციონების ჩატვირთვა ვერ მოხერხდა",
      );
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    if (!isLoading && user) {
      fetchWonAuctions();
    }
  }, [isLoading, user, fetchWonAuctions]);

  // Show success toast if redirected from payment success
  useEffect(() => {
    const paidAuctionId = searchParams?.get("paid");
    if (paidAuctionId) {
      toast.success(
        language === "en"
          ? "Payment completed successfully!"
          : "გადახდა წარმატებით დასრულდა!",
      );
      // Remove the query param from URL without refreshing
      router.replace("/profile/won-auctions", { scroll: false });
    }
  }, [searchParams, language, router]);

  const getSellerName = (auction: WonAuction) => {
    const seller = auction.seller;
    if (!seller)
      return language === "en" ? "Unknown Artist" : "უცნობი ხელოვანი";
    if (seller.storeName) return seller.storeName;
    if (seller.ownerFirstName && seller.ownerLastName) {
      return `${seller.ownerFirstName} ${seller.ownerLastName}`;
    }
    if (seller.name) return seller.name;
    return language === "en" ? "Unknown Artist" : "უცნობი ხელოვანი";
  };

  const handlePayment = (auction: WonAuction) => {
    // Store auction checkout data in sessionStorage
    const auctionCheckoutItem = {
      auctionId: auction._id,
      productId: auction._id,
      isAuction: true,
      name: auction.title,
      image: auction.mainImage,
      price: auction.currentPrice,
      countInStock: 1,
      qty: 1,
      sellerId: auction.seller._id,
      deliveryDaysMin: auction.deliveryDaysMin,
      deliveryDaysMax: auction.deliveryDaysMax,
    };
    sessionStorage.setItem(
      "auction_checkout_item",
      JSON.stringify(auctionCheckoutItem),
    );

    // Redirect to streamlined checkout with auction param
    router.push(`/checkout/streamlined?auction=${auction._id}`);
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (language === "ge") {
      const monthsGe = [
        "იანვარი",
        "თებერვალი",
        "მარტი",
        "აპრილი",
        "მაისი",
        "ივნისი",
        "ივლისი",
        "აგვისტო",
        "სექტემბერი",
        "ოქტომბერი",
        "ნოემბერი",
        "დეკემბერი",
      ];
      return `${date.getDate()} ${monthsGe[date.getMonth()]}, ${date.getFullYear()}`;
    }
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const pendingAuctions = auctions.filter((a) => !a.isPaid);
  const paidAuctions = auctions.filter((a) => a.isPaid);

  if (loading) {
    return (
      <div className="won-auctions-page">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{language === "en" ? "Loading..." : "იტვირთება..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="won-auctions-page">
      <div className="won-auctions-header">
        <div className="header-icon">
          <Trophy size={32} />
        </div>
        <div>
          <h1 className="won-auctions-title">
            {language === "en" ? "Won Auctions" : "მოგებული აუქციონები"}
          </h1>
          <p className="won-auctions-subtitle">
            {language === "en"
              ? "View all auctions you've won and manage payments"
              : "ნახეთ ყველა მოგებული აუქციონი და მართეთ გადახდები"}
          </p>
        </div>
      </div>

      {auctions.length === 0 ? (
        <div className="empty-state">
          <Trophy size={64} className="empty-icon" />
          <h3>
            {language === "en"
              ? "No won auctions yet"
              : "ჯერ არ გაქვთ მოგებული აუქციონი"}
          </h3>
          <p>
            {language === "en"
              ? "When you win an auction, it will appear here"
              : "როცა აუქციონს მოიგებთ, აქ გამოჩნდება"}
          </p>
          <Link href="/auctions" className="browse-link">
            {language === "en" ? "Browse Auctions" : "აუქციონების ნახვა"}
          </Link>
        </div>
      ) : (
        <>
          {/* Pending Payment Section */}
          {pendingAuctions.length > 0 && (
            <div className="auctions-section">
              <div className="section-header pending">
                <Clock size={20} />
                <h2>
                  {language === "en" ? "Pending Payment" : "გადახდის მოლოდინში"}
                  <span className="count">({pendingAuctions.length})</span>
                </h2>
              </div>
              <div className="auctions-grid">
                {pendingAuctions.map((auction) => (
                  <div key={auction._id} className="auction-card pending">
                    <div className="auction-image">
                      <Image
                        src={auction.mainImage}
                        alt={auction.title}
                        fill
                        className="image"
                      />
                      <div className="status-badge pending">
                        <Clock size={14} />
                        <span>
                          {language === "en"
                            ? "Awaiting Payment"
                            : "გადახდის მოლოდინში"}
                        </span>
                      </div>
                    </div>
                    <div className="auction-details">
                      <h3 className="auction-title">{auction.title}</h3>
                      <p className="seller-name">{getSellerName(auction)}</p>
                      <div className="price-row">
                        <span className="label">
                          {language === "en" ? "Won for:" : "მოიგეთ:"}
                        </span>
                        <span className="price">
                          {formatPrice(auction.currentPrice)}
                        </span>
                      </div>
                      <p className="date">
                        {language === "en" ? "Ended:" : "დასრულდა:"}{" "}
                        {formatDate(auction.endedAt || auction.endDate)}
                      </p>
                      <button
                        onClick={() => handlePayment(auction)}
                        className="payment-btn"
                      >
                        <CreditCard size={18} />
                        <span>{language === "en" ? "Pay Now" : "გადახდა"}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paid Section */}
          {paidAuctions.length > 0 && (
            <div className="auctions-section">
              <div className="section-header paid">
                <CheckCircle size={20} />
                <h2>
                  {language === "en" ? "Completed" : "დასრულებული"}
                  <span className="count">({paidAuctions.length})</span>
                </h2>
              </div>
              <div className="auctions-grid">
                {paidAuctions.map((auction) => (
                  <div key={auction._id} className="auction-card paid">
                    <div className="auction-image">
                      <Image
                        src={auction.mainImage}
                        alt={auction.title}
                        fill
                        className="image"
                      />
                      <div className="status-badge paid">
                        <CheckCircle size={14} />
                        <span>{language === "en" ? "Paid" : "გადახდილია"}</span>
                      </div>
                    </div>
                    <div className="auction-details">
                      <h3 className="auction-title">{auction.title}</h3>
                      <p className="seller-name">{getSellerName(auction)}</p>
                      <div className="price-row">
                        <span className="label">
                          {language === "en" ? "Won for:" : "მოიგეთ:"}
                        </span>
                        <span className="price">
                          {formatPrice(auction.currentPrice)}
                        </span>
                      </div>
                      <p className="date">
                        {language === "en" ? "Ended:" : "დასრულდა:"}{" "}
                        {formatDate(auction.endedAt || auction.endDate)}
                      </p>
                      <Link
                        href={`/auctions/${auction._id}`}
                        className="view-btn"
                      >
                        <ExternalLink size={16} />
                        <span>
                          {language === "en" ? "View Details" : "დეტალები"}
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
