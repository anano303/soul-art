"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface Setting {
  _id: string;
  key: string;
  value: number | string | boolean;
  description?: string;
}

export default function SettingsPage() {
  const [foreignFee, setForeignFee] = useState<number>(20);
  const [foreignShipping, setForeignShipping] = useState<number>(10);
  const [usdRate, setUsdRate] = useState<number>(2.5);
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [allSettings, setAllSettings] = useState<Setting[]>([]);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);

      // Load all settings
      const [feeRes, shippingRes, usdRes, ratesRes, allRes] = await Promise.all([
        fetchWithAuth("/settings/foreign-payment-fee"),
        fetchWithAuth("/settings/foreign-shipping-fee"),
        fetchWithAuth("/settings/usd-rate"),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/exchange-rate/latest`),
        fetchWithAuth("/settings"),
      ]);

      if (feeRes.ok) {
        const data = await feeRes.json();
        setForeignFee(data.fee);
      }

      if (shippingRes.ok) {
        const data = await shippingRes.json();
        setForeignShipping(data.fee);
      }

      if (usdRes.ok) {
        const data = await usdRes.json();
        setUsdRate(data.rate);
      }

      if (ratesRes.ok) {
        const data = await ratesRes.json();
        setExchangeRates(data.rates);
      }

      if (allRes.ok) {
        const data = await allRes.json();
        setAllSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage("Error loading settings");
    } finally {
      setLoading(false);
    }
  };

  const updateForeignFee = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/settings/foreign-payment-fee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee: foreignFee }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Foreign payment fee updated successfully");
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating fee:", error);
      setMessage("❌ Error updating fee");
    } finally {
      setSaving(false);
    }
  };

  const updateForeignShipping = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/settings/foreign-shipping-fee", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fee: foreignShipping }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Foreign shipping fee updated successfully");
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating shipping fee:", error);
      setMessage("❌ Error updating shipping fee");
    } finally {
      setSaving(false);
    }
  };

  const updateUsdRate = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/settings/usd-rate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: usdRate }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ USD rate updated successfully");
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating USD rate:", error);
      setMessage("❌ Error updating USD rate");
    } finally {
      setSaving(false);
    }
  };

  const refreshExchangeRates = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/exchange-rate/refresh", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setExchangeRates(data.rates);
        setMessage("✅ Exchange rates refreshed from NBG");
      } else {
        setMessage(`❌ Error refreshing rates`);
      }
    } catch (error) {
      console.error("Error refreshing rates:", error);
      setMessage("❌ Error refreshing exchange rates");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">System Settings</h1>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">System Settings</h1>

        {message && (
          <div className={`p-4 mb-6 rounded ${message.includes("✅") ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message}
          </div>
        )}

        {/* Foreign Payment Fee */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Foreign Payment Fee</h2>
          <p className="text-gray-600 mb-4">
            Additional percentage charged for foreign currency payments (USD/EUR).
            This covers conversion fees and platform charges.
          </p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fee Percentage
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={foreignFee}
                  onChange={(e) => setForeignFee(parseFloat(e.target.value))}
                  className="flex-1 border border-gray-300 rounded px-4 py-2"
                />
                <span className="text-gray-600">%</span>
              </div>
            </div>

            <button
              onClick={updateForeignFee}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Update Fee"}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>Example:</strong> If a product costs 100 GEL and fee is {foreignFee}%,
            foreign customers pay: 100 × (1 + {foreignFee}/100) = {100 * (1 + foreignFee / 100)} GEL equivalent
          </div>
        </div>

        {/* Foreign Shipping Fee */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Foreign Shipping Fee</h2>
          <p className="text-gray-600 mb-4">
            Additional fixed shipping fee (in GEL) for orders shipped to countries outside Georgia.
            Applied on top of standard shipping cost.
          </p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shipping Fee (GEL)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={foreignShipping}
                  onChange={(e) => setForeignShipping(parseFloat(e.target.value))}
                  className="flex-1 border border-gray-300 rounded px-4 py-2"
                />
                <span className="text-gray-600">₾</span>
              </div>
            </div>

            <button
              onClick={updateForeignShipping}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Update Fee"}
            </button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
            <strong>Example:</strong> If shipping within Georgia is 5 GEL and foreign fee is {foreignShipping} GEL,
            foreign customers pay: 5 + {foreignShipping} = {5 + foreignShipping} GEL for shipping
          </div>
        </div>

        {/* Manual USD Rate (Legacy) */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Manual USD Rate (Legacy)</h2>
          <p className="text-gray-600 mb-4">
            This is the old manual USD rate. <strong>Note:</strong> The system now uses automatic
            NBG exchange rates (see below).
          </p>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                USD to GEL Rate
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">1 USD =</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={usdRate}
                  onChange={(e) => setUsdRate(parseFloat(e.target.value))}
                  className="flex-1 border border-gray-300 rounded px-4 py-2"
                />
                <span className="text-gray-600">GEL</span>
              </div>
            </div>

            <button
              onClick={updateUsdRate}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Saving..." : "Update Rate"}
            </button>
          </div>
        </div>

        {/* NBG Exchange Rates */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">NBG Exchange Rates</h2>
            <button
              onClick={refreshExchangeRates}
              disabled={saving}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
            >
              {saving ? "Refreshing..." : "🔄 Refresh Now"}
            </button>
          </div>

          <p className="text-gray-600 mb-4">
            Automatically updated daily at midnight (Tbilisi time) from National Bank of Georgia.
          </p>

          {exchangeRates ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="border rounded p-4">
                <div className="text-sm text-gray-600">USD Rate</div>
                <div className="text-2xl font-bold">
                  1 GEL = {exchangeRates.USD.toFixed(4)} USD
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  1 USD = {(1 / exchangeRates.USD).toFixed(4)} GEL
                </div>
              </div>

              <div className="border rounded p-4">
                <div className="text-sm text-gray-600">EUR Rate</div>
                <div className="text-2xl font-bold">
                  1 GEL = {exchangeRates.EUR.toFixed(4)} EUR
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  1 EUR = {(1 / exchangeRates.EUR).toFixed(4)} GEL
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No exchange rates available</p>
          )}

          <div className="mt-4 p-3 bg-yellow-50 rounded text-sm">
            <strong>Note:</strong> Exchange rates are automatically fetched from NBG every day at midnight.
            Use the refresh button above to manually update rates if needed.
          </div>
        </div>

        {/* All Settings (Debug) */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">All Settings (Debug)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Key</th>
                  <th className="px-4 py-2 text-left">Value</th>
                  <th className="px-4 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {allSettings.map((setting) => (
                  <tr key={setting._id} className="border-t">
                    <td className="px-4 py-2 font-mono">{setting.key}</td>
                    <td className="px-4 py-2">{JSON.stringify(setting.value)}</td>
                    <td className="px-4 py-2 text-gray-600">{setting.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
