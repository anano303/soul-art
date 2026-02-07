"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  Trophy,
  CreditCard,
  TrendingUp,
  Zap,
} from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import { useAuctionPolling } from "@/hooks/useAuctionPolling";
import {
  FlipClockTimer,
  AuctionAuthModal,
  useAuctionAuthModal,
  FacebookContinueButton,
  RelatedAuctions,
  AuctionComments,
} from "@/modules/auctions/components";
import "./auction-detail.css";

interface Bid {
  bidder: {
    _id: string;
    name?: string;
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
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  deliveryType: "SOULART" | "ARTIST";
  isPaid?: boolean;
  bids: Bid[];
  seller: {
    _id: string;
    name?: string;
    storeName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  currentWinner?: {
    _id: string;
    name?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    firstName?: string;
    lastName?: string;
  };
}

// Reserved route IDs that should not be treated as auction IDs
const RESERVED_ROUTES = ["create", "admin", "new"];

export default function AuctionDetailPage() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  // Auth modal for guest bidders
  const authModal = useAuctionAuthModal();

  // Handle reserved route IDs - redirect to the correct page
  useEffect(() => {
    if (RESERVED_ROUTES.includes(auctionId?.toLowerCase())) {
      router.replace(`/auctions/${auctionId}`);
    }
  }, [auctionId, router]);

  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState(0);
  const [bidding, setBidding] = useState(false);
  const [isEnded, setIsEnded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showNewBidAnimation, setShowNewBidAnimation] = useState(false);
  const lastBidCountRef = useRef(0);

  // Real-time polling for bid updates
  const { bidStatus, isExtended, refresh: refreshBidStatus } = useAuctionPolling({
    auctionId,
    enabled: auction?.status === "ACTIVE",
    onBidUpdate: (data) => {
      // Show animation when new bid comes in
      if (lastBidCountRef.current > 0 && data.totalBids > lastBidCountRef.current) {
        setShowNewBidAnimation(true);
        setTimeout(() => setShowNewBidAnimation(false), 2000);
        // Update bid amount to new minimum
        if (auction) {
          setBidAmount(data.currentPrice + auction.minimumBidIncrement);
        }
        toast.success(t("auctions.newBidReceived") || "ახალი ფსონი შემოვიდა!");
      }
      lastBidCountRef.current = data.totalBids;
    },
  });

  // Show time extension animation
  useEffect(() => {
    if (isExtended) {
      toast.success(t("auctions.timeExtended") || "დრო გაგრძელდა! +10 წამი", {
        icon: "⏰",
        duration: 3000,
      });
    }
  }, [isExtended, t]);

  const fetchAuction = useCallback(async () => {
    // Skip API call for reserved routes
    if (RESERVED_ROUTES.includes(auctionId?.toLowerCase())) {
      return;
    }
    try {
      const response = await apiClient.get(`/auctions/${auctionId}`);
      console.log("[Auction Debug] Full auction data:", response.data);
      console.log("[Auction Debug] Status:", response.data.status);
      console.log(
        "[Auction Debug] CurrentWinner:",
        response.data.currentWinner,
      );
      console.log("[Auction Debug] User ID:", user?._id);
      console.log(
        "[Auction Debug] Is winner match:",
        user?._id === response.data.currentWinner?._id,
      );
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
  }, [auctionId, router, t, user]);

  useEffect(() => {
    // Skip fetching for reserved routes - they will be redirected
    if (auctionId && !RESERVED_ROUTES.includes(auctionId?.toLowerCase())) {
      fetchAuction();
    }
  }, [auctionId, fetchAuction]);

  // Handle auction status changes
  useEffect(() => {
    if (!auction) return;

    // Mark as ended for cancelled auctions
    if (auction.status === "CANCELLED" || auction.status === "ENDED") {
      setIsEnded(true);
      return;
    }

    // For scheduled auctions, poll to check if it has started
    if (auction.status === "SCHEDULED") {
      const checkIfStarted = () => {
        const now = new Date().getTime();
        const startTime = new Date(auction.startDate).getTime();
        if (now >= startTime) {
          fetchAuction(); // Refresh to get updated status
        }
      };

      const interval = setInterval(checkIfStarted, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [auction, fetchAuction]);

  const getSellerName = () => {
    if (!auction?.seller)
      return t("auctions.unknownSeller") || "უცნობი ხელოვანი";
    const seller = auction.seller;
    // First try storeName for sellers
    if (seller.storeName) {
      return seller.storeName;
    }
    // Then try ownerFirstName/ownerLastName
    if (seller.ownerFirstName && seller.ownerLastName) {
      return `${seller.ownerFirstName} ${seller.ownerLastName}`;
    }
    // Then try name field (main user name)
    if (seller.name) {
      return seller.name;
    }
    // Legacy firstName/lastName
    if (seller.firstName && seller.lastName) {
      return `${seller.firstName} ${seller.lastName}`;
    }
    return t("auctions.unknownSeller") || "უცნობი ხელოვანი";
  };

  const getBidderName = (bid: Bid) => {
    // Skip if bidderName is "null null" or similar invalid value
    if (
      bid.bidderName &&
      bid.bidderName !== "null null" &&
      !bid.bidderName.includes("null")
    ) {
      return bid.bidderName;
    }
    if (!bid.bidder) return t("auctions.anonymousBidder") || "ანონიმური";
    // First try name field (main user name)
    if (bid.bidder.name) {
      return bid.bidder.name;
    }
    // Then try ownerFirstName/ownerLastName (for sellers)
    if (bid.bidder.ownerFirstName && bid.bidder.ownerLastName) {
      return `${bid.bidder.ownerFirstName} ${bid.bidder.ownerLastName}`;
    }
    // Legacy firstName/lastName
    if (bid.bidder.firstName && bid.bidder.lastName) {
      return `${bid.bidder.firstName} ${bid.bidder.lastName}`;
    }
    return t("auctions.anonymousBidder") || "ანონიმური";
  };

  const getWinnerName = () => {
    if (!auction?.currentWinner) return null;
    const winner = auction.currentWinner;
    // First try name field
    if (winner.name) {
      return winner.name;
    }
    // Then try ownerFirstName/ownerLastName
    if (winner.ownerFirstName && winner.ownerLastName) {
      return `${winner.ownerFirstName} ${winner.ownerLastName}`;
    }
    // Legacy firstName/lastName
    if (winner.firstName && winner.lastName) {
      return `${winner.firstName} ${winner.lastName}`;
    }
    // Fall back to highest bid from bids array
    if (auction.bids && auction.bids.length > 0) {
      const sortedBids = [...auction.bids].sort((a, b) => b.amount - a.amount);
      const highestBid = sortedBids[0];
      return getBidderName(highestBid);
    }
    return t("auctions.anonymousBidder") || "ანონიმური";
  };

  const isCurrentUserWinner = () => {
    if (!user || !auction?.currentWinner) return false;
    return user._id === auction.currentWinner._id;
  };

  const handlePayment = () => {
    router.push(`/checkout/auction/${auction?._id}`);
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
      // Show auth modal instead of redirecting
      authModal.open(() => {
        // This callback runs after successful login
        handlePlaceBid();
      });
      return;
    }

    if (!auction) return;

    const minBid = auction.currentPrice + auction.minimumBidIncrement;
    if (bidAmount < minBid) {
      toast.error(
        `${t("auctions.bidTooLow")} (${t("auctions.minimumBid")}: ${minBid.toFixed(2)} ₾)`,
      );
      return;
    }

    setBidding(true);
    try {
      const response = await apiClient.post("/auctions/bid", {
        auctionId: auction._id,
        bidAmount: bidAmount,
      });
      
      // Check for time extension
      if (response.data.wasExtended) {
        toast.success(t("auctions.yourBidExtendedTime") || "თქვენი ფსონით დრო გაგრძელდა!", {
          icon: "⏰",
          duration: 4000,
        });
      } else {
        toast.success(t("auctions.bidSuccess"));
      }
      
      fetchAuction(); // Refresh auction data
      refreshBidStatus(); // Refresh polling data
    } catch (error: unknown) {
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      const message =
        axiosError.response?.data?.message || t("auctions.bidError");
      toast.error(message);
    } finally {
      setBidding(false);
    }
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const year = date.getFullYear();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

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
      return `${day} ${monthsGe[date.getMonth()]}, ${year} - ${hour}:${minute}`;
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
  // Allow guests to see bid section - auth modal will handle login
  const canShowBidSection =
    (auction.status === "ACTIVE" || auction.status === "SCHEDULED") &&
    (!user || user._id !== auction.seller._id);
  const isPreBid = auction.status === "SCHEDULED";

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

          {/* ═══════════════════════════════════════════════════════════════════
              UNIFIED BIDDING CARD - Timer, Price, and Bid Controls
              ═══════════════════════════════════════════════════════════════════ */}
          {(auction.status === "ACTIVE" || auction.status === "SCHEDULED") && !isEnded && (
            <div className={`bidding-card ${auction.status === "SCHEDULED" ? "scheduled" : ""}`}>
              {/* Timer Label */}
              <div className="bidding-card-timer-label">
                {auction.status === "SCHEDULED" ? (
                  <span className="timer-label scheduled">{t("auctions.startsIn") || "დაიწყება"}</span>
                ) : (
                  <span className="timer-label">{t("auctions.timeLeft") || "დარჩენილია"}</span>
                )}
              </div>

              {/* Compact Timer */}
              <div className="bidding-card-timer">
                <FlipClockTimer
                  endDate={auction.status === "SCHEDULED" ? auction.startDate : (bidStatus?.endDate || auction.endDate)}
                  onTimeEnd={() => {
                    if (auction.status === "SCHEDULED") {
                      // Refresh auction when it starts
                      fetchAuction();
                    } else {
                      setIsEnded(true);
                      fetchAuction();
                    }
                  }}
                  isExtended={isExtended}
                  language={language === "ge" ? "ge" : "en"}
                />
                {isExtended && auction.status === "ACTIVE" && (
                  <div className="time-extended-badge compact">
                    <Zap size={14} />
                    <span>{t("auctions.timeWasExtended") || "+10 წამი!"}</span>
                  </div>
                )}
              </div>

              {/* Compact Price Info */}
              <div className={`bidding-card-pricing ${showNewBidAnimation ? "new-bid-pulse" : ""}`}>
                <div className="price-info-row">
                  <div className="price-item current">
                    <span className="price-label">
                      {auction.status === "SCHEDULED" 
                        ? (t("auctions.startingPrice") || "საწყისი ფასი")
                        : (t("auctions.currentPrice") || "მიმდინარე ფასი")}
                    </span>
                    <span className="price-value">{formatPrice(bidStatus?.currentPrice ?? auction.currentPrice)}</span>
                    {showNewBidAnimation && (
                      <div className="price-updated-badge">
                        <TrendingUp size={14} />
                      </div>
                    )}
                  </div>
                  <div className="price-divider" />
                  <div className="price-item step">
                    <span className="price-label">{t("auctions.minimumBid") || "მინ. ფსონი"}</span>
                    <span className="price-value">+{formatPrice(auction.minimumBidIncrement)}</span>
                  </div>
                </div>
              </div>

              {/* Bid Input - Now inside the card */}
              {canShowBidSection && (
                <div className="bidding-card-controls">
                  <div className="bid-controls-compact">
                    <button
                      className="bid-step-btn"
                      onClick={() => handleBidChange(-1)}
                      disabled={
                        bidAmount <=
                        (bidStatus?.currentPrice ?? auction.currentPrice) + auction.minimumBidIncrement
                      }
                    >
                      <Minus size={18} />
                    </button>
                    <div className="bid-input-wrapper">
                      <input
                        type="number"
                        className="bid-input"
                        value={bidAmount}
                        onChange={handleBidInputChange}
                        min={(bidStatus?.currentPrice ?? auction.currentPrice) + auction.minimumBidIncrement}
                        step={auction.minimumBidIncrement}
                      />
                      <span className="currency">₾</span>
                    </div>
                    <button
                      className="bid-step-btn"
                      onClick={() => handleBidChange(1)}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <button
                    className={`place-bid-btn ${isPreBid ? "pre-bid" : ""} ${!user ? "guest-bid" : ""}`}
                    onClick={handlePlaceBid}
                    disabled={bidding}
                  >
                    {bidding ? (
                      <span className="loading-text">...</span>
                    ) : (
                      <>
                        <Gavel size={18} />
                        {!user 
                          ? t("auctions.bidNow") || "დადე ფსონი"
                          : isPreBid
                            ? t("auctions.preBid") || "Pre-Bid"
                            : t("auctions.placeBid")}
                      </>
                    )}
                  </button>
                  {!user && (
                    <p className="guest-bid-hint">{t("auctions.loginRequiredAfterBid") || "ფსონის დასადებად საჭიროა ავტორიზაცია"}</p>
                  )}
                </div>
              )}

              {auction.status === "SCHEDULED" && (
                <div className="pre-bid-notice">
                  <Clock size={16} />
                  <span>{t("auctions.preBidNotice") || "აუქციონი ჯერ არ დაწყებულა. შეგიძლიათ Pre-Bid განათავსოთ!"}</span>
                </div>
              )}
            </div>
          )}

          {/* Fallback for ended auction */}
          {(auction.status === "ENDED" || isEnded) && (
            <div className="time-info-box ended-state">
              <Clock className="time-icon" size={24} />
              <div className="time-details">
                <span className="time-label">{t("auctions.auctionEnded")}</span>
                <span className="time-value ended">{t("auctions.ended")}</span>
              </div>
            </div>
          )}

          {/* End Date - Only show for active auction (start date is irrelevant once started) */}
          {auction.status === "ACTIVE" && !isEnded && (
            <div className="end-date-info">
              <span className="end-date-label">{t("auctions.endsAt") || "დასრულდება"}:</span>
              <span className="end-date-value">{formatDate(bidStatus?.endDate || auction.endDate)}</span>
            </div>
          )}

          {/* For scheduled auctions, show both dates */}
          {auction.status === "SCHEDULED" && (
            <div className="dates-grid">
              <div className="date-card">
                <div className="date-card-icon">📅</div>
                <div className="date-card-content">
                  <span className="date-card-label">{t("auctions.startDate") || "დაწყება"}</span>
                  <span className="date-card-value">{formatDate(auction.startDate)}</span>
                </div>
              </div>
              <div className="date-card">
                <div className="date-card-icon">⏰</div>
                <div className="date-card-content">
                  <span className="date-card-label">{t("auctions.endDate") || "დასრულება"}</span>
                  <span className="date-card-value">{formatDate(auction.endDate)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Bid Stats - with real-time updates */}
          <div className="bid-stats">
            <div className="stat-item">
              <Users size={20} />
              <span>
                <strong>{bidStatus?.totalBids ?? auction.totalBids}</strong> {t("auctions.bids")}
              </span>
            </div>
            {/* Show highest bid amount */}
            {auction.currentPrice > auction.startingPrice && (
              <div className="stat-item highest-bid">
                <span>
                  {t("auctions.highestBid") || "მაღალი ფსონი"}:{" "}
                  <strong>{formatPrice(auction.currentPrice)}</strong>
                </span>
              </div>
            )}
            {/* Show highest bidder - try currentWinner first, then fall back to bids */}
            {(auction.currentWinner ||
              (auction.bids && auction.bids.length > 0)) && (
              <div className="stat-item winner">
                <Gavel size={20} />
                <span>
                  {t("auctions.highestBidder") || "ლიდერი"}:{" "}
                  <strong>
                    {(() => {
                      // First try currentWinner with full name
                      if (auction.currentWinner) {
                        const winner = auction.currentWinner;
                        // Try name field first
                        if (winner.name) {
                          return winner.name;
                        }
                        // Then try ownerFirstName/ownerLastName
                        if (winner.ownerFirstName && winner.ownerLastName) {
                          return `${winner.ownerFirstName} ${winner.ownerLastName}`;
                        }
                        // Then try firstName/lastName
                        if (winner.firstName && winner.lastName) {
                          return `${winner.firstName} ${winner.lastName}`;
                        }
                      }
                      // Fall back to highest bid from bids array
                      if (auction.bids && auction.bids.length > 0) {
                        const sortedBids = [...auction.bids].sort(
                          (a, b) => b.amount - a.amount,
                        );
                        const highestBid = sortedBids[0];
                        return getBidderName(highestBid);
                      }
                      return t("auctions.anonymousBidder") || "ანონიმური";
                    })()}
                  </strong>
                </span>
              </div>
            )}
          </div>

          {/* Winner Section - Show when auction is ended */}
          {auction.status === "ENDED" && auction.currentWinner && (
            <div
              className={`winner-section ${isCurrentUserWinner() ? "is-winner" : ""}`}
            >
              <div className="winner-header">
                <Trophy size={24} className="trophy-icon" />
                <h3>
                  {t("auctions.auctionWinner") || "აუქციონის გამარჯვებული"}
                </h3>
              </div>
              <div className="winner-info">
                <span className="winner-name">{getWinnerName()}</span>
                <span className="winning-amount">
                  {t("auctions.winningBid") || "მოგებული ფასი"}:{" "}
                  {formatPrice(auction.currentPrice)}
                </span>
              </div>
              {isCurrentUserWinner() && (
                <div className="winner-actions">
                  {auction.isPaid ? (
                    <p className="paid-notice">
                      ✅ {t("auctions.alreadyPaid") || "გადახდა შესრულებულია"}
                    </p>
                  ) : (
                    <>
                      <p className="congratulations">
                        🎉{" "}
                        {t("auctions.congratulations") ||
                          "გილოცავთ! თქვენ მოიგეთ ეს აუქციონი!"}
                      </p>
                      <button className="payment-btn" onClick={handlePayment}>
                        <CreditCard size={20} />
                        {t("auctions.proceedToPayment") || "გადახდა"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Details */}
          <div className="artwork-details">
            <h3>{t("auctions.description")}</h3>
            <p>{auction.description}</p>

            <div className="detail-tags">
              <div className="detail-tag">
                <Palette size={16} />
                <span>{auction.material}</span>
              </div>
              <div className="detail-tag">
                <Ruler size={16} />
                <span>{auction.dimensions}</span>
              </div>
              <div className="detail-tag">
                <Package size={16} />
                <span>
                  {auction.deliveryDaysMin === auction.deliveryDaysMax
                    ? `${auction.deliveryDaysMin} ${t("auctions.days") || "დღე"}`
                    : `${auction.deliveryDaysMin}-${auction.deliveryDaysMax} ${t("auctions.days") || "დღე"}`}
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
                      new Date(a.timestamp).getTime(),
                  )
                  .slice(0, 10)
                  .map((bid, index) => (
                    <div
                      key={index}
                      className={`bid-item ${index === 0 ? "highest" : ""}`}
                    >
                      <div className="bidder-info">
                        <span className="bidder-name">
                          {getBidderName(bid)}
                        </span>
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

      {/* Facebook Continue Button for returning FB users */}
      <FacebookContinueButton />

      {/* Comments Section */}
      <AuctionComments auctionId={auctionId} onAuthRequired={authModal.open} />

      {/* Related Auctions Section */}
      <RelatedAuctions currentAuctionId={auctionId} maxItems={4} />

      {/* Auth Modal for guest bidders */}
      <AuctionAuthModal
        isOpen={authModal.isOpen}
        onClose={authModal.close}
        onLoginSuccess={authModal.onLoginSuccess}
        auctionTitle={auction.title}
        currentPrice={bidAmount}
      />
    </div>
  );
}
