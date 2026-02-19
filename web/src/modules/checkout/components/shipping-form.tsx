"use client";

import { useForm, Controller } from "react-hook-form";
import { useEffect } from "react";
import { apiClient } from "@/lib/axios";
import { useToast } from "@/hooks/use-toast";
import { useCheckout } from "../context/checkout-context";
import { useLanguage } from "@/hooks/LanguageContext";
import {
  formatShippingCost,
  isShippingSupported,
  getShippingRate,
} from "@/lib/shipping";
import { useShippingRates } from "@/lib/use-shipping-rates";

import "./shipping-form.css";

interface ShippingFormData {
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
}

export function ShippingForm() {
  const { shippingAddress, setShippingAddress } = useCheckout();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { rates: shippingCountries, loading: loadingCountries } = useShippingRates();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
    watch,
    reset,
  } = useForm<ShippingFormData>({
    defaultValues: shippingAddress || {
      address: "",
      city: "",
      postalCode: "",
      country: "",
      phoneNumber: "",
    },
  });

  // Update form when shippingAddress changes (e.g., from localStorage)
  useEffect(() => {
    console.log("Shipping form - shippingAddress changed:", shippingAddress);
    if (shippingAddress) {
      reset(shippingAddress);
    }
  }, [shippingAddress, reset]);

  const onSubmit = async (data: ShippingFormData) => {
    try {
      const response = await apiClient.post("/cart/shipping", data);
      const shippingAddress = response.data;
      setShippingAddress(shippingAddress);
      toast({
        title: t("checkout.shippingSaved"),
        description: t("checkout.shippingDetailsSaved"),
      });
    } catch (error) {
      console.log(error);
      toast({
        title: t("checkout.errorSavingShipping"),
        description: t("checkout.tryAgain"),
        variant: "destructive",
      });
    }
  };

  // Auto-save when form is valid
  const watchedValues = watch();
  const isFormValid =
    watchedValues.address &&
    watchedValues.city &&
    watchedValues.country &&
    watchedValues.phoneNumber;

  useEffect(() => {
    if (isFormValid) {
      handleSubmit(onSubmit)();
    }
  }, [
    watchedValues.address,
    watchedValues.city,
    watchedValues.country,
    watchedValues.phoneNumber,
  ]);

  return (
    <div className="shipping-form-card">
      <div className="shipping-form-header">
        <h1>{t("checkout.shippingAddress")}</h1>
        <p>{t("checkout.enterShippingDetails")}</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="shipping-form">
        <div className="shipping-form-field">
          <label htmlFor="address">{t("checkout.streetAddress")}</label>
          <input
            id="address"
            {...register("address", {
              required: t("checkout.addressRequired"),
            })}
            placeholder={t("checkout.addressPlaceholder")}
          />
          {errors.address && (
            <p className="error-text">{errors.address.message}</p>
          )}
        </div>

        <div className="shipping-form-field">
          <label htmlFor="city">{t("checkout.city")}</label>
          <input
            id="city"
            {...register("city", { required: t("checkout.cityRequired") })}
            placeholder={t("checkout.cityPlaceholder")}
          />
          {errors.city && <p className="error-text">{errors.city.message}</p>}
        </div>

        <div className="shipping-form-field">
          <label htmlFor="postalCode">{t("checkout.postalCode")}</label>
          <input
            id="postalCode"
            {...register("postalCode")}
            placeholder={t("checkout.postalCodePlaceholder")}
          />
          {errors.postalCode && (
            <p className="error-text">{errors.postalCode.message}</p>
          )}
        </div>

        <div className="shipping-form-field">
          <label htmlFor="phoneNumber">{t("auth.phoneNumber")}</label>
          <input
            id="phoneNumber"
            {...register("phoneNumber", {
              required: t("auth.phoneNumberRequired"),
            })}
            placeholder={"+995555555555"}
          />
          {errors.phoneNumber && (
            <p className="error-text">{errors.phoneNumber.message}</p>
          )}
        </div>

        <div className="shipping-form-field">
          <label htmlFor="country">{t("checkout.country")}</label>
          <Controller
            name="country"
            control={control}
            rules={{ required: t("checkout.countryRequired") }}
            render={({ field }) => (
              <select {...field} disabled={loadingCountries}>
                <option value="" disabled>
                  {loadingCountries 
                    ? t("checkout.loadingCountries") || "Loading countries..."
                    : t("checkout.selectCountry")}
                </option>
                {shippingCountries.map((country) => (
                  <option key={country.countryCode} value={country.countryCode}>
                    {country.countryName}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.country && (
            <p className="error-text">{errors.country.message}</p>
          )}

          {/* Show shipping cost when country is selected */}
          {watchedValues.country && (
            <div className="shipping-cost-info">
              {isShippingSupported(watchedValues.country) ? (
                <p className="shipping-cost">
                  <strong>{t("cart.shippingCost")}: </strong>
                  {watchedValues.country === "GE"
                    ? t("cart.free")
                    : watchedValues.country !== "GE"
                    ? `${
                        getShippingRate(watchedValues.country)?.cost || 0
                      } ₾ ($${
                        getShippingRate(watchedValues.country)?.costUSD || 0
                      })`
                    : `${getShippingRate(watchedValues.country)?.cost || 0} ₾`}
                </p>
              ) : (
                <p className="shipping-not-supported error-text">
                  {t("cart.shippingNotSupported")}
                </p>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
