"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CreateAuctionForm } from "@/modules/auctions/components/create-auction-form";
import { useLanguage } from "@/hooks/LanguageContext";
import { useUser } from "@/modules/auth/hooks/use-user";
import { apiClient } from "@/lib/axios";
import { toast } from "react-hot-toast";

interface AuctionData {
  _id: string;
  totalBids: number;
  seller: {
    _id: string;
  };
}

export default function SellerEditAuctionPage() {
  const { language } = useLanguage();
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const params = useParams();
  const auctionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const checkEditPermission = async () => {
      if (userLoading) return;

      const role = user?.role?.toString().toUpperCase();
      if (role !== "SELLER") {
        router.replace("/profile");
        return;
      }

      try {
        setLoading(true);
        const response = await apiClient.get<AuctionData>(
          `/auctions/${auctionId}`,
        );
        const auction = response.data;

        // შევამოწმოთ აუქციონს აქვს თუ არა ფსონები
        if (auction.totalBids > 0) {
          toast.error(
            language === "en"
              ? "Cannot edit auction with existing bids"
              : "აუქციონის რედაქტირება შეუძლებელია ფსონების არსებობისას",
          );
          router.replace("/profile/auctions");
          return;
        }

        // შევამოწმოთ ეს აუქციონი ამ სელერის არის თუ არა
        if (auction.seller?._id !== user?._id) {
          toast.error(
            language === "en"
              ? "You don't have permission to edit this auction"
              : "თქვენ არ გაქვთ ამ აუქციონის რედაქტირების უფლება",
          );
          router.replace("/profile/auctions");
          return;
        }

        setCanEdit(true);
      } catch (error: unknown) {
        console.error("Failed to check auction:", error);
        toast.error(
          language === "en"
            ? "Failed to load auction"
            : "აუქციონის ჩატვირთვა ვერ მოხერხდა",
        );
        router.replace("/profile/auctions");
      } finally {
        setLoading(false);
      }
    };

    checkEditPermission();
  }, [userLoading, user, auctionId, router, language]);

  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          {language === "en" ? "Edit Auction" : "აუქციონის რედაქტირება"}
        </h1>
        <p className="text-slate-600 max-w-2xl">
          {language === "en"
            ? "Update your auction details"
            : "განაახლეთ თქვენი აუქციონის ინფორმაცია"}
        </p>
      </div>
      <CreateAuctionForm
        mode="seller"
        auctionId={auctionId}
        onSuccess={() => router.push("/profile/auctions")}
      />
    </div>
  );
}
