"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface AutoApprovedRow {
  _id: string;
  listingId: string;
  listingUrl?: string;
  state: string;
  priceGel?: number;
  priceUsd?: number;
  autoApprovalReviewed?: boolean;
  createdAt?: string;
  product?: {
    _id: string;
    name?: string;
    images?: string[];
    status?: string;
  } | null;
  seller?: { name?: string; email?: string; storeName?: string } | null;
}

export default function EtsyAutoApprovedPage() {
  const [rows, setRows] = useState<AutoApprovedRow[]>([]);
  const [tab, setTab] = useState<"unreviewed" | "all">("unreviewed");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const reviewed = tab === "unreviewed" ? "false" : "all";
      const res = await fetchWithAuth(`/etsy/auto-approved?reviewed=${reviewed}`);
      if (res.ok) {
        setRows(await res.json());
      } else {
        setMessage("❌ ჩატვირთვა ვერ მოხერხდა");
      }
    } catch {
      setMessage("❌ ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const confirm = async (id: string) => {
    setBusyId(id);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/etsy/auto-approved/${id}/confirm`, {
        method: "POST",
      });
      if (res.ok) {
        setMessage("✅ დადასტურდა");
      } else {
        const data = await res.json().catch(() => ({}));
        setMessage(`❌ ${data.message || "ვერ დადასტურდა"}`);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const revert = async (id: string) => {
    const reason = window.prompt(
      "გაუქმების მიზეზი (გამყიდველი დაინახავს უარყოფის მიზეზად):",
      "წესების დარღვევა",
    );
    if (reason === null) return;

    setBusyId(id);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/etsy/auto-approved/${id}/revert`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setMessage(
          `✅ გაუქმდა — პროდუქტი უარყოფილია${data.etsyDeactivated ? ", Etsy listing-ი დეაქტივირებულია" : ""}`,
        );
      } else {
        setMessage(`❌ ${data.message || "გაუქმება ვერ მოხერხდა"}`);
      }
      await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">⚡ Etsy ავტო-დამტკიცებული</h1>
          <Link
            href="/admin/etsy"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Etsy ინტეგრაციის გვერდი
          </Link>
        </div>
        <p className="text-gray-600 mb-6">
          ნამუშევრები, რომლებიც Etsy-ის საფასურის გადახდით ავტომატურად
          დამტკიცდა — ადმინის რიგის გარეშე. გადაამოწმეთ და დაადასტურეთ, ან
          გააუქმეთ წესების დარღვევის შემთხვევაში (პროდუქტი უარყოფილდება და
          Etsy listing-ი დეაქტივირდება).
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
          <button
            onClick={() => setTab("unreviewed")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === "unreviewed"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
            }`}
          >
            გადაუმოწმებელი
          </button>
          <button
            onClick={() => setTab("all")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              tab === "all"
                ? "bg-gray-900 text-white border-gray-900"
                : "bg-white text-gray-700 border-gray-300 hover:border-gray-500"
            }`}
          >
            ყველა
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="ml-auto text-sm text-blue-600 hover:underline disabled:text-gray-400"
          >
            🔄 განახლება
          </button>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <p className="p-6 text-gray-500">იტვირთება...</p>
          ) : rows.length === 0 ? (
            <p className="p-6 text-gray-500">
              {tab === "unreviewed"
                ? "ყველაფერი გადამოწმებულია 🎉"
                : "ავტო-დამტკიცებული listing-ები ჯერ არ არის."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-2">ნამუშევარი</th>
                    <th className="px-4 py-2">გამყიდველი</th>
                    <th className="px-4 py-2">ფასი</th>
                    <th className="px-4 py-2">სტატუსი</th>
                    <th className="px-4 py-2">თარიღი</th>
                    <th className="px-4 py-2 text-right">მოქმედებები</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._id} className="border-t align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {r.product?.images?.[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={r.product.images[0]}
                              alt=""
                              className="w-10 h-10 rounded object-cover shrink-0"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {r.product?.name || "—"}
                            </div>
                            <div className="text-xs text-gray-400">
                              SoulArt: {r.product?.status || "—"} · Etsy:{" "}
                              {r.state}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {r.seller?.storeName ||
                          r.seller?.name ||
                          r.seller?.email ||
                          "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.priceGel ? `${r.priceGel}₾` : "—"}
                        {r.priceUsd ? (
                          <div className="text-xs text-gray-400">
                            ${r.priceUsd}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3">
                        {r.autoApprovalReviewed ? (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                            გადამოწმებული
                          </span>
                        ) : (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                            ⚡ ელოდება
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString("ka-GE")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {r.product?._id && (
                            <Link
                              href={`/products/${r.product._id}`}
                              target="_blank"
                              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                            >
                              ნახვა ↗
                            </Link>
                          )}
                          {r.listingUrl && (
                            <a
                              href={r.listingUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                            >
                              Etsy ↗
                            </a>
                          )}
                          {!r.autoApprovalReviewed && (
                            <>
                              <button
                                onClick={() => confirm(r._id)}
                                disabled={busyId === r._id}
                                className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 disabled:bg-gray-400"
                              >
                                ✅ დადასტურება
                              </button>
                              <button
                                onClick={() => revert(r._id)}
                                disabled={busyId === r._id}
                                className="bg-red-600 text-white text-xs px-3 py-1.5 rounded hover:bg-red-700 disabled:bg-gray-400"
                              >
                                ⛔ გაუქმება
                              </button>
                            </>
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
      </div>
    </div>
  );
}
