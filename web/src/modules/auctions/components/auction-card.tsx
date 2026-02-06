"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Users,
  Palette,
  Ruler,
  ChevronDown,
  ChevronUp,
  Minus,
  Plus,
  Gavel,
  Package,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  CreditCard,
  Trophy,
} from "lucide-react";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { apiClient } from "@/lib/axios";
import { toast } from "react-hot-toast";
import "./auction-card.css";

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
  deliveryType?: string;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  totalBids: number;
  isPaid?: boolean;
  bids?: Bid[];
  seller: {
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    storeName?: string;
  };
  currentWinner?: {
    _id?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
  };
}

interface AuctionCardProps {
  auction: Auction;
  onBidPlaced?: () => void;
}

export default function AuctionCard({
  auction,
  onBidPlaced,
}: AuctionCardProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [timeLeft, setTimeLeft] = useState("");
  const [startsIn, setStartsIn] = useState("");
  const [isEnded, setIsEnded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [bidAmount, setBidAmount] = useState(
    auction.currentPrice + auction.minimumBidIncrement,
  );
  const [bidding, setBidding] = useState(false);
  const [currentAuction, setCurrentAuction] = useState(auction);

  // Gallery/Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const allImages = [
    currentAuction.mainImage,
    ...(currentAuction.additionalImages || []),
  ];

  const getSellerName = () => {
    // 1. Try ownerFirstName + ownerLastName (seller profile) - priority
    if (
      currentAuction.seller.ownerFirstName &&
      currentAuction.seller.ownerLastName
    ) {
      return `${currentAuction.seller.ownerFirstName} ${currentAuction.seller.ownerLastName}`;
    }
    // 2. Try ownerFirstName only
    if (currentAuction.seller.ownerFirstName) {
      return currentAuction.seller.ownerFirstName;
    }
    // 3. Fallback to name (user's display name)
    if (currentAuction.seller.name) {
      return currentAuction.seller.name;
    }
    // 4. Try storeName
    if (currentAuction.seller.storeName) {
      return currentAuction.seller.storeName;
    }
    return t("auctions.unknownSeller") || "Unknown Artist";
  };

  useEffect(() => {
    setCurrentAuction(auction);
    setBidAmount(auction.currentPrice + auction.minimumBidIncrement);
  }, [auction]);

  // Calculate time until start (for SCHEDULED)
  useEffect(() => {
    if (currentAuction.status !== "SCHEDULED") return;

    const calculateStartsIn = () => {
      const now = new Date().getTime();
      const startTime = new Date(currentAuction.startDate).getTime();
      const difference = startTime - now;

      if (difference <= 0) {
        setStartsIn("");
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setStartsIn(
          `${days}${t("auctions.days")} ${hours}${t("auctions.hours")}`,
        );
      } else if (hours > 0) {
        setStartsIn(
          `${hours}${t("auctions.hours")} ${minutes}${t("auctions.minutes")}`,
        );
      } else {
        setStartsIn(`${minutes}${t("auctions.minutes")}`);
      }
    };

    calculateStartsIn();
    const interval = setInterval(calculateStartsIn, 60000);
    return () => clearInterval(interval);
  }, [currentAuction.startDate, currentAuction.status, t]);

  // Calculate time left (for ACTIVE)
  useEffect(() => {
    if (currentAuction.status === "CANCELLED") {
      setIsEnded(true);
      setTimeLeft(t("auctions.status.cancelled"));
      return;
    }

    if (currentAuction.status === "SCHEDULED") {
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const endTime = new Date(currentAuction.endDate).getTime();
      const difference = endTime - now;

      if (difference <= 0 || currentAuction.status === "ENDED") {
        setIsEnded(true);
        setTimeLeft(t("auctions.ended"));
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(
          `${days}${t("auctions.days")} ${hours}${t("auctions.hours")} ${minutes}${t("auctions.minutes")}`,
        );
      } else if (hours > 0) {
        setTimeLeft(
          `${hours}${t("auctions.hours")} ${minutes}${t("auctions.minutes")}`,
        );
      } else {
        setTimeLeft(`${minutes}${t("auctions.minutes")}`);
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [currentAuction.endDate, currentAuction.status, t]);

  // Computed delivery days text
  const deliveryDaysText = (() => {
    const minDays = currentAuction.deliveryDaysMin ?? 1;
    const maxDays = currentAuction.deliveryDaysMax ?? 3;
    const daysLabel = language === "ge" ? "დღე" : "days";
    return minDays === maxDays
      ? `${minDays} ${daysLabel}`
      : `${minDays}-${maxDays} ${daysLabel}`;
  })();

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate();
    const hour = date.getHours().toString().padStart(2, "0");
    const minute = date.getMinutes().toString().padStart(2, "0");

    if (language === "ge") {
      const monthsGe = [
        "იან",
        "თებ",
        "მარ",
        "აპრ",
        "მაი",
        "ივნ",
        "ივლ",
        "აგვ",
        "სექ",
        "ოქტ",
        "ნოე",
        "დეკ",
      ];
      return `${day} ${monthsGe[date.getMonth()]}, ${hour}:${minute}`;
    }

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleBidChange = (delta: number) => {
    const minBid =
      currentAuction.currentPrice + currentAuction.minimumBidIncrement;
    const newAmount = bidAmount + delta * currentAuction.minimumBidIncrement;
    if (newAmount >= minBid) {
      setBidAmount(newAmount);
    }
  };

  const handlePlaceBid = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!user) {
      toast.error(t("auctions.loginRequired"));
      return;
    }

    const minBid =
      currentAuction.currentPrice + currentAuction.minimumBidIncrement;
    if (bidAmount < minBid) {
      toast.error(
        `${t("auctions.bidTooLow")} (${t("auctions.minimumBid")}: ${minBid.toFixed(2)} ₾)`,
      );
      return;
    }

    setBidding(true);
    try {
      const response = await apiClient.post("/auctions/bid", {
        auctionId: currentAuction._id,
        bidAmount: bidAmount,
      });
      toast.success(t("auctions.bidSuccess"));

      if (response.data) {
        setCurrentAuction((prev) => ({
          ...prev,
          currentPrice: bidAmount,
          totalBids: prev.totalBids + 1,
        }));
        setBidAmount(bidAmount + currentAuction.minimumBidIncrement);
      }

      if (onBidPlaced) {
        onBidPlaced();
      }
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

  // Lightbox handlers
  const openLightbox = (index: number = 0) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    document.body.style.overflow = "";
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex(
      (prev) => (prev - 1 + allImages.length) % allImages.length,
    );
  };

  const endedLabel =
    currentAuction.status === "CANCELLED"
      ? t("auctions.status.cancelled")
      : t("auctions.ended");

  const canBid =
    (currentAuction.status === "ACTIVE" ||
      currentAuction.status === "SCHEDULED") &&
    user &&
    user._id !== currentAuction.seller._id;

  const isPreBid = currentAuction.status === "SCHEDULED";
  const isScheduled = currentAuction.status === "SCHEDULED";

  return (
    <>
      <div
        className={`auction-card ${isEnded ? "ended" : ""} ${isExpanded ? "expanded" : ""} ${isScheduled ? "scheduled" : ""}`}
      >
        {/* Image with overlay info */}
        <div className="auction-image-section" onClick={() => openLightbox(0)}>
          <div className="auction-main-image">
            <Image
              src={currentAuction.mainImage}
              alt={currentAuction.title}
              fill
              className="auction-image"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />

            {/* Zoom indicator */}
            <div className="zoom-indicator">
              <ZoomIn size={20} />
            </div>

            {/* Image count badge */}
            {allImages.length > 1 && (
              <div className="image-count-badge">
                <span>1/{allImages.length}</span>
              </div>
            )}

            {/* Status badges */}
            <div className="auction-badges">
              <span
                className={`type-badge ${currentAuction.artworkType.toLowerCase()}`}
              >
                {currentAuction.artworkType === "ORIGINAL"
                  ? t("auctions.type.original")
                  : t("auctions.type.reproduction")}
              </span>
            </div>

            {/* Overlay for ended/scheduled */}
            {isEnded && (
              <div className="status-overlay ended">
                <span>{endedLabel}</span>
              </div>
            )}
            {isScheduled && (
              <div className="status-overlay scheduled">
                <span>
                  {t("auctions.startsIn")}: {startsIn}
                </span>
              </div>
            )}
          </div>

          {/* Info overlay on image - clickable to detail page */}
          <Link
            href={`/auctions/${currentAuction._id}`}
            className="image-info-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="auction-title">{currentAuction.title}</h3>
            <div className="overlay-row">
              <span className="artist-name">
                <span className="artist-label">{t("auctions.seller")}:</span>{" "}
                {getSellerName()}
              </span>
              <span className="current-price">
                {formatPrice(currentAuction.currentPrice)}
              </span>
            </div>
            <div className="overlay-row sub-info">
              <span className="time-info">
                <Clock size={14} />
                {isScheduled ? formatDate(currentAuction.startDate) : timeLeft}
              </span>
              <span className="bids-info">
                <Users size={14} />
                {currentAuction.totalBids} {t("auctions.bids")}
              </span>
              <span className="delivery-info">
                <Package size={14} />
                {deliveryDaysText}
              </span>
            </div>
          </Link>
        </div>

        {/* Expand button */}
        <button
          className="expand-btn"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? (
            <>
              <span>{language === "ge" ? "ნაკლები" : "Less"}</span>
              <ChevronUp size={18} />
            </>
          ) : (
            <>
              <span>
                {language === "ge" ? "მეტი ინფო და ბიდი" : "More info & Bid"}
              </span>
              <ChevronDown size={18} />
            </>
          )}
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="auction-expanded">
            {/* Price details */}
            <div className="price-details">
              <div className="price-row">
                <span className="label">{t("auctions.startingPrice")}:</span>
                <span className="value">
                  {formatPrice(currentAuction.startingPrice)}
                </span>
              </div>
              <div className="price-row">
                <span className="label">{t("auctions.minimumBid")}:</span>
                <span className="value accent">
                  +{formatPrice(currentAuction.minimumBidIncrement)}
                </span>
              </div>
            </div>

            {/* Time details */}
            <div className="time-details">
              <div className="time-row">
                <Calendar size={10} />
                <span>{formatDate(currentAuction.startDate)}</span>
              </div>
              <div className="time-row">
                <Clock size={10} />
                <span>{formatDate(currentAuction.endDate)}</span>
              </div>
            </div>

            {/* Description */}
            <div className="description-section">
              <h4>{t("auctions.description")}</h4>
              <p>{currentAuction.description}</p>
            </div>

            {/* Details */}
            <div className="details-grid">
              <div className="detail-item">
                <Palette size={12} />
                <span>{currentAuction.material}</span>
              </div>
              <div className="detail-item">
                <Ruler size={12} />
                <span>{currentAuction.dimensions}</span>
              </div>
              <div className="detail-item">
                <Package size={12} />
                <span>{deliveryDaysText}</span>
              </div>
            </div>

            {/* Bid Section */}
            {canBid && (
              <div className="bid-section">
                <div className="bid-controls">
                  <button
                    className="bid-step-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBidChange(-1);
                    }}
                    disabled={
                      bidAmount <=
                      currentAuction.currentPrice +
                        currentAuction.minimumBidIncrement
                    }
                  >
                    <Minus size={18} />
                  </button>
                  <div className="bid-input-wrapper">
                    <input
                      type="number"
                      className="bid-input"
                      value={bidAmount}
                      onChange={(e) =>
                        setBidAmount(parseFloat(e.target.value) || 0)
                      }
                      onClick={(e) => e.stopPropagation()}
                      min={
                        currentAuction.currentPrice +
                        currentAuction.minimumBidIncrement
                      }
                      step={currentAuction.minimumBidIncrement}
                    />
                    <span className="currency">₾</span>
                  </div>
                  <button
                    className="bid-step-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleBidChange(1);
                    }}
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  className={`place-bid-btn ${isPreBid ? "pre-bid" : ""}`}
                  onClick={handlePlaceBid}
                  disabled={bidding}
                >
                  {bidding ? (
                    "..."
                  ) : (
                    <>
                      <Gavel size={18} />
                      <span>
                        {isPreBid
                          ? t("auctions.preBid") || "Pre-Bid"
                          : t("auctions.placeBid")}
                      </span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Login notice */}
            {!user &&
              (currentAuction.status === "ACTIVE" ||
                currentAuction.status === "SCHEDULED") && (
                <div className="login-notice">
                  <span>
                    {currentAuction.status === "SCHEDULED"
                      ? t("auctions.loginToPreBid") || "შედით Pre-Bid-ისთვის"
                      : t("auctions.loginToPlaceBid")}{" "}
                  </span>
                  <Link href="/login">{t("auctions.loginLink")}</Link>
                </div>
              )}

            {/* Winner info */}
            {isEnded && currentAuction.currentWinner && (
              <div className="winner-info">
                <Gavel size={18} />
                <span>{t("auctions.winner")}: </span>
                <strong>
                  {(() => {
                    const winner = currentAuction.currentWinner;
                    // Try name field first
                    if (winner?.name) return winner.name;
                    // Then try ownerFirstName + ownerLastName
                    if (winner?.ownerFirstName && winner?.ownerLastName) {
                      return `${winner.ownerFirstName} ${winner.ownerLastName}`;
                    }
                    // Then try firstName + lastName
                    if (winner?.firstName && winner?.lastName) {
                      return `${winner.firstName} ${winner.lastName}`;
                    }
                    // Fallback
                    return t("auctions.anonymousBidder") || "ანონიმური";
                  })()}
                </strong>
              </div>
            )}

            {/* Payment section for ended auctions with winner */}
            {isEnded && currentAuction.currentWinner && (
              <div className="winner-payment-section">
                {currentAuction.isPaid ? (
                  <div className="paid-badge">
                    <Trophy size={18} />
                    <span>{t("auctions.paid") || "გადახდილია"}</span>
                  </div>
                ) : (
                  <Link
                    href={`/checkout/auction/${currentAuction._id}`}
                    className="payment-link-btn"
                  >
                    <CreditCard size={18} />
                    <span>{t("auctions.payNow") || "გადახდა"}</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment section outside expand - always visible for ended auctions */}
        {!isExpanded && isEnded && currentAuction.currentWinner && (
          <div className="winner-payment-standalone">
            <div className="winner-info-compact">
              <Gavel size={16} />
              <span>{t("auctions.winner")}: </span>
              <strong>
                {(() => {
                  const winner = currentAuction.currentWinner;
                  if (winner?.name) return winner.name;
                  if (winner?.ownerFirstName && winner?.ownerLastName) {
                    return `${winner.ownerFirstName} ${winner.ownerLastName}`;
                  }
                  if (winner?.firstName && winner?.lastName) {
                    return `${winner.firstName} ${winner.lastName}`;
                  }
                  return t("auctions.anonymousBidder") || "ანონიმური";
                })()}
              </strong>
            </div>
            {currentAuction.isPaid ? (
              <div className="paid-badge">
                <Trophy size={18} />
                <span>{t("auctions.paid") || "გადახდილია"}</span>
              </div>
            ) : (
              <Link
                href={`/checkout/auction/${currentAuction._id}`}
                className="payment-link-btn"
              >
                <CreditCard size={18} />
                <span>{t("auctions.payNow") || "გადახდა"}</span>
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && (
        <div className="lightbox-overlay" onClick={closeLightbox}>
          <div
            className="lightbox-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="lightbox-close" onClick={closeLightbox}>
              <X size={24} />
            </button>

            <div className="lightbox-image-container">
              <Image
                src={allImages[currentImageIndex]}
                alt={`${currentAuction.title} - ${currentImageIndex + 1}`}
                fill
                className="lightbox-image"
                sizes="100vw"
                priority
              />
            </div>

            {/* Navigation arrows */}
            {allImages.length > 1 && (
              <>
                <button className="lightbox-nav prev" onClick={prevImage}>
                  <ChevronLeft size={32} />
                </button>
                <button className="lightbox-nav next" onClick={nextImage}>
                  <ChevronRight size={32} />
                </button>

                {/* Thumbnails */}
                <div className="lightbox-thumbnails">
                  {allImages.map((img, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${index === currentImageIndex ? "active" : ""}`}
                      onClick={() => setCurrentImageIndex(index)}
                    >
                      <Image src={img} alt="" fill sizes="80px" />
                    </button>
                  ))}
                </div>

                {/* Counter */}
                <div className="lightbox-counter">
                  {currentImageIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
