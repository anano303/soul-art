"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { apiClient } from "@/lib/axios";
import { toast } from "react-hot-toast";
import {
  Edit3,
  User,
  Calendar,
  DollarSign,
  Package,
  ChevronRight,
  ImageIcon,
  ShieldCheck,
  Store,
} from "lucide-react";
import "./edit-auction.css";

interface AuctionData {
  _id: string;
  title: string;
  description: string;
  artworkType: "ORIGINAL" | "REPRODUCTION";
  dimensions: string;
  material: string;
  mainImage: string;
  additionalImages?: string[];
  startingPrice: number;
  currentPrice: number;
  minimumBidIncrement: number;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  deliveryType?: string;
  deliveryDaysMin?: number;
  deliveryDaysMax?: number;
  seller: {
    _id: string;
    name?: string;
    ownerFirstName?: string;
    ownerLastName?: string;
    storeName?: string;
  };
  status: string;
  totalBids: number;
}

export default function AdminEditAuctionPage() {
  const { t, language } = useLanguage();
  const { user } = useUser();
  const router = useRouter();
  const params = useParams();
  const auctionId = params.id as string;

  const [auction, setAuction] = useState<AuctionData | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    const fetchAuction = async () => {
      try {
        const response = await apiClient.get(`/auctions/${auctionId}`);
        setAuction(response.data);
      } catch (error) {
        console.error("Failed to fetch auction:", error);
        toast.error(t("admin.auctionLoadError") || "Failed to load auction");
        router.push(isAdmin ? "/admin/auctions" : "/profile/auctions");
      } finally {
        setLoading(false);
      }
    };

    if (auctionId) {
      fetchAuction();
    }
  }, [auctionId, router, t, isAdmin]);

  const getSellerName = () => {
    if (!auction?.seller) return language === "ge" ? "უცნობი" : "Unknown";
    const s = auction.seller;
    if (s.ownerFirstName && s.ownerLastName) {
      return `${s.ownerFirstName} ${s.ownerLastName}`;
    }
    return s.name || s.storeName || (language === "ge" ? "უცნობი" : "Unknown");
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ge" ? "ka-GE" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().split("T")[0];
  };

  const formatTimeForInput = (dateString: string) => {
    const date = new Date(dateString);
    return date.toTimeString().slice(0, 5);
  };

  const getStatusClass = (status: string) => {
    return status.toLowerCase();
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, { ge: string; en: string }> = {
      ACTIVE: { ge: "აქტიური", en: "Active" },
      PENDING: { ge: "მოლოდინში", en: "Pending" },
      ENDED: { ge: "დასრულებული", en: "Ended" },
      SCHEDULED: { ge: "დაგეგმილი", en: "Scheduled" },
      CANCELLED: { ge: "გაუქმებული", en: "Cancelled" },
    };
    return statusLabels[status]?.[language] || status;
  };

  if (loading) {
    return (
      <div className="edit-auction-page">
        <div className="edit-auction-container">
          <div className="edit-loading">
            <div className="edit-loading-spinner"></div>
            <p className="edit-loading-text">
              {language === "ge" ? "იტვირთება..." : "Loading..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="edit-auction-page">
        <div className="edit-auction-container">
          <div className="edit-error">
            <div className="edit-error-icon">😕</div>
            <h3 className="edit-error-title">
              {language === "ge"
                ? "აუქციონი ვერ მოიძებნა"
                : "Auction not found"}
            </h3>
            <p className="edit-error-message">
              {language === "ge"
                ? "მითითებული აუქციონი არ არსებობს ან წაშლილია"
                : "The specified auction does not exist or has been deleted"}
            </p>
            <Link
              href={isAdmin ? "/admin/auctions" : "/profile/auctions"}
              className="edit-error-link"
            >
              ←{" "}
              {language === "ge" ? "აუქციონებზე დაბრუნება" : "Back to auctions"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const initialData = {
    title: auction.title,
    description: auction.description,
    artworkType: auction.artworkType,
    dimensions: auction.dimensions,
    material: auction.material,
    mainImage: auction.mainImage,
    additionalImages: auction.additionalImages || [],
    startingPrice: auction.startingPrice,
    minimumBidIncrement: auction.minimumBidIncrement,
    startDate: formatDateForInput(auction.startDate),
    startTime: auction.startTime || formatTimeForInput(auction.startDate),
    endDate: formatDateForInput(auction.endDate),
    endTime: auction.endTime || formatTimeForInput(auction.endDate),
    deliveryType: auction.deliveryType,
    deliveryDaysMin: auction.deliveryDaysMin || 1,
    deliveryDaysMax: auction.deliveryDaysMax || 3,
    sellerId: auction.seller?._id,
  };

  const allImages = [auction.mainImage, ...(auction.additionalImages || [])];

  return (
    <div className="edit-auction-page">
      <div className="edit-auction-container">
        {/* Header */}
        <div className="edit-header">
          {/* Breadcrumb */}
          <nav className="edit-breadcrumb">
            <Link
              href={isAdmin ? "/admin" : "/profile"}
              className="breadcrumb-link"
            >
              {isAdmin
                ? language === "ge"
                  ? "ადმინ პანელი"
                  : "Admin Panel"
                : language === "ge"
                  ? "პროფილი"
                  : "Profile"}
            </Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <Link
              href={isAdmin ? "/admin/auctions" : "/profile/auctions"}
              className="breadcrumb-link"
            >
              {language === "ge" ? "აუქციონები" : "Auctions"}
            </Link>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-current">
              {language === "ge" ? "რედაქტირება" : "Edit"}
            </span>
          </nav>

          {/* Title & Role Badge */}
          <div className="edit-header-content">
            <div className="edit-title-section">
              <h1 className="edit-page-title">
                <Edit3 size={24} />
                {language === "ge" ? "აუქციონის რედაქტირება" : "Edit Auction"}
              </h1>
              <p className="edit-page-subtitle">
                {isAdmin
                  ? language === "ge"
                    ? "განაახლეთ აუქციონის დეტალები და გამოაქვეყნეთ ხელახლა"
                    : "Update auction details and republish"
                  : language === "ge"
                    ? "შეცვალეთ თქვენი აუქციონის ინფორმაცია"
                    : "Modify your auction information"}
              </p>
            </div>
            <div className={`role-badge ${isAdmin ? "admin" : "seller"}`}>
              {isAdmin ? <ShieldCheck size={14} /> : <Store size={14} />}
              {isAdmin
                ? language === "ge"
                  ? "ადმინისტრატორი"
                  : "Administrator"
                : language === "ge"
                  ? "სელერი"
                  : "Seller"}
            </div>
          </div>
        </div>

        {/* Auction Preview Card */}
        <div className="edit-preview-card">
          <div className="preview-header">
            <ImageIcon size={14} />
            {language === "ge" ? "მიმდინარე აუქციონი" : "Current Auction"}
          </div>
          <div className="preview-content">
            {/* Main Image */}
            <div className="preview-image-container">
              {auction.mainImage ? (
                <Image
                  src={auction.mainImage}
                  alt={auction.title}
                  fill
                  className="preview-image"
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div className="preview-image-placeholder">
                  <ImageIcon size={32} />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="preview-details">
              <h3 className="preview-title">{auction.title}</h3>
              <div className="preview-meta">
                <div className="preview-meta-item">
                  <User size={14} />
                  <span>{getSellerName()}</span>
                </div>
                <div className="preview-meta-item">
                  <Calendar size={14} />
                  <span>{formatDate(auction.endDate)}</span>
                </div>
                <div className="preview-meta-item">
                  <DollarSign size={14} />
                  <span>{auction.currentPrice} ₾</span>
                </div>
                <div className="preview-meta-item">
                  <Package size={14} />
                  <span>
                    {auction.totalBids} {language === "ge" ? "ბიდი" : "bids"}
                  </span>
                </div>
              </div>
              <span
                className={`preview-status ${getStatusClass(auction.status)}`}
              >
                {getStatusLabel(auction.status)}
              </span>

              {/* Gallery Thumbnails */}
              {allImages.length > 1 && (
                <div className="preview-gallery">
                  {allImages.slice(0, 4).map((img, idx) => (
                    <div key={idx} className="gallery-thumb">
                      <Image
                        src={img}
                        alt={`Preview ${idx + 1}`}
                        width={50}
                        height={50}
                        style={{ objectFit: "cover" }}
                      />
                    </div>
                  ))}
                  {allImages.length > 4 && (
                    <div className="gallery-more">+{allImages.length - 4}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="edit-form-wrapper">
          <CreateAuctionForm
            mode={isAdmin ? "admin" : "seller"}
            variant="reschedule"
            auctionId={auctionId}
            initialData={initialData}
            lockedSellerId={auction.seller?._id}
            onSuccess={() =>
              router.push(isAdmin ? "/admin/auctions" : "/profile/auctions")
            }
          />
        </div>
      </div>
    </div>
  );
}
