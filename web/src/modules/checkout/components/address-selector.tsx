"use client";

import { useState, useEffect } from "react";
import { useCheckout } from "../context/checkout-context";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/hooks/LanguageContext";
import { apiClient } from "@/lib/axios";
import { Edit2, Check, Plus } from "lucide-react";
import { useShippingRates } from "@/lib/use-shipping-rates";
import "./address-selector.css";

interface ShippingAddress {
  _id?: string;
  label?: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
}

interface AddressSelectorProps {
  onAddressSelected: (address: ShippingAddress) => void;
}

export function AddressSelector({ onAddressSelected }: AddressSelectorProps) {
  const { shippingAddress, setShippingAddress, guestInfo } = useCheckout();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { rates: shippingCountries, loading: loadingCountries } = useShippingRates();
  const [savedAddresses, setSavedAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state for editing and new address
  const [formData, setFormData] = useState<ShippingAddress>({
    label: "",
    address: "",
    city: "",
    postalCode: "",
    country: "Georgia",
    phoneNumber: "",
  });

  // New address specific state
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const fetchSavedAddresses = async () => {
    // Only fetch saved addresses for authenticated users
    if (!user) {
      setLoading(false);
      // For guests, show the new address form immediately and pre-fill phone number
      setShowNewAddressForm(true);
      if (guestInfo?.phoneNumber) {
        setFormData(prev => ({
          ...prev,
          phoneNumber: guestInfo.phoneNumber,
        }));
      }
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get("/users/me/addresses");
      const addresses = response.data;
      setSavedAddresses(addresses);

      // Auto-select default address if exists
      const defaultAddress = addresses.find((addr: ShippingAddress) => addr.isDefault);
      if (defaultAddress && !shippingAddress) {
        selectAddress(defaultAddress);
      } else if (shippingAddress && (shippingAddress)._id) {
        // If there's already a selected address in context, keep it selected
        setSelectedAddressId((shippingAddress)._id);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSavedAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectAddress = (address: ShippingAddress) => {
    setSelectedAddressId(address._id || null);
    setShippingAddress(address);
    onAddressSelected(address);
    setShowNewAddressForm(false);
  };

  const startEdit = (address: ShippingAddress) => {
    setFormData({
      label: address.label || "",
      address: address.address,
      city: address.city,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
    });
    setEditingId(address._id || null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    resetForm();
  };

  const handleUpdateAddress = async (addressId: string) => {
    try {
      await apiClient.put(`/users/me/addresses/${addressId}`, formData);
      await fetchSavedAddresses();
      setEditingId(null);
      resetForm();
      
      // If this was the selected address, update it
      if (selectedAddressId === addressId) {
        const updatedAddress = { ...formData, _id: addressId };
        setShippingAddress(updatedAddress);
        onAddressSelected(updatedAddress);
      }
    } catch (error) {
      console.error("Failed to update address:", error);
    }
  };

  const handleNewAddress = () => {
    setShowNewAddressForm(true);
    setSelectedAddressId(null);
    setFormData({
      label: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Georgia",
      phoneNumber: user?.phoneNumber || "",
    });
  };

  const handleUseNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();

    if (saveNewAddress) {
      // Save to backend and use it
      try {
        const response = await apiClient.post("/users/me/addresses", formData);
        const newAddress = response.data;
        await fetchSavedAddresses();
        selectAddress(newAddress);
      } catch (error) {
        console.error("Failed to save address:", error);
      }
    } else {
      // Just use it for this order without saving
      const tempAddress = { ...formData };
      setShippingAddress(tempAddress);
      onAddressSelected(tempAddress);
      setSelectedAddressId("temp");
    }
  };

  const resetForm = () => {
    setFormData({
      label: "",
      address: "",
      city: "",
      postalCode: "",
      country: "Georgia",
      phoneNumber: guestInfo?.phoneNumber || user?.phoneNumber || "",
    });
    setSaveNewAddress(false);
  };

  if (loading) {
    return <div className="address-selector-loading">{t("addresses.loading")}</div>;
  }

  return (
    <div className="address-selector">
      <h3 className="address-selector-title">{t("addresses.selectAddress")}</h3>

      {/* Saved Addresses */}
      {savedAddresses.length > 0 && (
        <div className="saved-addresses-list">
          {savedAddresses.map((address) => (
            <div
              key={address._id}
              className={`address-card-selector ${
                selectedAddressId === address._id ? "selected" : ""
              } ${editingId === address._id ? "editing" : ""}`}
            >
              {editingId === address._id ? (
                // Edit Form
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleUpdateAddress(address._id!);
                  }}
                  className="address-edit-form"
                >
                  <div className="form-row">
                    <div className="form-field">
                      <label>{t("addresses.form.name")}</label>
                      <input
                        type="text"
                        value={formData.label}
                        onChange={(e) =>
                          setFormData({ ...formData, label: e.target.value })
                        }
                        placeholder={t("addresses.form.namePlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>{t("addresses.form.address")} *</label>
                      <input
                        type="text"
                        required
                        value={formData.address}
                        onChange={(e) =>
                          setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder={t("addresses.form.addressPlaceholder")}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>{t("addresses.form.city")} *</label>
                      <input
                        type="text"
                        required
                        value={formData.city}
                        onChange={(e) =>
                          setFormData({ ...formData, city: e.target.value })
                        }
                      />
                    </div>
                    <div className="form-field">
                      <label>{t("addresses.form.postalCode")}</label>
                      <input
                        type="text"
                        value={formData.postalCode}
                        onChange={(e) =>
                          setFormData({ ...formData, postalCode: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-field">
                      <label>{t("addresses.form.country")} *</label>
                      <select
                        required
                        value={formData.country}
                        onChange={(e) =>
                          setFormData({ ...formData, country: e.target.value })
                        }
                        disabled={loadingCountries}
                      >
                        {shippingCountries.map((country) => (
                          <option key={country.countryCode} value={country.countryName}>
                            {country.countryName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field">
                      <label>{t("addresses.form.phone")} *</label>
                      <input
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) =>
                          setFormData({ ...formData, phoneNumber: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="btn-save">
                      {t("addresses.actions.save")}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="btn-cancel"
                    >
                      {t("addresses.actions.cancel")}
                    </button>
                  </div>
                </form>
              ) : (
                // Display Mode
                <>
                  <div className="address-card-header">
                    <div className="address-select-radio">
                      <input
                        type="radio"
                        name="selected-address"
                        checked={selectedAddressId === address._id}
                        onChange={() => selectAddress(address)}
                        id={`address-${address._id}`}
                      />
                      <label htmlFor={`address-${address._id}`}>
                        {address.label && (
                          <span className="address-label">{address.label}</span>
                        )}
                        {address.isDefault && (
                          <span className="default-badge-small">
                            <Check size={12} />
                            {t("addresses.badges.default")}
                          </span>
                        )}
                      </label>
                    </div>
                    <button
                      onClick={() => startEdit(address)}
                      className="btn-edit-small"
                      type="button"
                    >
                      <Edit2 size={16} />
                      {t("addresses.actions.edit")}
                    </button>
                  </div>

                  <div className="address-details-compact">
                    <p>{address.address}</p>
                    <p>
                      {address.city}, {address.postalCode}
                    </p>
                    <p>{address.country === 'Georgia' ? t("addresses.form.countryGeorgia") : address.country}</p>
                    <p className="phone">{address.phoneNumber}</p>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* New Address Button / Form */}
      {!showNewAddressForm && !editingId && (
        <button
          onClick={handleNewAddress}
          className="btn-new-address"
          type="button"
        >
          <Plus size={20} />
          {t("addresses.anotherAddress")}
        </button>
      )}

      {showNewAddressForm && (
        <div className="new-address-section">
          <h4>{t("addresses.anotherAddress")}</h4>

          <form onSubmit={handleUseNewAddress} className="new-address-form">
            {/* Save Address Checkbox - only for authenticated users */}
            {user && (
              <div className="save-address-checkbox">
                <label>
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={(e) => setSaveNewAddress(e.target.checked)}
                  />
                  <span>{t("addresses.form.saveToAddresses")}</span>
                </label>
              </div>
            )}

            {/* Label field - only show if saving */}
            {saveNewAddress && user && (
              <>
                <div className="form-row">
                  <div className="form-field">
                    <label>{t("addresses.form.name")}</label>
                    <input
                      type="text"
                      value={formData.label}
                      onChange={(e) =>
                        setFormData({ ...formData, label: e.target.value })
                      }
                      placeholder={t("addresses.form.namePlaceholder")}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={formData.isDefault || false}
                        onChange={(e) =>
                          setFormData({ ...formData, isDefault: e.target.checked })
                        }
                      />
                      {t("addresses.form.setAsDefault")}
                    </label>
                  </div>
                </div>
              </>
            )}

            <div className="form-row">
              <div className="form-field">
                <label>{t("addresses.form.address")} *</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  placeholder={t("addresses.form.addressPlaceholder")}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>{t("addresses.form.city")} *</label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder={t("addresses.form.cityPlaceholder")}
                />
              </div>
              <div className="form-field">
                <label>{t("addresses.form.postalCode")}</label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) =>
                    setFormData({ ...formData, postalCode: e.target.value })
                  }
                  placeholder={t("addresses.form.postalCodePlaceholder")}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label>{t("addresses.form.country")} *</label>
                <select
                  required
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  disabled={loadingCountries}
                >
                  {shippingCountries.map((country) => (
                    <option key={country.countryCode} value={country.countryName}>
                      {country.countryName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label>{t("addresses.form.phone")} *</label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, phoneNumber: e.target.value })
                  }
                  placeholder={t("addresses.form.phonePlaceholder")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save">
                {t("addresses.actions.use")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewAddressForm(false);
                  resetForm();
                }}
                className="btn-cancel"
              >
                {t("addresses.actions.cancel")}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
