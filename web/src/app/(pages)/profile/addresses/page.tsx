"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/axios";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { Plus, MapPin, Edit2, Trash2, Check } from "lucide-react";
import "./addresses.css";

interface ShippingAddress {
  _id: string;
  label?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

export default function AddressesPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    label: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Georgia",
    phoneNumber: "",
    isDefault: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  // Update phone number in form when user data becomes available
  useEffect(() => {
    if (user?.phoneNumber && !showAddForm && !editingId) {
      setFormData(prev => ({
        ...prev,
        phoneNumber: user.phoneNumber
      }));
    }
  }, [user?.phoneNumber, showAddForm, editingId]);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/users/me/addresses");
      setAddresses(response.data);
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/users/me/addresses", formData);
      await fetchAddresses();
      setShowAddForm(false);
      resetForm();
    } catch (error) {
      console.error("Failed to add address:", error);
    }
  };

  const handleUpdateAddress = async (addressId: string) => {
    try {
      await apiClient.put(`/users/me/addresses/${addressId}`, formData);
      await fetchAddresses();
      setEditingId(null);
      resetForm();
    } catch (error) {
      console.error("Failed to update address:", error);
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm(t("addresses.confirmDelete"))) return;
    
    try {
      await apiClient.delete(`/users/me/addresses/${addressId}`);
      await fetchAddresses();
    } catch (error) {
      console.error("Failed to delete address:", error);
    }
  };

  const handleSetDefault = async (addressId: string) => {
    try {
      await apiClient.put(`/users/me/addresses/${addressId}/default`);
      await fetchAddresses();
    } catch (error) {
      console.error("Failed to set default address:", error);
    }
  };

  const startEdit = (address: ShippingAddress) => {
    setFormData({
      label: address.label || "",
      address: address.address,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      isDefault: address.isDefault,
    });
    setEditingId(address._id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      label: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Georgia",
      phoneNumber: user?.phoneNumber || "",
      isDefault: false,
    });
  };

  if (loading) {
    return (
      <div className="addresses-page">
        <div className="loading">{t("addresses.loading")}</div>
      </div>
    );
  }

  return (
    <div className="addresses-page">
      <div className="addresses-header">
        <h1>{t("addresses.title")}</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-add-address"
          disabled={showAddForm}
        >
          <Plus size={20} />
          {t("addresses.addNew")}
        </button>
      </div>

      {showAddForm && (
        <div className="address-form-card">
          <h3>{t("addresses.addNewAddress")}</h3>
          <form onSubmit={handleAddAddress}>
            <div className="form-grid">
              <div className="form-field">
                <label>{t("addresses.form.name")}</label>
                <input
                  type="text"
                  value={formData.label}
                  onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                  placeholder={t("addresses.form.namePlaceholder")}
                />
              </div>

              <div className="form-field full-width">
                <label>{t("addresses.form.address")} *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder={t("addresses.form.addressPlaceholder")}
                />
              </div>

              <div className="form-field">
                <label>{t("addresses.form.city")} *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder={t("addresses.form.cityPlaceholder")}
                />
              </div>

              <div className="form-field">
                <label>{t("addresses.form.postalCode")}</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                  placeholder={t("addresses.form.postalCodePlaceholder")}
                />
              </div>

              <div className="form-field">
                <label>{t("addresses.form.country")} *</label>
                <select
                  required
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                >
                  <option value="Georgia">{t("addresses.form.countryGeorgia")}</option>
                </select>
              </div>

              <div className="form-field">
                <label>{t("addresses.form.phone")} *</label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  placeholder={t("addresses.form.phonePlaceholder")}
                />
              </div>

              <div className="form-field full-width">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  />
                  {t("addresses.form.setAsDefault")}
                </label>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {t("addresses.actions.add")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  resetForm();
                }}
                className="btn-secondary"
              >
                {t("addresses.actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="addresses-list">
        {addresses.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} />
            <h3>{t("addresses.empty.title")}</h3>
            <p>{t("addresses.empty.description")}</p>
          </div>
        ) : (
          addresses.map((address) => (
            <div
              key={address._id}
              className={`address-card ${address.isDefault ? "default" : ""}`}
            >
              {editingId === address._id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateAddress(address._id);
                  }}
                  className="edit-form"
                >
                  <div className="form-grid">
                    <div className="form-field">
                      <label>{t("addresses.form.name")}</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                      />
                    </div>

                    <div className="form-field full-width">
                      <label>{t("addresses.form.address")} *</label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("addresses.form.city")} *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("addresses.form.postalCode")}</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                      />
                    </div>

                    <div className="form-field">
                      <label>{t("addresses.form.country")} *</label>
                      <select
                        required
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      >
                        <option value="Georgia">{t("addresses.form.countryGeorgia")}</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label>{t("addresses.form.phone")} *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-primary btn-small">
                      {t("addresses.actions.save")}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="btn-secondary btn-small"
                    >
                      {t("addresses.actions.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="address-header">
                    {address.label && <h3>{address.label}</h3>}
                    {address.isDefault && (
                      <span className="default-badge">
                        <Check size={14} />
                        {t("addresses.badges.default")}
                      </span>
                    )}
                  </div>

                  <div className="address-details">
                    <p className="address-line">{address.address}</p>
                    <p className="address-line">
                      {address.city}, {address.postalCode}
                    </p>
                    <p className="address-line">{address.country === 'Georgia' ? t("addresses.form.countryGeorgia") : address.country}</p>
                    <p className="address-line phone">{address.phoneNumber}</p>
                  </div>

                  <div className="address-actions">
                    {!address.isDefault && (
                      <button
                        onClick={() => handleSetDefault(address._id)}
                        className="btn-link"
                      >
                        <Check size={16} />
                        {t("addresses.actions.setAsDefault")}
                      </button>
                    )}
                    <button
                      onClick={() => startEdit(address)}
                      className="btn-link"
                    >
                      <Edit2 size={16} />
                      {t("addresses.actions.edit")}
                    </button>
                    <button
                      onClick={() => handleDeleteAddress(address._id)}
                      className="btn-link danger"
                    >
                      <Trash2 size={16} />
                      {t("addresses.actions.delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
