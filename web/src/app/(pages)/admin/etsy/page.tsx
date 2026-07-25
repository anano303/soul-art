"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface EtsyStatus {
  configured: boolean;
  connected: boolean;
  shopId?: string;
  shopName?: string;
  etsyUserId?: string;
  scopes?: string[];
  tokenExpiresAt?: string;
}

interface EtsySettings {
  listingFeeGel: number;
  commissionPercent: number;
  integrationEnabled: boolean;
  enabledForAdmins: boolean;
}

interface EtsyStats {
  listings: {
    total: number;
    active: number;
    draft: number;
    byState: Record<string, number>;
  };
  fees: {
    totalGel: number;
    byMethod: Record<string, { count: number; totalGel: number }>;
  };
  problemPayments: Array<{
    _id: string;
    status: string;
    amountGel: number;
    error?: string;
    createdAt?: string;
    externalOrderId: string;
    product?: { name?: string } | null;
    seller?: { name?: string; email?: string } | null;
  }>;
  recentListings: Array<{
    _id: string;
    state: string;
    listingUrl?: string;
    priceUsd?: number;
    feePaymentMethod?: string;
    createdAt?: string;
    warnings?: string[];
    product?: { name?: string } | null;
    seller?: { name?: string } | null;
  }>;
}

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        checked ? "bg-green-500" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

// Etsy-ს ოფიციალური საკომისიოები (etsy.com/legal/fees) — ცნობარი ადმინისთვის
const ETSY_FEES = [
  {
    name: "Listing Fee",
    amount: "$0.20",
    description:
      "ყოველი განთავსებული ნივთი, მოქმედებს 4 თვე ან გაყიდვამდე. განახლება ისევ $0.20.",
  },
  {
    name: "Transaction Fee",
    amount: "6.5%",
    description:
      "გაყიდვის ფასის + მიწოდების ფასის 6.5% ყოველ გაყიდვაზე.",
  },
  {
    name: "Payment Processing Fee",
    amount: "~3-4% + fixed",
    description:
      "Etsy Payments-ის საკომისიო, ქვეყანაზეა დამოკიდებული (მაგ. აშშ: 3% + $0.25).",
  },
  {
    name: "Currency Conversion Fee",
    amount: "2.5%",
    description:
      "როცა listing-ის ვალუტა და ანგარიშსწორების ვალუტა განსხვავდება.",
  },
  {
    name: "Offsite Ads Fee",
    amount: "12-15%",
    description:
      "თუ გაყიდვა Etsy-ს გარე რეკლამიდან მოვიდა (12% სავალდებულოა $10k+ წლიური გაყიდვების შემთხვევაში).",
  },
  {
    name: "Regulatory Operating Fee",
    amount: "ქვეყანაზე დამოკიდებული",
    description: "ზოგიერთ ქვეყანაში მცირე დამატებითი პროცენტი.",
  },
];

export default function EtsyAdminPage() {
  const [status, setStatus] = useState<EtsyStatus | null>(null);
  const [settings, setSettings] = useState<EtsySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  // Settings form state
  const [listingFeeGel, setListingFeeGel] = useState<number>(2);
  const [commissionPercent, setCommissionPercent] = useState<number>(20);
  const [integrationEnabled, setIntegrationEnabled] = useState(false);
  const [enabledForAdmins, setEnabledForAdmins] = useState(true);
  const [togglingFlag, setTogglingFlag] = useState(false);
  const [stats, setStats] = useState<EtsyStats | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, settingsRes, statsRes] = await Promise.all([
        fetchWithAuth("/etsy/status"),
        fetchWithAuth("/etsy/settings"),
        fetchWithAuth("/etsy/stats"),
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (settingsRes.ok) {
        const data: EtsySettings = await settingsRes.json();
        setSettings(data);
        setListingFeeGel(data.listingFeeGel);
        setCommissionPercent(data.commissionPercent);
        setIntegrationEnabled(data.integrationEnabled);
        setEnabledForAdmins(data.enabledForAdmins);
      }
    } catch (error) {
      console.error("Error loading Etsy data:", error);
      setMessage("❌ მონაცემების ჩატვირთვა ვერ მოხერხდა");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const connect = async () => {
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/auth");
      const data = await res.json();
      if (res.ok && data.authUrl) {
        window.open(data.authUrl, "_blank", "noopener");
        setMessage(
          "🔗 ავტორიზაციის გვერდი გაიხსნა ახალ ფანჯარაში. დაადასტურეთ წვდომა SoulArt-ის Etsy ანგარიშით და შემდეგ დააჭირეთ «სტატუსის განახლება»-ს."
        );
      } else {
        setMessage(`❌ ${data.message || "ავტორიზაციის ლინკის მიღება ვერ მოხერხდა"}`);
      }
    } catch {
      setMessage("❌ ავტორიზაციის ლინკის მიღება ვერ მოხერხდა");
    } finally {
      setWorking(false);
    }
  };

  const refreshTokens = async () => {
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/refresh-token", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus(data);
        setMessage("✅ ტოკენები წარმატებით განახლდა");
      } else {
        setMessage(`❌ ${data.message || "ტოკენების განახლება ვერ მოხერხდა"}`);
      }
    } catch {
      setMessage("❌ ტოკენების განახლება ვერ მოხერხდა");
    } finally {
      setWorking(false);
    }
  };

  const ping = async () => {
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/ping");
      const data = await res.json();
      if (res.ok && data.ok) {
        setMessage(`✅ Etsy API კავშირი მუშაობს (App ID: ${data.applicationId})`);
      } else {
        setMessage("❌ Etsy API-სთან კავშირი ვერ დამყარდა — შეამოწმეთ ETSY_KEYSTRING");
      }
    } catch {
      setMessage("❌ Etsy API-სთან კავშირი ვერ დამყარდა");
    } finally {
      setWorking(false);
    }
  };

  const disconnect = async () => {
    if (
      !window.confirm(
        "ნამდვილად გსურთ Etsy მაღაზიის გათიშვა? ხელახლა დაკავშირება ისევ ავტორიზაციას მოითხოვს."
      )
    ) {
      return;
    }
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/connection", { method: "DELETE" });
      if (res.ok) {
        setMessage("✅ Etsy კავშირი გაუქმდა");
        await loadData();
      } else {
        setMessage("❌ გათიშვა ვერ მოხერხდა");
      }
    } catch {
      setMessage("❌ გათიშვა ვერ მოხერხდა");
    } finally {
      setWorking(false);
    }
  };

  const toggleFlag = async (
    field: "integrationEnabled" | "enabledForAdmins",
    value: boolean,
  ) => {
    const setter =
      field === "integrationEnabled" ? setIntegrationEnabled : setEnabledForAdmins;
    const previous =
      field === "integrationEnabled" ? integrationEnabled : enabledForAdmins;

    setter(value); // optimistic
    setTogglingFlag(true);
    try {
      const res = await fetchWithAuth("/etsy/settings", {
        method: "PUT",
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "save failed");
      }
      setSettings(data);
      setMessage(
        field === "integrationEnabled"
          ? value
            ? "✅ Etsy ინტეგრაცია ჩაირთო — გამყიდველები ხედავენ Etsy-ს ფუნქციას"
            : "✅ Etsy ინტეგრაცია გამოირთო გამყიდველებისთვის"
          : value
            ? "✅ ადმინებისთვის ტესტირება ჩართულია"
            : "✅ ადმინებისთვის ტესტირება გამორთულია",
      );
    } catch {
      setter(previous); // rollback
      setMessage("❌ პარამეტრის შენახვა ვერ მოხერხდა");
    } finally {
      setTogglingFlag(false);
    }
  };

  const retryPayment = async (paymentId: string) => {
    setRetryingId(paymentId);
    setMessage("");
    try {
      const res = await fetchWithAuth(`/etsy/fee-payments/${paymentId}/retry`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMessage("✅ Listing-ი წარმატებით გამოქვეყნდა");
      } else {
        setMessage(`❌ ${data.message || "ხელახლა ცდა ვერ მოხერხდა"}`);
      }
      await loadData();
    } catch {
      setMessage("❌ ხელახლა ცდა ვერ მოხერხდა");
    } finally {
      setRetryingId(null);
    }
  };

  const saveSettings = async () => {
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/settings", {
        method: "PUT",
        body: JSON.stringify({
          listingFeeGel,
          commissionPercent,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings(data);
        setMessage("✅ პარამეტრები შენახულია");
      } else {
        setMessage(`❌ ${data.message || "პარამეტრების შენახვა ვერ მოხერხდა"}`);
      }
    } catch {
      setMessage("❌ პარამეტრების შენახვა ვერ მოხერხდა");
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Etsy ინტეგრაცია</h1>
          <p>იტვირთება...</p>
        </div>
      </div>
    );
  }

  const examplePrice = 100;
  const exampleWithCommission = Math.round(
    examplePrice * (1 + commissionPercent / 100) * 100
  ) / 100;

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">🛒 Etsy ინტეგრაცია</h1>

        {message && (
          <div
            className={`p-4 mb-6 rounded ${
              message.startsWith("✅") || message.startsWith("🔗")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {message}
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">კავშირის სტატუსი</h2>
            <button
              onClick={loadData}
              disabled={working}
              className="text-sm text-blue-600 hover:underline disabled:text-gray-400"
            >
              🔄 სტატუსის განახლება
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="border rounded p-4">
              <div className="text-sm text-gray-600">კონფიგურაცია (.env)</div>
              <div
                className={`text-lg font-bold ${
                  status?.configured ? "text-green-600" : "text-red-600"
                }`}
              >
                {status?.configured ? "✅ დაყენებულია" : "❌ აკლია ETSY_KEYSTRING / ETSY_REDIRECT_URI"}
              </div>
            </div>

            <div className="border rounded p-4">
              <div className="text-sm text-gray-600">Etsy მაღაზია</div>
              <div
                className={`text-lg font-bold ${
                  status?.connected ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {status?.connected
                  ? `✅ დაკავშირებულია${status.shopName ? ` — ${status.shopName}` : ""}`
                  : "⚠️ არ არის დაკავშირებული"}
              </div>
              {status?.connected && (
                <div className="text-sm text-gray-500 mt-1">
                  {status.shopId && <div>Shop ID: {status.shopId}</div>}
                  {status.tokenExpiresAt && (
                    <div>
                      ტოკენის ვადა:{" "}
                      {new Date(status.tokenExpiresAt).toLocaleString("ka-GE")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={ping}
              disabled={working || !status?.configured}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              API-ს შემოწმება (Ping)
            </button>

            {!status?.connected ? (
              <button
                onClick={connect}
                disabled={working || !status?.configured}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:bg-gray-400"
              >
                Etsy მაღაზიის დაკავშირება
              </button>
            ) : (
              <>
                <button
                  onClick={refreshTokens}
                  disabled={working}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  🔄 ტოკენების განახლება
                </button>
                <button
                  onClick={disconnect}
                  disabled={working}
                  className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
                >
                  გათიშვა
                </button>
              </>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>შენიშვნა:</strong> ტოკენები ავტომატურად ახლდება ყოველ საათში
            და კვირაში ერთხელ keep-alive cron-ითაც. ხელით განახლება მხოლოდ
            შემოწმებისთვის დაგჭირდებათ.
          </div>
        </div>

        {/* Feature Flag — controls the whole Etsy feature */}
        <div
          className={`shadow rounded-lg p-6 mb-6 border-2 ${
            integrationEnabled
              ? "bg-green-50 border-green-300"
              : "bg-white border-gray-200"
          }`}
        >
          <h2 className="text-xl font-semibold mb-1">
            🚀 ინტეგრაციის მართვა
          </h2>
          <p className="text-sm text-gray-600 mb-5">
            ერთი მთავარი ჩამრთველი აკონტროლებს მთელ Etsy ფუნქციონალს —
            გამყიდველების ღილაკებს, ფასის კალკულაციას და ყველა შეთავაზებას.
          </p>

          <div className="flex items-center justify-between py-3 border-b border-gray-200">
            <div className="pr-4">
              <div className="font-semibold text-gray-900">
                Etsy ინტეგრაცია გამყიდველებისთვის
              </div>
              <div className="text-sm text-gray-500">
                ჩართვისას გამყიდველები დაინახავენ „Etsy-ზე განთავსების"
                შესაძლებლობას თავიანთ ნამუშევრებზე
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold ${
                  integrationEnabled ? "text-green-600" : "text-gray-400"
                }`}
              >
                {integrationEnabled ? "ჩართულია" : "გამორთულია"}
              </span>
              <Toggle
                checked={integrationEnabled}
                disabled={togglingFlag}
                onChange={(v) => toggleFlag("integrationEnabled", v)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="pr-4">
              <div className="font-semibold text-gray-900">
                ტესტირება ადმინებისთვის
              </div>
              <div className="text-sm text-gray-500">
                ადმინები იყენებენ Etsy ფუნქციას მაშინაც, როცა მთავარი
                ჩამრთველი გამორთულია — ლაივზე გაშვებამდე შესამოწმებლად
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm font-bold ${
                  enabledForAdmins ? "text-green-600" : "text-gray-400"
                }`}
              >
                {enabledForAdmins ? "ჩართულია" : "გამორთულია"}
              </span>
              <Toggle
                checked={enabledForAdmins}
                disabled={togglingFlag}
                onChange={(v) => toggleFlag("enabledForAdmins", v)}
              />
            </div>
          </div>
        </div>

        {/* Stats & monitoring */}
        {stats && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">📊 სტატისტიკა</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold">
                  {stats.listings.total}
                </div>
                <div className="text-sm text-gray-600">სულ listing-ი</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.listings.active}
                </div>
                <div className="text-sm text-gray-600">აქტიური</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {stats.listings.draft}
                </div>
                <div className="text-sm text-gray-600">დრაფტი</div>
              </div>
              <div className="border rounded p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.fees.totalGel}₾
                </div>
                <div className="text-sm text-gray-600">
                  შეგროვებული საფასურები
                </div>
              </div>
            </div>

            {Object.keys(stats.fees.byMethod).length > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                {Object.entries(stats.fees.byMethod)
                  .map(
                    ([method, m]) =>
                      `${method === "card" ? "ბარათით" : method === "balance" ? "ბალანსიდან" : method}: ${m.count} × (${m.totalGel}₾)`,
                  )
                  .join(" · ")}
              </p>
            )}

            {/* Problem payments — money captured, nothing published */}
            {stats.problemPayments.length > 0 && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <h3 className="font-semibold text-red-800 mb-2">
                  ⚠️ ყურადღებას საჭიროებს — გადახდილია, მაგრამ არ
                  გამოქვეყნებულა ({stats.problemPayments.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600">
                        <th className="px-2 py-1">პროდუქტი</th>
                        <th className="px-2 py-1">გამყიდველი</th>
                        <th className="px-2 py-1">თანხა</th>
                        <th className="px-2 py-1">სტატუსი</th>
                        <th className="px-2 py-1">შეცდომა</th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.problemPayments.map((p) => (
                        <tr key={p._id} className="border-t border-red-100">
                          <td className="px-2 py-2">
                            {p.product?.name || "—"}
                          </td>
                          <td className="px-2 py-2">
                            {p.seller?.name || p.seller?.email || "—"}
                          </td>
                          <td className="px-2 py-2">{p.amountGel}₾</td>
                          <td className="px-2 py-2 font-mono text-xs">
                            {p.status}
                          </td>
                          <td
                            className="px-2 py-2 text-xs text-red-700 max-w-[220px] truncate"
                            title={p.error}
                          >
                            {p.error || "—"}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              onClick={() => retryPayment(p._id)}
                              disabled={retryingId === p._id}
                              className="bg-red-600 text-white text-xs px-3 py-1 rounded hover:bg-red-700 disabled:bg-gray-400"
                            >
                              {retryingId === p._id
                                ? "ცდება..."
                                : "🔄 ხელახლა ცდა"}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Recent listings */}
            {stats.recentListings.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  ბოლო listing-ები
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr className="text-left">
                        <th className="px-2 py-1">პროდუქტი</th>
                        <th className="px-2 py-1">გამყიდველი</th>
                        <th className="px-2 py-1">ფასი</th>
                        <th className="px-2 py-1">გადახდა</th>
                        <th className="px-2 py-1">სტატუსი</th>
                        <th className="px-2 py-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentListings.map((l) => (
                        <tr key={l._id} className="border-t">
                          <td className="px-2 py-2">
                            {l.product?.name || "—"}
                          </td>
                          <td className="px-2 py-2">{l.seller?.name || "—"}</td>
                          <td className="px-2 py-2">
                            {l.priceUsd ? `$${l.priceUsd}` : "—"}
                          </td>
                          <td className="px-2 py-2 text-xs">
                            {l.feePaymentMethod === "card"
                              ? "💳 ბარათი"
                              : l.feePaymentMethod === "balance"
                                ? "👛 ბალანსი"
                                : "—"}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                l.state === "active"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                              title={l.warnings?.join("\n") || undefined}
                            >
                              {l.state}
                              {(l.warnings?.length ?? 0) > 0 && " ⚠️"}
                            </span>
                          </td>
                          <td className="px-2 py-2">
                            {l.listingUrl && (
                              <a
                                href={l.listingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Etsy ↗
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {stats.listings.total === 0 &&
              stats.problemPayments.length === 0 && (
                <p className="text-gray-500 text-sm">
                  ჯერ არცერთი listing-ი არ განთავსებულა Etsy-ზე.
                </p>
              )}
          </div>
        )}

        {/* Marketplace Settings */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">პარამეტრები</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Listing-ის საფასური გამყიდველისთვის (GEL)
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={listingFeeGel}
                onChange={(e) => setListingFeeGel(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                რას გადაიხდის გამყიდველი ყოველი ნივთის Etsy-ზე განთავსებაში
                (ფარავს Etsy-ს $0.20 listing fee-ს + ჩვენს მარჟას)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Etsy საკომისიო (%)
              </label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={commissionPercent}
                onChange={(e) =>
                  setCommissionPercent(parseFloat(e.target.value) || 0)
                }
                className="w-full border border-gray-300 rounded px-4 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                ემატება გამყიდველის ფასზე <strong>ზემოდან</strong> — გამყიდველის
                ფასს არასდროს აკლდება
              </p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            disabled={working}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {working ? "ინახება..." : "შენახვა"}
          </button>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>მაგალითი:</strong> გამყიდველის ფასი {examplePrice} GEL +{" "}
            {commissionPercent}% საკომისიო = <strong>{exampleWithCommission} GEL</strong>{" "}
            — ეს თანხა გადაითვლება USD-ში (NBG-ის კურსით) და ის გამოჩნდება Etsy-ზე.
            გაყიდვისას გამყიდველი მიიღებს{" "}
            <strong>{Math.round(examplePrice * 0.9 * 100) / 100} GEL</strong>-ს —
            ფასს გამოკლებული SoulArt-ის სტანდარტული 10% საკომისიო, ისევე როგორც
            საიტზე გაყიდვისას. დამატებით, განთავსებისას გამყიდველი იხდის{" "}
            {listingFeeGel} GEL-ს (ბალანსიდან ან ბარათით).
          </div>
        </div>

        {/* Etsy Fee Policy Reference */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-2">
            📋 Etsy-ს საკომისიოების პოლიტიკა (ცნობარი)
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            ეს არის Etsy-ს მოსაკრებლები, რომლებსაც ისინი ჩვენ (მაღაზიის მფლობელს)
            მოგვაკრებენ ყოველ listing-ზე/გაყიდვაზე. საკომისიო ისე დააყენეთ, რომ
            ჯამში ეს ხარჯები დაიფაროს.{" "}
            <a
              href="https://www.etsy.com/legal/fees/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              სრული პოლიტიკა →
            </a>
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">მოსაკრებელი</th>
                  <th className="px-4 py-2 text-left whitespace-nowrap">ოდენობა</th>
                  <th className="px-4 py-2 text-left">აღწერა</th>
                </tr>
              </thead>
              <tbody>
                {ETSY_FEES.map((fee) => (
                  <tr key={fee.name} className="border-t align-top">
                    <td className="px-4 py-2 font-medium whitespace-nowrap">
                      {fee.name}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">{fee.amount}</td>
                    <td className="px-4 py-2 text-gray-600">{fee.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
            <strong>ორიენტირი:</strong> ჩვეულებრივ გაყიდვაზე Etsy ჯამში ~13-16%-ს
            იღებს (transaction 6.5% + processing ~4% + conversion 2.5%), Offsite
            Ads-ის შემთხვევაში კი 25%-ზე მეტსაც. ამიტომ საკომისიო მინიმუმ{" "}
            <strong>20%</strong>-ის ფარგლებში არის რეკომენდებული, რომ არცერთ
            შემთხვევაში არ ვიმუშაოთ ზარალზე.
          </div>
        </div>
      </div>
    </div>
  );
}
