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

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, settingsRes] = await Promise.all([
        fetchWithAuth("/etsy/status"),
        fetchWithAuth("/etsy/settings"),
      ]);

      if (statusRes.ok) {
        setStatus(await statusRes.json());
      }
      if (settingsRes.ok) {
        const data: EtsySettings = await settingsRes.json();
        setSettings(data);
        setListingFeeGel(data.listingFeeGel);
        setCommissionPercent(data.commissionPercent);
        setIntegrationEnabled(data.integrationEnabled);
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

  const saveSettings = async () => {
    try {
      setWorking(true);
      setMessage("");
      const res = await fetchWithAuth("/etsy/settings", {
        method: "PUT",
        body: JSON.stringify({
          listingFeeGel,
          commissionPercent,
          integrationEnabled,
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

          <label className="flex items-center gap-3 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={integrationEnabled}
              onChange={(e) => setIntegrationEnabled(e.target.checked)}
              className="w-5 h-5"
            />
            <span className="font-medium">
              Etsy-ზე განთავსების შეთავაზება გამყიდველებისთვის ჩართულია
            </span>
          </label>

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
            გამყიდველი მიიღებს სრულ {examplePrice} GEL-ს. დამატებით, განთავსებისას
            გამყიდველი იხდის {listingFeeGel} GEL-ს.
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
