"use client";

import { useForm, Controller } from "react-hook-form";
import { apiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useCheckout } from "../context/checkout-context";
import { getCountries } from "@/lib/countries";

import "./shipping-form.css";

interface ShippingFormData {
  address: string;
  city: string;
  postalCode: string;
  country: string;
}

export function ShippingForm() {
  const { setShippingAddress } = useCheckout();
  const router = useRouter();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    control,
  } = useForm<ShippingFormData>();

  const onSubmit = async (data: ShippingFormData) => {
    try {
      const response = await apiClient.post("/cart/shipping", data);
      const shippingAddress = response.data;
      setShippingAddress(shippingAddress);
      router.push("/checkout/payment");
    } catch (error) {
      console.log(error);
      toast({
        title: "Error saving shipping details",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="shipping-form-card">
      <div className="shipping-form-header">
        <h1>Shipping Address</h1>
        <p>Enter your shipping details</p>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="shipping-form">
        <div>
          <label htmlFor="address">Street Address</label>
          <input
            id="address"
            {...register("address", { required: "Address is required" })}
            placeholder="123 Main St"
          />
          {errors.address && (
            <p className="error-text">{errors.address.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="city">City</label>
          <input
            id="city"
            {...register("city", { required: "City is required" })}
            placeholder="New York"
          />
          {errors.city && <p className="error-text">{errors.city.message}</p>}
        </div>

        <div>
          <label htmlFor="postalCode">Postal Code</label>
          <input
            id="postalCode"
            {...register("postalCode", { required: "Postal code is required" })}
            placeholder="10001"
          />
          {errors.postalCode && (
            <p className="error-text">{errors.postalCode.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="country">Country</label>
          <Controller
            name="country"
            control={control}
            rules={{ required: "Country is required" }}
            render={({ field }) => (
              <select {...field} defaultValue="">
                <option value="" disabled>
                  Select a country
                </option>
                {getCountries().map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
            )}
          />
          {errors.country && (
            <p className="error-text">{errors.country.message}</p>
          )}
        </div>

        <button
          type="submit"
          className="shipping-form-button"
          disabled={isSubmitting}
        >
          Continue to Payment
        </button>
      </form>
    </div>
  );
}
