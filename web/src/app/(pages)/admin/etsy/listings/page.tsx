"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface EtsyListingRow {
  _id: string;
  listingId: string;
  listingUrl?: string;
  state: string;
  priceGel?: number;
  priceUsd?: number;
  listingFeeGel?: number;
  feeCharged?: boolean;
  feePaymentMethod?: string;
  imagesUploaded?: number;
  warnings?: string[];
  createdAt?: string;
  product?: { _id: string; name?: string; images?: string[] } | null;
  seller?: { name?: string; email?: string } | null;
}

const STATE_FILTERS = [
  { value: "all", label: "ყველა" },
  { value: "draft", label: "დრაფტი" },
  { value: "active", label: "აქტიური" },
];

const STATE_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  draft: "bg-yellow-100 text-yellow-700",
  inactive: "bg-gray-100 text-gray-600",
  removed: "bg-red-100 text-red-700",
  expired: "bg-red-100 text-red-700",
};

export default function EtsyListingsAdminPage() {
  const [listings, setListings] = useState<EtsyListingRow[]>([]);
  const [stateFilter, setStateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`/etsy/listings?state=${stateFilter}`);
      if (res.ok) {
        setListings(await res.json());
      } else {
        setMessage("❌ Listing-ების ჩატვირთვა ვერ მოხერხდა");
      }
    } catch {
      setMessage("❌ Listing-ების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [stateFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const activate = async (id: string) => {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/etsy/listings/${id}/activate`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("✅ Listing-ი გააქტიურდა Etsy-ზე!");
      } else {
        setMessage(
          `❌ გააქტიურება ვერ მოხერხდა: ${data.message || data.state || "უცნობი შეცდომა"}`,
        );
      }
      await loadListings();
    } catch (err) {
      setMessage(
        `❌ გააქტიურება ვერ მოხერხდა: ${err instanceof Error ? err.message : ""}`,
      );
    } finally {
      setBusyId(null);
    }
  };

  const sync = async (id: string) => {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/etsy/listings/${id}/sync`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`✅ სტატუსი განახლდა: ${data.state}`);
      } else {
        setMessage(`❌ ${data.message || "სინქრონიზაცია ვერ მოხერხდა"}`);
      }
      await loadListings();
    } catch {
      setMessage("❌ სინქრონიზაცია ვერ მოხერხდა");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">🛒 Etsy Listing-ები</h1>
          <Link
            href="/admin/etsy"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Etsy ინტეგრაციის გვერდი
          </Link>
        </div>
        <p className="text-gray-600 mb-6">
          ყველა SoulArt-იდან განთავსებული listing-ი. დრაფტების გამოქვეყნება
          შესაძლებელია პირდაპირ აქედან, API-ის საშუალებით.
        </p>

        {message && (
          <div
            className={`p-4 mb-6 rounded ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex items-center gap-2 mb-4">
          {STATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStateFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                stateFilter === f.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={loadListings}
            disabled={loading}
            className="ml-auto text-sm text-blue-600 hover:underline disabled:text-gray-400"
          >
            🔄 განახლება
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">იტვირთება...</p>
          ) : listings.length === 0 ? (
            <p className="p-6 text-gray-500">Listing-ები ვერ მოიძებნა.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-2">ნამუშევარი</th>
                    <th className="px-4 py-2">გამყიდველი</th>
                    <th className="px-4 py-2">ფასი</th>
                    <th className="px-4 py-2">საფასური</th>
                    <th className="px-4 py-2">ფოტო</th>
                    <th className="px-4 py-2">სტატუსი</th>
                    <th className="px-4 py-2">თარიღი</th>
                    <th className="px-4 py-2 text-right">მოქმედებები</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((l) => (
                    <tr key={l._id} className="border-t align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {l.product?.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={l.product.images[0]}
                              alt=""
                              className="w-10 h-10 rounded object-cover shrink-0"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {l.product?.name || "—"}
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              #{l.listingId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {l.seller?.name || l.seller?.email || "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {l.priceUsd ? `$${l.priceUsd}` : "—"}
                        {l.priceGel ? (
                          <div className="text-xs text-gray-400">
                            {l.priceGel}₾
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {l.feePaymentMethod === "card"
                          ? "💳"
                          : l.feePaymentMethod === "balance"
                            ? "👛"
                            : ""}{" "}
                        {l.listingFeeGel ?? 0}₾{" "}
                        {l.feeCharged ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span
                            className="text-yellow-600"
                            title="საფასური ჯერ არ ჩამოჭრილა (ჩამოიჭრება გააქტიურებისას)"
                          >
                            ⏳
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">{l.imagesUploaded ?? 0}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            STATE_STYLES[l.state] || "bg-gray-100 text-gray-600"
                          }`}
                          title={l.warnings?.join("\n") || undefined}
                        >
                          {l.state}
                          {(l.warnings?.length ?? 0) > 0 && " ⚠️"}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {l.createdAt
                          ? new Date(l.createdAt).toLocaleDateString("ka-GE")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {l.state === "draft" && (
                            <button
                              onClick={() => activate(l._id)}
                              disabled={busyId === l._id}
                              className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:bg-gray-400"
                            >
                              {busyId === l._id
                                ? "ქვეყნდება..."
                                : "🚀 გამოქვეყნება"}
                            </button>
                          )}
                          <button
                            onClick={() => sync(l._id)}
                            disabled={busyId === l._id}
                            className="text-xs px-3 py-1.5 rounded border border-gray-300 hover:border-gray-500 disabled:text-gray-400"
                            title="სტატუსის სინქრონიზაცია Etsy-დან"
                          >
                            🔄
                          </button>
                          {l.listingUrl && (
                            <a
                              href={l.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                            >
                              Etsy ↗
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-gray-700">
          💡 <strong>გამოქვეყნება:</strong> დრაფტის გააქტიურება Etsy-ზე ($0.20
          Etsy-ის მოსაკრებელი ერიცხება მაღაზიას გამოქვეყნების მომენტში).
          გააქტიურებისას listing-ს ავტომატურად ემატება მაღაზიის მიმდინარე
          Shipping Profile, Processing Profile და Return Policy. თუ საფასური
          ბალანსიდან იყო გადასახდელი და ჯერ არ ჩამოჭრილა (⏳), ის გააქტიურებისას
          ჩამოიჭრება.
        </div>
      </div>
    </div>
  );
}
