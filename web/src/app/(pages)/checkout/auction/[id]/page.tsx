"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Trophy,
  CreditCard,
  MapPin,
  Truck,
  Check,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-hot-toast";
import "./auction-checkout.css";

interface Auction {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  currentPrice: number;
  status: "ACTIVE" | "ENDED" | "PENDING" | "CANCELLED" | "SCHEDULED";
  deliveryDaysMin: number;
  deliveryDaysMax: number;
  isPaid?: boolean;
  seller: {
    _id: string;
    storeName?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
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

interface PaymentDetails {
  auctionId: string;
  title: string;
  winningBid: number;
  deliveryFees: {
    TBILISI: number;
    REGION: number;
  };
  paymentDeadline: string;
  timeRemaining: number;
}

type DeliveryZone = "TBILISI" | "REGION";

export default function AuctionCheckoutPage() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<Auction | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [deliveryZone, setDeliveryZone] = useState<DeliveryZone | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Fetch auction details
      const auctionResponse = await apiClient.get(`/auctions/${auctionId}`);
      const auctionData = auctionResponse.data;

      // Verify user is the winner
      if (
        !user ||
        !auctionData.currentWinner ||
        user._id !== auctionData.currentWinner._id
      ) {
        toast.error(
          t("auctions.notWinner") || "თქვენ არ ხართ ამ აუქციონის გამარჯვებული",
        );
        router.push(`/auctions/${auctionId}`);
        return;
      }

      // Verify auction is ended
      if (auctionData.status !== "ENDED") {
        toast.error(t("auctions.notEnded") || "აუქციონი ჯერ არ დასრულებულა");
        router.push(`/auctions/${auctionId}`);
        return;
      }

      // Check if already paid
      if (auctionData.isPaid) {
        toast.success(t("auctions.alreadyPaid") || "აუქციონი უკვე გადახდილია");
        router.push(`/auctions/${auctionId}`);
        return;
      }

      setAuction(auctionData);

      // Fetch payment details
      const paymentResponse = await apiClient.get(
        `/auctions/${auctionId}/payment-details`,
      );
      setPaymentDetails(paymentResponse.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error(
        t("auctions.loadError") || "მონაცემების ჩატვირთვა ვერ მოხერხდა",
      );
      router.push("/auctions");
    } finally {
      setLoading(false);
    }
  }, [auctionId, router, t, user]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;
    
    if (auctionId && user) {
      fetchData();
    } else if (!user) {
      router.push("/login");
    }
  }, [auctionId, fetchData, user, router, authLoading]);

  const handleConfirmPayment = async () => {
    if (!auction || !deliveryZone) {
      toast.error(t("auctions.selectDeliveryZone") || "აირჩიეთ მიწოდების ზონა");
      return;
    }

    setProcessing(true);
    try {
      const response = await apiClient.post(
        `/auctions/${auctionId}/confirm-payment`,
        {
          deliveryZone,
        },
      );

      if (response.data.success) {
        toast.success(
          t("auctions.paymentSuccess") || "გადახდა წარმატებით დასრულდა!",
        );
        router.push(`/auctions/${auctionId}?paid=true`);
      }
    } catch (error: unknown) {
      console.error("Payment error:", error);
      const axiosError = error as {
        response?: { data?: { message?: string } };
      };
      toast.error(
        axiosError.response?.data?.message ||
          t("auctions.paymentError") ||
          "გადახდის შეცდომა",
      );
    } finally {
      setProcessing(false);
    }
  };

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const getSellerName = () => {
    if (!auction?.seller) return "";
    const seller = auction.seller;
    if (seller.storeName) return seller.storeName;
    if (seller.ownerFirstName && seller.ownerLastName) {
      return `${seller.ownerFirstName} ${seller.ownerLastName}`;
    }
    return "";
  };

  const getDeliveryFee = () => {
    if (!paymentDetails || !deliveryZone) return 0;
    return paymentDetails.deliveryFees[deliveryZone];
  };

  const getTotalPrice = () => {
    if (!auction) return 0;
    return auction.currentPrice + getDeliveryFee();
  };

  if (loading) {
    return (
      <div className="auction-checkout-container">
        <div className="loading-state">
          <Loader2 className="loading-spinner" size={48} />
          <p>{t("common.loading") || "იტვირთება..."}</p>
        </div>
      </div>
    );
  }

  if (!auction || !paymentDetails) {
    return (
      <div className="auction-checkout-container">
        <div className="error-state">
          <p>{t("auctions.notFound") || "აუქციონი ვერ მოიძებნა"}</p>
          <Link href="/auctions" className="back-link">
            <ArrowLeft size={20} />
            {t("auctions.backToAuctions") || "აუქციონებზე დაბრუნება"}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auction-checkout-container">
      <div className="auction-checkout-header">
        <Link href={`/auctions/${auctionId}`} className="back-link">
          <ArrowLeft size={20} />
          {t("common.back") || "უკან"}
        </Link>
        <h1 className="checkout-title">
          <Trophy size={28} className="trophy-icon" />
          {t("auctions.completePayment") || "გადახდის დასრულება"}
        </h1>
      </div>

      <div className="checkout-content">
        {/* Left: Auction Summary */}
        <div className="auction-summary-card">
          <h2>{t("auctions.wonAuction") || "მოგებული აუქციონი"}</h2>
          <div className="auction-item">
            <div className="auction-image">
              <Image
                src={auction.mainImage}
                alt={auction.title}
                fill
                className="image"
              />
            </div>
            <div className="auction-details">
              <h3 className="auction-title">{auction.title}</h3>
              <p className="seller-name">{getSellerName()}</p>
              <div className="artwork-info">
                <span className="artwork-type">
                  {auction.artworkType === "ORIGINAL"
                    ? t("auctions.type.original")
                    : t("auctions.type.reproduction")}
                </span>
                <span className="dimensions">{auction.dimensions}</span>
              </div>
            </div>
          </div>

          <div className="price-summary">
            <div className="price-row winning">
              <span>{t("auctions.winningBid") || "მოგებული ფასი"}</span>
              <span className="winning-price">
                {formatPrice(auction.currentPrice)}
              </span>
            </div>
            <div className="price-row shipping">
              <span>{t("checkout.delivery") || "მიწოდება"}</span>
              <span className={deliveryZone ? "" : "pending"}>
                {deliveryZone
                  ? formatPrice(getDeliveryFee())
                  : t("auctions.selectZone") || "აირჩიეთ ზონა"}
              </span>
            </div>
            <div className="price-row total">
              <span>{t("checkout.total") || "სულ"}</span>
              <span className="total-price">
                {formatPrice(getTotalPrice())}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Delivery Zone Selection */}
        <div className="checkout-form-section">
          <h2>
            <Truck size={24} />
            {t("auctions.selectDeliveryZone") || "აირჩიეთ მიწოდების ზონა"}
          </h2>

          <div className="delivery-zones">
            <button
              className={`zone-card ${deliveryZone === "TBILISI" ? "selected" : ""}`}
              onClick={() => setDeliveryZone("TBILISI")}
            >
              <div className="zone-icon">
                <MapPin size={24} />
              </div>
              <div className="zone-info">
                <h3>{t("auctions.tbilisi") || "თბილისი"}</h3>
                <p>
                  {t("auctions.tbilisiDesc") || "თბილისის ფარგლებში მიწოდება"}
                </p>
              </div>
              <div className="zone-price">
                {formatPrice(paymentDetails.deliveryFees.TBILISI)}
              </div>
              {deliveryZone === "TBILISI" && (
                <div className="selected-check">
                  <Check size={20} />
                </div>
              )}
            </button>

            <button
              className={`zone-card ${deliveryZone === "REGION" ? "selected" : ""}`}
              onClick={() => setDeliveryZone("REGION")}
            >
              <div className="zone-icon">
                <Truck size={24} />
              </div>
              <div className="zone-info">
                <h3>{t("auctions.region") || "რეგიონი"}</h3>
                <p>
                  {t("auctions.regionDesc") ||
                    "საქართველოს რეგიონებში მიწოდება"}
                </p>
              </div>
              <div className="zone-price">
                {formatPrice(paymentDetails.deliveryFees.REGION)}
              </div>
              {deliveryZone === "REGION" && (
                <div className="selected-check">
                  <Check size={20} />
                </div>
              )}
            </button>
          </div>

          <div className="payment-summary">
            <div className="summary-row">
              <span>{t("auctions.artworkPrice") || "ნამუშევრის ფასი"}</span>
              <span>{formatPrice(auction.currentPrice)}</span>
            </div>
            <div className="summary-row">
              <span>{t("checkout.delivery") || "მიწოდება"}</span>
              <span>{deliveryZone ? formatPrice(getDeliveryFee()) : "-"}</span>
            </div>
            <div className="summary-row total">
              <span>{t("checkout.totalToPay") || "გადასახდელი"}</span>
              <span>{formatPrice(getTotalPrice())}</span>
            </div>
          </div>

          <button
            className="payment-btn"
            onClick={handleConfirmPayment}
            disabled={processing || !deliveryZone}
          >
            {processing ? (
              <>
                <Loader2 className="spinning" size={20} />
                {t("checkout.processing") || "მუშავდება..."}
              </>
            ) : (
              <>
                <CreditCard size={20} />
                {t("auctions.confirmPayment") || "გადახდის დადასტურება"} -{" "}
                {formatPrice(getTotalPrice())}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
