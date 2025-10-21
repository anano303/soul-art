import { useCheckout } from "@/modules/checkout/context/checkout-context";
import { useLanguage } from "@/hooks/LanguageContext";
import { calculateShipping, getShippingRate } from "@/lib/shipping";

export function ShippingIndicator() {
  const { t } = useLanguage();
  const { shippingAddress } = useCheckout();

  const shippingCountry = shippingAddress?.country || "GE";
  const shippingCost = calculateShipping(shippingCountry);
  const shippingRate = getShippingRate(shippingCountry);

  return (
    <div
      style={{
        padding: "10px",
        backgroundColor: "#f0f0f0",
        margin: "10px 0",
        borderRadius: "5px",
      }}
    >
      <h4>Shipping Debug Info:</h4>
      <p>Selected Country: {shippingCountry}</p>
      <p>Shipping Address: {JSON.stringify(shippingAddress)}</p>
      <p>Shipping Cost: {shippingCost} ₾</p>
      <p>Is Free: {shippingCost === 0 ? "Yes" : "No"}</p>
      <p>Shipping Rate: {JSON.stringify(shippingRate)}</p>
    </div>
  );
}
