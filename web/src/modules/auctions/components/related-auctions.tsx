"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Users, ArrowRight } from "lucide-react";
import { apiClient } from "@/lib/axios";
import { useLanguage } from "@/hooks/LanguageContext";
import "./related-auctions.css";

interface RelatedAuction {
  _id: string;
  title: string;
  mainImage: string;
  currentPrice: number;
  endDate: string;
  status: string;
  totalBids: number;
}

interface RelatedAuctionsProps {
  currentAuctionId: string;
  maxItems?: number;
}

export function RelatedAuctions({
  currentAuctionId,
  maxItems = 4,
}: RelatedAuctionsProps) {
  const { t, language } = useLanguage();
  const [auctions, setAuctions] = useState<RelatedAuction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRelatedAuctions = async () => {
      try {
        // Fetch active and scheduled auctions
        const response = await apiClient.get("/auctions", {
          params: {
            status: "ACTIVE,SCHEDULED",
            limit: maxItems + 1, // Fetch one extra to filter out current
          },
        });

        // Filter out current auction and limit to maxItems
        const filtered = response.data.auctions
          .filter((a: RelatedAuction) => a._id !== currentAuctionId)
          .slice(0, maxItems);

        setAuctions(filtered);
      } catch (error) {
        console.error("Failed to fetch related auctions:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRelatedAuctions();
  }, [currentAuctionId, maxItems]);

  const formatPrice = (price: number) => `${price.toFixed(2)} ₾`;

  const getTimeLeft = (endDate: string) => {
    const now = new Date().getTime();
    const end = new Date(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return language === "ge" ? "დასრულდა" : "Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return language === "ge" ? `${days} დღე` : `${days} days`;
    }

    if (hours > 0) {
      return language === "ge"
        ? `${hours}ს ${minutes}წთ`
        : `${hours}h ${minutes}m`;
    }

    return language === "ge" ? `${minutes}წთ` : `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="related-auctions-section">
        <h2 className="related-title">
          {t("auctions.relatedAuctions") || "სხვა აუქციონები"}
        </h2>
        <div className="related-loading">
          <div className="loading-spinner-small"></div>
        </div>
      </div>
    );
  }

  if (auctions.length === 0) {
    return null; // Don't show section if no related auctions
  }

  return (
    <section className="related-auctions-section">
      <div className="related-header">
        <h2 className="related-title">
          {t("auctions.relatedAuctions") || "სხვა აუქციონები"}
        </h2>
        <Link href="/auctions" className="view-all-link">
          {t("auctions.viewAll") || "ყველას ნახვა"}
          <ArrowRight size={18} />
        </Link>
      </div>

      <div className="related-grid">
        {auctions.map((auction) => (
          <Link
            key={auction._id}
            href={`/auctions/${auction._id}`}
            className="related-card"
          >
            <div className="related-image-container">
              <Image
                src={auction.mainImage}
                alt={auction.title}
                fill
                className="related-image"
              />
              <div
                className={`related-status ${auction.status.toLowerCase()}`}
              >
                {auction.status === "ACTIVE"
                  ? t("auctions.status.active") || "აქტიური"
                  : t("auctions.status.scheduled") || "დაგეგმილი"}
              </div>
            </div>

            <div className="related-info">
              <h3 className="related-card-title">{auction.title}</h3>

              <div className="related-meta">
                <div className="related-price">
                  {formatPrice(auction.currentPrice)}
                </div>
                <div className="related-stats">
                  <span className="related-time">
                    <Clock size={14} />
                    {getTimeLeft(auction.endDate)}
                  </span>
                  <span className="related-bids">
                    <Users size={14} />
                    {auction.totalBids}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default RelatedAuctions;
