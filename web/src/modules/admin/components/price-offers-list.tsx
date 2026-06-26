"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import "./price-offers-list.css";

interface AdminOffer {
  _id: string;
  product?: { _id: string; name: string; images?: string[] };
  productName?: string;
  seller?: { name?: string; storeName?: string; email?: string };
  requester?: { name?: string; email?: string };
  requesterName?: string;
  requesterEmail?: string;
  requesterPhone?: string;
  originalPrice: number;
  offeredPrice: number;
  message?: string;
  sellerMessage?: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

interface AdminOffersResponse {
  items: AdminOffer[];
  total: number;
  page: number;
  pages: number;
}

export function PriceOffersList() {
  const { language } = useLanguage();
  const en = language === "en";
  const { toast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery<AdminOffersResponse>({
    queryKey: ["admin-price-offers", page, status],
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), limit: "50" });
      if (status) qs.set("status", status);
      const res = await fetchWithAuth(`/price-offers/admin?${qs.toString()}`);
      if (!res.ok) return { items: [], total: 0, page: 1, pages: 1 };
      return res.json();
    },
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
    onSuccess: () => {
      toast({ title: en ? "Updated" : "განახლდა" });
      qc.invalidateQueries({ queryKey: ["admin-price-offers"] });
    },
    onError: () =>
      toast({ title: en ? "Failed" : "ვერ შესრულდა", variant: "destructive" }),
  });

  const offers = data?.items || [];

  return (
    <div className="apo-wrap">
      <div className="apo-head">
        <h1>{en ? "Price offers" : "ფასის შეთავაზებები"}</h1>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">{en ? "All" : "ყველა"}</option>
          <option value="pending">{en ? "Pending" : "მოლოდინში"}</option>
          <option value="accepted">{en ? "Accepted" : "დადასტურებული"}</option>
          <option value="rejected">{en ? "Rejected" : "უარყოფილი"}</option>
        </select>
      </div>

      {isLoading ? (
        <div className="apo-empty">{en ? "Loading…" : "იტვირთება…"}</div>
      ) : offers.length === 0 ? (
        <div className="apo-empty">{en ? "No offers." : "შეთავაზებები არ არის."}</div>
      ) : (
        <div className="apo-table-scroll">
          <table className="apo-table">
            <thead>
              <tr>
                <th>{en ? "Product" : "პროდუქტი"}</th>
                <th>{en ? "Buyer (contact)" : "მყიდველი (კონტაქტი)"}</th>
                <th>{en ? "Seller" : "გამყიდველი"}</th>
                <th>{en ? "Price" : "ფასი"}</th>
                <th>{en ? "Message" : "შეტყობინება"}</th>
                <th>{en ? "Status" : "სტატუსი"}</th>
                <th>{en ? "Date" : "თარიღი"}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o._id}>
                  <td>
                    <div className="apo-product">
                      {o.product?.images?.[0] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={o.product.images[0]}
                          alt=""
                          className="apo-thumb"
                        />
                      )}
                      <span>{o.product?.name || o.productName || "—"}</span>
                    </div>
                  </td>
                  <td className="apo-buyer">
                    <div>{o.requesterName || o.requester?.name || "—"}</div>
                    <div className="apo-sub">
                      {o.requesterEmail || o.requester?.email || ""}
                    </div>
                    {o.requesterPhone && (
                      <div className="apo-sub apo-phone">📞 {o.requesterPhone}</div>
                    )}
                  </td>
                  <td>{o.seller?.storeName || o.seller?.name || "—"}</td>
                  <td className="apo-price">
                    <span className="apo-old">₾{o.originalPrice}</span>
                    <span className="apo-new">₾{o.offeredPrice}</span>
                  </td>
                  <td className="apo-msg">
                    {o.message && <div>“{o.message}”</div>}
                    {o.sellerMessage && (
                      <div className="apo-sub">
                        {en ? "Seller: " : "გამყიდველი: "}“{o.sellerMessage}”
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={`apo-badge apo-badge-${o.status}`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="apo-date">
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    {o.status === "pending" && (
                      <div className="apo-actions">
                        <button
                          className="apo-btn apo-accept"
                          disabled={respond.isPending}
                          onClick={() =>
                            respond.mutate({ id: o._id, action: "accept" })
                          }
                        >
                          {en ? "Accept" : "დადასტ."}
                        </button>
                        <button
                          className="apo-btn apo-reject"
                          disabled={respond.isPending}
                          onClick={() =>
                            respond.mutate({ id: o._id, action: "reject" })
                          }
                        >
                          {en ? "Reject" : "უარყ."}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="apo-pager">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ‹
          </button>
          <span>
            {page} / {data.pages}
          </span>
          <button
            disabled={page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
}
