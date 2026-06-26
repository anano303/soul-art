"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import "./seller-offers.css";

interface Offer {
  _id: string;
  product?: { _id: string; name: string; images?: string[]; price?: number };
  productName?: string;
  originalPrice: number;
  offeredPrice: number;
  message?: string;
  sellerMessage?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export default function SellerOffers() {
  const { language } = useLanguage();
  const en = language === "en";
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: offers = [], isLoading } = useQuery<Offer[]>({
    queryKey: ["seller-offers"],
    queryFn: async () => {
      const res = await fetchWithAuth("/price-offers/seller");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 60000,
  });

  const respond = useMutation({
    mutationFn: async ({
      id,
      action,
    }: {
      id: string;
      action: "accept" | "reject";
    }) => {
      const res = await fetchWithAuth(`/price-offers/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("failed");
      return res.json();
    },
    onSuccess: (_data, vars) => {
      toast({
        title:
          vars.action === "accept"
            ? en
              ? "Offer accepted ✅"
              : "შეთავაზება დადასტურდა ✅"
            : en
              ? "Offer rejected"
              : "შეთავაზება უარყოფილია",
      });
      qc.invalidateQueries({ queryKey: ["seller-offers"] });
    },
    onError: () =>
      toast({
        title: en ? "Action failed" : "მოქმედება ვერ შესრულდა",
        variant: "destructive",
      }),
  });

  const statusLabel = (s: Offer["status"]) =>
    s === "pending"
      ? en
        ? "Pending"
        : "მოლოდინში"
      : s === "accepted"
        ? en
          ? "Accepted"
          : "დადასტურებული"
        : en
          ? "Rejected"
          : "უარყოფილი";

  return (
    <div className="so-wrap">
      <div className="so-head">
        <h1>{en ? "Price offers" : "ფასის შეთავაზებები"}</h1>
        <p>
          {en
            ? "Buyers' price offers on your products. Accept to give that buyer your special price."
            : "მყიდველების ფასის შეთავაზებები შენს პროდუქტებზე. დაადასტურე, თუ თანახმა ხარ შემოთავაზებულ ფასად გაყიდო პროდუქტი."}
        </p>
      </div>

      {isLoading ? (
        <div className="so-empty">{en ? "Loading…" : "იტვირთება…"}</div>
      ) : offers.length === 0 ? (
        <div className="so-empty">
          {en ? "No offers yet." : "ჯერ არ გაქვს შეთავაზებები."}
        </div>
      ) : (
        <div className="so-list">
          {offers.map((o) => (
            <div key={o._id} className={`so-card so-${o.status}`}>
              {o.product?.images?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={o.product.images[0]}
                  alt={o.product?.name || ""}
                  className="so-thumb"
                />
              )}
              <div className="so-card-main">
                <div className="so-product">
                  {o.product?.name || o.productName || "—"}
                </div>
                <div className="so-prices">
                  <span className="so-old">₾{o.originalPrice}</span>
                  <span className="so-arrow">→</span>
                  <span className="so-new">₾{o.offeredPrice}</span>
                </div>
                {o.message && <p className="so-msg">“{o.message}”</p>}
              </div>

              <div className="so-card-side">
                <span className={`so-badge so-badge-${o.status}`}>
                  {statusLabel(o.status)}
                </span>
                {o.status === "pending" && (
                  <div className="so-actions">
                    <button
                      className="so-btn so-accept"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate({ id: o._id, action: "accept" })
                      }
                    >
                      {en ? "Accept" : "დადასტურება"}
                    </button>
                    <button
                      className="so-btn so-reject"
                      disabled={respond.isPending}
                      onClick={() =>
                        respond.mutate({ id: o._id, action: "reject" })
                      }
                    >
                      {en ? "Reject" : "უარყოფა"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
