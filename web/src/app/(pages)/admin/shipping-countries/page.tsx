"use client";

import { useState, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

interface ShippingCountry {
  _id: string;
  countryCode: string;
  countryName: string;
  cost: number;
  isFree: boolean;
  isActive: boolean;
}

export default function ShippingCountriesPage() {
  const [countries, setCountries] = useState<ShippingCountry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // New country form
  const [newCountry, setNewCountry] = useState({
    countryCode: "",
    countryName: "",
    cost: 0,
    isFree: false,
  });

  useEffect(() => {
    loadCountries();
  }, []);

  const loadCountries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/shipping-countries`);
      if (res.ok) {
        const data = await res.json();
        setCountries(data);
      }
    } catch (error) {
      console.error("Error loading shipping countries:", error);
      setMessage("Error loading countries");
    } finally {
      setLoading(false);
    }
  };

  const createCountry = async () => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/shipping-countries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCountry),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Country added successfully");
        setNewCountry({ countryCode: "", countryName: "", cost: 0, isFree: false });
        loadCountries();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error creating country:", error);
      setMessage("❌ Error creating country");
    } finally {
      setSaving(false);
    }
  };

  const updateCountry = async (country: ShippingCountry) => {
    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth(`/shipping-countries/${country.countryCode}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          countryName: country.countryName,
          cost: country.cost,
          isFree: country.isFree,
          isActive: country.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Country updated successfully");
        setEditingId(null);
        loadCountries();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating country:", error);
      setMessage("❌ Error updating country");
    } finally {
      setSaving(false);
    }
  };

  const deleteCountry = async (countryCode: string) => {
    if (!confirm(`Are you sure you want to remove ${countryCode}?`)) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth(`/shipping-countries/${countryCode}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Country removed successfully");
        loadCountries();
      } else {
        setMessage(`❌ Error: ${data.error || "Failed to delete"}`);
      }
    } catch (error) {
      console.error("Error deleting country:", error);
      setMessage("❌ Error deleting country");
    } finally {
      setSaving(false);
    }
  };

  const initializeDefaults = async () => {
    if (!confirm("Initialize default countries (GE, IT, DE, FR, ES, US)?")) return;

    try {
      setSaving(true);
      setMessage("");

      const response = await fetchWithAuth("/shipping-countries/initialize/defaults", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setMessage("✅ Default countries initialized");
        loadCountries();
      } else {
        setMessage(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error("Error initializing defaults:", error);
      setMessage("❌ Error initializing defaults");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Shipping Countries</h1>
          <p className="text-gray-600">Manage available shipping destinations and costs</p>
        </div>
        <button
          onClick={initializeDefaults}
          disabled={saving || countries.length > 0}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 text-sm"
        >
          Initialize Defaults
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded mb-6 ${message.includes("✅") ? "bg-green-100" : "bg-red-100"}`}>
          {message}
        </div>
      )}

      {/* Add New Country */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Add New Country</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country Code
            </label>
            <input
              type="text"
              placeholder="e.g., GB, NL"
              value={newCountry.countryCode}
              onChange={(e) =>
                setNewCountry({ ...newCountry, countryCode: e.target.value.toUpperCase() })
              }
              className="w-full border border-gray-300 rounded px-4 py-2"
              maxLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Country Name
            </label>
            <input
              type="text"
              placeholder="e.g., United Kingdom"
              value={newCountry.countryName}
              onChange={(e) =>
                setNewCountry({ ...newCountry, countryName: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-4 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cost (GEL)
            </label>
            <input
              type="number"
              min="0"
              value={newCountry.cost}
              onChange={(e) =>
                setNewCountry({ ...newCountry, cost: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded px-4 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={createCountry}
              disabled={saving || !newCountry.countryCode || !newCountry.countryName}
              className="w-full bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? "Adding..." : "Add Country"}
            </button>
          </div>
        </div>
        <div className="mt-3">
          <label className="flex items-center text-sm">
            <input
              type="checkbox"
              checked={newCountry.isFree}
              onChange={(e) =>
                setNewCountry({ ...newCountry, isFree: e.target.checked })
              }
              className="mr-2"
            />
            Free shipping
          </label>
        </div>
      </div>

      {/* Countries Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Country
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost (GEL)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Free
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Active
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {countries.map((country) => (
              <tr key={country._id}>
                <td className="px-6 py-4 whitespace-nowrap font-mono font-bold">
                  {country.countryCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === country._id ? (
                    <input
                      type="text"
                      value={country.countryName}
                      onChange={(e) =>
                        setCountries(
                          countries.map((c) =>
                            c._id === country._id
                              ? { ...c, countryName: e.target.value }
                              : c
                          )
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1"
                    />
                  ) : (
                    country.countryName
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === country._id ? (
                    <input
                      type="number"
                      min="0"
                      value={country.cost}
                      onChange={(e) =>
                        setCountries(
                          countries.map((c) =>
                            c._id === country._id
                              ? { ...c, cost: parseFloat(e.target.value) || 0 }
                              : c
                          )
                        )
                      }
                      className="border border-gray-300 rounded px-2 py-1 w-24"
                    />
                  ) : (
                    `${country.cost} ₾`
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === country._id ? (
                    <input
                      type="checkbox"
                      checked={country.isFree}
                      onChange={(e) =>
                        setCountries(
                          countries.map((c) =>
                            c._id === country._id
                              ? { ...c, isFree: e.target.checked, cost: e.target.checked ? 0 : c.cost }
                              : c
                          )
                        )
                      }
                    />
                  ) : country.isFree ? (
                    "✅"
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingId === country._id ? (
                    <input
                      type="checkbox"
                      checked={country.isActive}
                      onChange={(e) =>
                        setCountries(
                          countries.map((c) =>
                            c._id === country._id
                              ? { ...c, isActive: e.target.checked }
                              : c
                          )
                        )
                      }
                    />
                  ) : country.isActive ? (
                    <span className="text-green-600">●</span>
                  ) : (
                    <span className="text-gray-400">●</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {editingId === country._id ? (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => updateCountry(country)}
                        disabled={saving}
                        className="text-green-600 hover:text-green-900 disabled:text-gray-400"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          loadCountries();
                        }}
                        disabled={saving}
                        className="text-gray-600 hover:text-gray-900 disabled:text-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(country._id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCountry(country.countryCode)}
                        disabled={saving}
                        className="text-red-600 hover:text-red-900 disabled:text-gray-400"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {countries.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No shipping countries configured yet. Click &quot;Initialize Defaults&quot; to get started.
          </div>
        )}
      </div>
    </div>
  );
}
