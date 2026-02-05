"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Users,
  Palette,
  Ruler,
  Package,
  ArrowLeft,
  Minus,
  Plus,
  Gavel,
} from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import "./auction-detail.css";

interface Bid {
  bidder: {
    _id: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
  };
  amount: number;
  timestamp: string;
  bidderName?: string;
}

interface Auction {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  additionalImages?: string[];
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  startingPrice: number;
  currentPrice: number;
  minimumBidIncrement: number;
  startDate: string;
  endDate: string;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  totalBids: number;
  deliveryDays: number;
  deliveryInfo: string;
  bids: Bid[];
  seller: {
    _id: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  currentWinner?: {
    _id: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
  };
}

export default function AuctionDetailPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");
  const [isEnded, setIsEnded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  const fetchAuction = useCallback(async () => {
    try {
      const response = await apiClient.get(`/auctions/${auctionId}`);
      setAuction(response.data);
      // Set initial bid amount to minimum next bid
      const minBid =
        response.data.currentPrice + response.data.minimumBidIncrement;
      setBidAmount(minBid);
    } catch (error) {
      console.error("Failed to fetch auction:", error);
      toast.error(t("auctions.loadError") || "Failed to load auction");
      router.push("/auctions");
    } finally {
      setLoading(false);
    }
  }, [auctionId, router, t]);

  useEffect(() => {
    if (auctionId) {
      fetchAuction();
    }
  }, [auctionId, fetchAuction]);

  // Update time left
  useEffect(() => {
    if (!auction) return;

    if (auction.status === "CANCELLED") {
      setIsEnded(true);
      setTimeLeft(t("auctions.status.cancelled"));
      return;
    }

    if (auction.status === "SCHEDULED") {
      const calculateStartTime = () => {
        const now = new Date().getTime();
        const startTime = new Date(auction.startDate).getTime();
        const difference = startTime - now;

        if (difference <= 0) {
          fetchAuction(); // Refresh to get updated status
          return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );

        if (days > 0) {
          setTimeLeft(`${days}დ ${hours}ს ${minutes}წთ`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}ს ${minutes}წთ`);
        } else {
          setTimeLeft(`${minutes}წთ`);
        }
      };

      calculateStartTime();
      const interval = setInterval(calculateStartTime, 60000);
      return () => clearInterval(interval);
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(auction.endDate).getTime();
      const difference = endTime - now;

      if (difference <= 0 || auction.status === "ENDED") {
        setIsEnded(true);
        setTimeLeft(t("auctions.ended"));
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days}დ ${hours}ს ${minutes}წთ`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}ს ${minutes}წთ`);
      } else {
        setTimeLeft(`${minutes}წთ`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [auction, t, fetchAuction]);

  const getSellerName = () => {
    if (!auction) return "";
    if (auction.seller.ownerFirstName && auction.seller.ownerLastName) {
      return `${auction.seller.ownerFirstName} ${auction.seller.ownerLastName}`;
    }
    if (auction.seller.firstName && auction.seller.lastName) {
      return `${auction.seller.firstName} ${auction.seller.lastName}`;
    }
    return t("auctions.unknownSeller") || "Unknown Seller";
  };

  const getBidderName = (bid: Bid) => {
    if (bid.bidderName) return bid.bidderName;
    if (bid.bidder.ownerFirstName && bid.bidder.ownerLastName) {
      return `${bid.bidder.ownerFirstName} ${bid.bidder.ownerLastName}`;
    }
    if (bid.bidder.firstName && bid.bidder.lastName) {
      return `${bid.bidder.firstName} ${bid.bidder.lastName}`;
    }
    return t("auctions.anonymousBidder") || "Anonymous";
  };

  const handleBidChange = (delta: number) => {
    if (!auction) return;
    const minBid = auction.currentPrice + auction.minimumBidIncrement;
    const newAmount = bidAmount + delta * auction.minimumBidIncrement;
    if (newAmount >= minBid) {
      setBidAmount(newAmount);
    }
  };

  const handleBidInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    setBidAmount(value);
  };

  const handlePlaceBid = async () => {
    if (!user) {
      toast.error(t("auctions.loginRequired"));
      router.push("/login");
      return;
    }

    if (!auction) return;

    const minBid = auction.currentPrice + auction.minimumBidIncrement;
    if (bidAmount < minBid) {
      toast.error(
        `${t("auctions.bidTooLow")} (${t("auctions.minimumBid")}: ${minBid.toFixed(2)} ₾)`
      );
      return;
    }

    setBidding(true);
    try {
      await apiClient.post("/auctions/bid", {
        auctionId: auction._id,
        bidAmount: bidAmount,
      });
      toast.success(t("auctions.bidSuccess"));
      fetchAuction(); // Refresh auction data
    } catch (error: any) {
      const message =
        error.response?.data?.message || t("auctions.bidError");
      toast.error(message);
    } finally {
      setBidding(false);
    }
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(
      language === "ge" ? "ka-GE" : "en-US",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  };

  if (loading) {
    return (
      <div className="auction-detail-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>{t("auctions.loading")}</p>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="auction-detail-container">
        <div className="empty-state">
          <h3>{t("auctions.notFound") || "Auction not found"}</h3>
          <Link href="/auctions" className="back-link">
            <ArrowLeft size={20} />
            {t("auctions.backToAuctions") || "Back to auctions"}
          </Link>
        </div>
      </div>
    );
  }

  const allImages = [auction.mainImage, ...(auction.additionalImages || [])];
  const canBid =
    auction.status === "ACTIVE" && user && user._id !== auction.seller._id;

  return (
    <div className="auction-detail-container">
      <div className="auction-detail-header">
        <Link href="/auctions" className="back-link">
          <ArrowLeft size={20} />
          {t("auctions.backToAuctions") || "ყველა აუქციონი"}
        </Link>
      </div>

      <div className="auction-detail-content">
        {/* Left: Images */}
        <div className="auction-images-section">
          <div className="main-image-container">
            <Image
              src={allImages[selectedImage]}
              alt={auction.title}
              fill
              className="main-image"
              priority
            />
            {auction.status !== "ACTIVE" && (
              <div className="status-overlay">
                <span className="status-text">
                  {t(`auctions.status.${auction.status.toLowerCase()}`)}
                </span>
              </div>
            )}
          </div>

          {allImages.length > 1 && (
            <div className="image-thumbnails">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  className={`thumbnail ${selectedImage === index ? "active" : ""}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <Image src={img} alt={`${auction.title} ${index + 1}`} fill />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="auction-info-section">
          <div className="artwork-type-badge">
            <span className={auction.artworkType.toLowerCase()}>
              {auction.artworkType === "ORIGINAL"
                ? t("auctions.type.original")
                : t("auctions.type.reproduction")}
            </span>
          </div>

          <h1 className="auction-title">{auction.title}</h1>

          <div className="seller-info">
            <span className="label">{t("auctions.seller")}:</span>
            <span className="value">{getSellerName()}</span>
          </div>

          {/* Time Info */}
          <div className="time-info-box">
            <Clock className="time-icon" size={24} />
            <div className="time-details">
              {auction.status === "SCHEDULED" ? (
                <>
                  <span className="time-label">
                    {t("auctions.startsIn") || "დაიწყება"}
                  </span>
                  <span className="time-value scheduled">{timeLeft}</span>
                </>
              ) : isEnded ? (
                <>
                  <span className="time-label">{t("auctions.auctionEnded")}</span>
                  <span className="time-value ended">{t("auctions.ended")}</span>
                </>
              ) : (
                <>
                  <span className="time-label">{t("auctions.timeLeft")}</span>
                  <span className="time-value">{timeLeft}</span>
                </>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="pricing-section">
            <div className="price-row current">
              <span className="label">{t("auctions.currentPrice")}:</span>
              <span className="price">{formatPrice(auction.currentPrice)}</span>
            </div>
            <div className="price-row">
              <span className="label">{t("auctions.startingPrice") || "საწყისი ფასი"}:</span>
              <span className="starting-price">
                {formatPrice(auction.startingPrice)}
              </span>
            </div>
            <div className="price-row">
              <span className="label">{t("auctions.minimumBid")}:</span>
              <span className="min-bid">
                +{formatPrice(auction.minimumBidIncrement)}
              </span>
            </div>
          </div>

          {/* Bid Stats */}
          <div className="bid-stats">
            <div className="stat-item">
              <Users size={20} />
              <span>
                <strong>{auction.totalBids}</strong>{" "}
                {t("auctions.bids")}
              </span>
            </div>
            {auction.currentWinner && (
              <div className="stat-item winner">
                <Gavel size={20} />
                <span>
                  {t("auctions.highestBidder")}:{" "}
                  <strong>
                    {auction.currentWinner.ownerFirstName ||
                      auction.currentWinner.firstName}{" "}
                    {auction.currentWinner.ownerLastName?.charAt(0) ||
                      auction.currentWinner.lastName?.charAt(0)}.
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Bid Input */}
          {canBid && (
            <div className="bid-input-section">
              <label className="bid-label">{t("auctions.yourBid")}:</label>
              <div className="bid-controls">
                <button
                  className="bid-step-btn"
                  onClick={() => handleBidChange(-1)}
                  disabled={
                    bidAmount <=
                    auction.currentPrice + auction.minimumBidIncrement
                  }
                >
                  <Minus size={20} />
                </button>
                <div className="bid-input-wrapper">
                  <input
                    type="number"
                    className="bid-input"
                    value={bidAmount}
                    onChange={handleBidInputChange}
                    min={auction.currentPrice + auction.minimumBidIncrement}
                    step={auction.minimumBidIncrement}
                  />
                  <span className="currency">₾</span>
                </div>
                <button
                  className="bid-step-btn"
                  onClick={() => handleBidChange(1)}
                >
                  <Plus size={20} />
                </button>
              </div>
              <button
                className="place-bid-btn"
                onClick={handlePlaceBid}
                disabled={bidding}
              >
                {bidding ? (
                  <span className="loading-text">...</span>
                ) : (
                  <>
                    <Gavel size={20} />
                    {t("auctions.placeBid")}
                  </>
                )}
              </button>
            </div>
          )}

          {auction.status === "SCHEDULED" && (
            <div className="scheduled-notice">
              <Clock size={20} />
              <span>
                {t("auctions.scheduledNotice") ||
                  "ეს აუქციონი ჯერ არ დაწყებულა. დაელოდეთ დაწყების დროს."}
              </span>
            </div>
          )}

          {!user && auction.status === "ACTIVE" && (
            <div className="login-notice">
              <Link href="/login" className="login-link">
                {t("auctions.loginRequired")}
              </Link>
            </div>
          )}

          {/* Details */}
          <div className="artwork-details">
            <h3>{t("auctions.description")}</h3>
            <p>{auction.description}</p>

            <div className="detail-grid">
              <div className="detail-item">
                <Palette size={18} />
                <span className="label">{t("auctions.material") || "მასალა"}:</span>
                <span className="value">{auction.material}</span>
              </div>
              <div className="detail-item">
                <Ruler size={18} />
                <span className="label">{t("auctions.dimensions")}:</span>
                <span className="value">{auction.dimensions}</span>
              </div>
              <div className="detail-item">
                <Package size={18} />
                <span className="label">{t("auctions.deliveryInfo")}:</span>
                <span className="value">
                  {auction.deliveryDays} {t("auctions.days")} - {auction.deliveryInfo}
                </span>
              </div>
            </div>
          </div>

          {/* Bid History */}
          {auction.bids && auction.bids.length > 0 && (
            <div className="bid-history">
              <h3>{t("auctions.bidHistory")}</h3>
              <div className="bid-list">
                {auction.bids
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.timestamp).getTime() -
                      new Date(a.timestamp).getTime()
                  )
                  .slice(0, 10)
                  .map((bid, index) => (
                    <div
                      key={index}
                      className={`bid-item ${index === 0 ? "highest" : ""}`}
                    >
                      <div className="bidder-info">
                        <span className="bidder-name">{getBidderName(bid)}</span>
                        <span className="bid-time">
                          {formatDate(bid.timestamp)}
                        </span>
                      </div>
                      <span className="bid-amount">
                        {formatPrice(bid.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
