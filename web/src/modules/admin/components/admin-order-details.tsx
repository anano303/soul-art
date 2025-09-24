"use client";

import { CheckCircle2, XCircle, Store, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Order, OrderItem } from "@/types/order";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useLanguage } from "@/hooks/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import { Color, AgeGroupItem } from "@/types";
import { getUserData } from "@/lib/auth";
import { Role } from "@/types/role";
import "./AdminOrderDetails.css";

interface AdminOrderDetailsProps {
  order: Order;
}

export function AdminOrderDetails({ order }: AdminOrderDetailsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { language, t } = useLanguage();

  // Debug: Log order shipping details
  console.log("Order shipping details:", order.shippingDetails);
  console.log("Order user phone:", order.user.phoneNumber);

  // Check user role to determine what information to show
  const userData = getUserData();
  const isAdmin = userData?.role === Role.Admin;

  // Fetch all colors for proper nameEn support
  const { data: availableColors = [] } = useQuery<Color[]>({
    queryKey: ["colors"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth("/categories/attributes/colors");
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Fetch all age groups for proper nameEn support
  const { data: availableAgeGroups = [] } = useQuery<AgeGroupItem[]>({
    queryKey: ["ageGroups"],
    queryFn: async () => {
      try {
        const response = await fetchWithAuth(
          "/categories/attributes/age-groups"
        );
        if (!response.ok) {
          return [];
        }
        return response.json();
      } catch {
        return [];
      }
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Get localized color name based on current language
  const getLocalizedColorName = (colorName: string): string => {
    if (language === "en") {
      // Find the color in availableColors to get its English name
      const colorObj = availableColors.find(
        (color) => color.name === colorName
      );
      return colorObj?.nameEn || colorName;
    }
    return colorName;
  };

  // Get localized age group name based on current language
  const getLocalizedAgeGroupName = (ageGroupName: string): string => {
    if (language === "en") {
      // Find the age group in availableAgeGroups to get its English name
      const ageGroupObj = availableAgeGroups.find(
        (ageGroup) => ageGroup.name === ageGroupName
      );
      return ageGroupObj?.nameEn || ageGroupName;
    }
    return ageGroupName;
  };

  // Helper function to get display name based on language
  const getDisplayName = (item: OrderItem) => {
    return language === "en" && item.nameEn ? item.nameEn : item.name;
  };

  // Group order items by delivery type with fixed logic for string comparison
  const sellerDeliveryItems = order.orderItems.filter(
    (item) => item.product && String(item.product.deliveryType) === "SELLER"
  );

  const soulartDeliveryItems = order.orderItems.filter(
    (item) => !item.product || String(item.product.deliveryType) !== "SELLER"
  );

  // Fetch seller info for each product - only for admins
  const { data: sellerInfo = [], isLoading: isLoadingSellerInfo } = useQuery({
    queryKey: ["sellerInfo", order.orderItems.map((item) => item.productId)],
    queryFn: async () => {
      if (!isAdmin) {
        return []; // Don't fetch seller info for non-admin users
      }

      try {
        // Get unique product IDs to avoid duplicate requests
        const productIds = [
          ...new Set(order.orderItems.map((item) => item.productId)),
        ];

        // Fetch seller info for each product
        const sellerData = await Promise.all(
          productIds.map(async (productId) => {
            try {
              const response = await fetchWithAuth(
                `/products/${productId}/seller`
              );

              // Handle 404 specifically to indicate endpoint not implemented
              if (response.status === 404) {
                console.log(
                  `Seller endpoint not available for product ${productId} (404 Not Found)`
                );
                return { productId, seller: null, endpointMissing: true };
              }

              if (!response.ok) {
                return { productId, seller: null };
              }

              const data = await response.json();
              console.log(`Seller data for product ${productId}:`, data);
              return { productId, seller: data };
            } catch (error) {
              console.error(
                `Error fetching seller info for product ${productId}:`,
                error
              );
              return { productId, seller: null };
            }
          })
        );

        return sellerData;
      } catch (error) {
        console.error("Error fetching seller information:", error);
        return [];
      }
    },
    enabled: isAdmin, // Only enable for admins
    retry: 0, // Don't retry since we're handling 404s explicitly
    refetchOnWindowFocus: false,
  });

  const markAsDelivered = async () => {
    try {
      await apiClient.put(`/orders/${order._id}/deliver`);
      toast({ title: "Success", description: "Order marked as delivered" });

      // Send delivery notification to the customer
      try {
        await fetch("/api/push/order-status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            userId: order.user._id,
            orderId: order._id,
            status: "delivered",
            customerName: order.user.ownerFirstName || order.user.email,
            message: `🎉 თქვენი შეკვეთა #${order._id.slice(
              -6
            )} წარმატებით მიღებულია!`,
          }),
        });
        console.log("✅ Order delivery notification sent");
      } catch (notificationError) {
        console.error(
          "❌ Failed to send delivery notification:",
          notificationError
        );
      }

      router.refresh();
    } catch (error: unknown) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to mark order as delivered",
        variant: "destructive",
      });
    }
  };

  // Helper function to get color from name for avatar
  const getColorFromName = (name: string): string => {
    const colors = [
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
      "#9370DB",
      "#48A36D",
      "#F9A03F",
      "#D46A6A",
      "#4A90E2",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#009688",
      "#4CAF50",
      "#8BC34A",
      "#CDDC39",
    ];

    if (!name) return colors[0];

    let sum = 0;
    for (let i = 0; i < name.length; i++) {
      sum += name.charCodeAt(i);
    }

    return colors[sum % colors.length];
  };

  // Avatar component for fallback when no image is available
  const AvatarInitial = ({
    name,
    size = 80,
  }: {
    name: string;
    size?: number;
  }) => {
    const initial = name ? name.charAt(0).toUpperCase() : "?";
    const bgColor = getColorFromName(name);

    return (
      <div
        className="avatar-initial"
        style={{
          backgroundColor: bgColor,
          width: `${size}px`,
          height: `${size}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontSize: `${size / 3}px`,
          fontWeight: "bold",
          color: "white",
          textTransform: "uppercase",
          border: "3px solid var(--primary-color, #012645)",
        }}
      >
        {initial}
      </div>
    );
  };

  // Helper function to ensure image paths are properly formatted
  const getImageSrc = (imagePath: string) => {
    if (!imagePath) return "";

    // If it's a Cloudinary URL, return it directly
    if (imagePath.includes("cloudinary.com")) {
      return imagePath;
    }

    // If already a full URL, return it directly
    if (imagePath.startsWith("http")) {
      return imagePath;
    }

    // For product images that use API endpoints
    if (!imagePath.startsWith("/api/")) {
      return `/api/${imagePath}`;
    }

    return imagePath;
  };

  // Helper function to get seller image with fallback logic
  const getSellerImage = (sellerInfo: {
    storeLogoPath?: string;
    profileImagePath?: string;
    storeLogo?: string;
    profileImage?: string;
    brandLogo?: string;
    name?: string;
    storeName?: string;
    ownerFirstName?: string;
  }) => {
    // Priority: profileImage > profileImagePath > storeLogo > storeLogoPath > brandLogo
    if (sellerInfo.profileImage) {
      return getImageSrc(sellerInfo.profileImage);
    }
    if (sellerInfo.profileImagePath) {
      return getImageSrc(sellerInfo.profileImagePath);
    }
    if (sellerInfo.storeLogo) {
      return getImageSrc(sellerInfo.storeLogo);
    }
    if (sellerInfo.storeLogoPath) {
      return getImageSrc(sellerInfo.storeLogoPath);
    }
    if (sellerInfo.brandLogo) {
      return getImageSrc(sellerInfo.brandLogo);
    }
    return null;
  };
  return (
    <div className="admin-order-details">
      <div className="headerOrders">
        {" "}
        <h1>{t("adminOrders.orderNumber", { id: order._id })}</h1>
        <div className="status">
          <span
            className={`badge ${
              order.status === "cancelled"
                ? "cancelled"
                : order.status === "paid" || order.isPaid
                ? "paid"
                : "pending"
            }`}
          >
            {order.status === "cancelled"
              ? t("adminOrders.cancelled")
              : order.status === "paid" || order.isPaid
              ? t("adminOrders.paid")
              : t("adminOrders.pendingPayment")}
          </span>
          {(order.status === "paid" || order.isPaid) &&
            !order.isDelivered &&
            order.status !== "cancelled" && (
              <button className="deliver-btn" onClick={markAsDelivered}>
                {t("adminOrders.markAsDelivered")}
              </button>
            )}
        </div>
      </div>

      <div className="grid-container">
        <div className="left-section">
          {/* Shipping Info */}{" "}
          <div className="card">
            <h2>{t("adminOrders.shipping")}</h2>
            <p>
              <strong>{t("adminOrders.customer")}:</strong> {order.user.name}
            </p>
            <p>
              <strong>Email:</strong> {order.user.email}
            </p>
            {order.user.phoneNumber && (
              <p>
                <strong>{t("adminOrders.phone")}:</strong>{" "}
                {order.user.phoneNumber}
              </p>
            )}
            {order.shippingDetails.phoneNumber &&
              order.shippingDetails.phoneNumber !== order.user.phoneNumber && (
                <p>
                  <strong>{t("adminOrders.shippingPhone")}:</strong>{" "}
                  {order.shippingDetails.phoneNumber}
                </p>
              )}
            <p>
              <strong>{t("adminOrders.address")}:</strong>{" "}
              {order.shippingDetails.address}, {order.shippingDetails.city},{" "}
              {order.shippingDetails.postalCode},{" "}
              {order.shippingDetails.country}
            </p>
            <div className={`alert ${order.isDelivered ? "success" : "error"}`}>
              {order.isDelivered ? <CheckCircle2 /> : <XCircle />}
              <span>
                {order.isDelivered
                  ? t("adminOrders.deliveredOn", {
                      date: new Date(order.deliveredAt!).toLocaleDateString(),
                    })
                  : t("adminOrders.notDelivered")}
              </span>
            </div>
          </div>
          {/* Payment Info */}{" "}
          <div className="card">
            <h2>{t("adminOrders.payment")}</h2>
            <p>
              <strong>{t("adminOrders.method")}:</strong> {order.paymentMethod}
            </p>
            <div
              className={`alert ${
                order.status === "cancelled"
                  ? "cancelled"
                  : order.status === "paid" || order.isPaid
                  ? "success"
                  : "error"
              }`}
            >
              {order.status === "cancelled" ? (
                <XCircle />
              ) : order.status === "paid" || order.isPaid ? (
                <CheckCircle2 />
              ) : (
                <XCircle />
              )}
              <span>
                {order.status === "cancelled"
                  ? t("adminOrders.orderCancelled", {
                      reason: order.statusReason || "Unknown reason",
                    })
                  : order.status === "paid" || order.isPaid
                  ? t("adminOrders.paidOn", {
                      date: new Date(order.paidAt!).toLocaleDateString(),
                    })
                  : t("adminOrders.notPaid")}
              </span>
            </div>
          </div>
          {/* Seller Information - Only show for admins */}
          {isAdmin && (
            <div className="card">
              <h2>{t("adminOrders.sellerInfo")}</h2>

              {isLoadingSellerInfo ? (
                <div className="loading-state">
                  <p>{t("adminOrders.loading")}</p>
                </div>
              ) : sellerInfo.length > 0 &&
                sellerInfo.some((info) => info.endpointMissing) ? (
                <div className="notice-state">
                  <p>{t("adminOrders.sellerEndpointMissing")}</p>
                  <p className="notice-info">
                    {t("adminOrders.pleaseCheckBackLater")}
                  </p>
                </div>
              ) : (
                order.orderItems.map((item) => {
                  // Find seller info for this product if available
                  const productId =
                    typeof item.productId === "string"
                      ? item.productId
                      : item.productId._id;
                  const productSellerInfo = sellerInfo.find(
                    (info) => info.productId === productId
                  )?.seller;

                  return (
                    <div key={`seller-${productId}`} className="seller-info">
                      <h3>{item.name}</h3>
                      <div className="seller-details-grid">
                        <p>
                          <strong>{t("adminOrders.productId")}:</strong>{" "}
                          {typeof item.productId === "string"
                            ? item.productId
                            : item.productId._id}
                        </p>

                        {/* Show product info */}
                        {item.product?.deliveryType && (
                          <p>
                            <strong>{t("adminOrders.deliveryType")}:</strong>{" "}
                            {item.product.deliveryType}
                          </p>
                        )}
                        {item.product?.brand && (
                          <p>
                            <strong>{t("adminOrders.brand")}:</strong>{" "}
                            {item.product.brand}
                          </p>
                        )}
                        <p>
                          <strong>{t("adminOrders.price")}:</strong>{" "}
                          {item.price.toFixed(2)} ₾
                        </p>
                        <p>
                          <strong>{t("adminOrders.quantity")}:</strong>{" "}
                          {item.qty}
                        </p>

                        {/* Show seller registration details if available */}
                        {productSellerInfo && (
                          <>
                            {/* Display Admin information if the product is created by an Admin */}
                            {productSellerInfo.role === "admin" && (
                              <>
                                <p className="admin-seller-tag">
                                  <strong>
                                    {t("adminOrders.adminProduct")}
                                  </strong>
                                </p>
                                {/* Show admin profile image or fallback */}
                                <div className="seller-profile-image">
                                  {(() => {
                                    const imageUrl =
                                      getSellerImage(productSellerInfo);
                                    if (imageUrl) {
                                      return (
                                        <Image
                                          src={imageUrl}
                                          alt={productSellerInfo.name}
                                          width={80}
                                          height={80}
                                          className="profile-avatar"
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            const fallback =
                                              target.parentElement?.querySelector(
                                                ".avatar-fallback"
                                              ) as HTMLElement;
                                            if (fallback)
                                              fallback.style.display = "flex";
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div
                                    className="avatar-fallback"
                                    style={{
                                      display: getSellerImage(productSellerInfo)
                                        ? "none"
                                        : "flex",
                                    }}
                                  >
                                    <AvatarInitial
                                      name={productSellerInfo.name || "Admin"}
                                      size={80}
                                    />
                                  </div>
                                </div>
                                <p>
                                  <strong>{t("adminOrders.adminName")}:</strong>{" "}
                                  {productSellerInfo.name}
                                </p>
                                <p>
                                  <strong>
                                    {t("adminOrders.adminEmail")}:
                                  </strong>{" "}
                                  {productSellerInfo.email}
                                </p>
                                {productSellerInfo.phoneNumber && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.adminPhone")}:
                                    </strong>{" "}
                                    {productSellerInfo.phoneNumber}
                                  </p>
                                )}
                              </>
                            )}

                            {/* Display Seller information if the product is created by a Seller */}
                            {productSellerInfo.role === "seller" && (
                              <>
                                {/* Show store logo if available, otherwise profile image */}
                                <div className="seller-profile-image">
                                  {(() => {
                                    const imageUrl =
                                      getSellerImage(productSellerInfo);
                                    if (imageUrl) {
                                      return (
                                        <Image
                                          src={imageUrl}
                                          alt={
                                            productSellerInfo.storeName ||
                                            productSellerInfo.name
                                          }
                                          width={80}
                                          height={80}
                                          className={
                                            productSellerInfo.storeLogoPath
                                              ? "store-logo"
                                              : "profile-avatar"
                                          }
                                          onError={(e) => {
                                            const target =
                                              e.target as HTMLImageElement;
                                            target.style.display = "none";
                                            const fallback =
                                              target.parentElement?.querySelector(
                                                ".avatar-fallback"
                                              ) as HTMLElement;
                                            if (fallback)
                                              fallback.style.display = "flex";
                                          }}
                                        />
                                      );
                                    }
                                    return null;
                                  })()}
                                  <div
                                    className="avatar-fallback"
                                    style={{
                                      display: getSellerImage(productSellerInfo)
                                        ? "none"
                                        : "flex",
                                    }}
                                  >
                                    <AvatarInitial
                                      name={
                                        productSellerInfo.storeName ||
                                        productSellerInfo.ownerFirstName ||
                                        productSellerInfo.name ||
                                        "Seller"
                                      }
                                      size={80}
                                    />
                                  </div>
                                </div>
                                {productSellerInfo.storeName && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.storeName")}:
                                    </strong>{" "}
                                    {productSellerInfo.storeName}
                                  </p>
                                )}
                                {productSellerInfo.ownerFirstName && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.ownerName")}:
                                    </strong>{" "}
                                    {`${productSellerInfo.ownerFirstName} ${
                                      productSellerInfo.ownerLastName || ""
                                    }`}
                                  </p>
                                )}
                                {productSellerInfo.email && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.sellerEmail")}:
                                    </strong>{" "}
                                    {productSellerInfo.email}
                                  </p>
                                )}
                                {productSellerInfo.phoneNumber && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.sellerPhone")}:
                                    </strong>{" "}
                                    {productSellerInfo.phoneNumber}
                                  </p>
                                )}
                                {productSellerInfo.identificationNumber && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.identificationNumber")}:
                                    </strong>{" "}
                                    {productSellerInfo.identificationNumber}
                                  </p>
                                )}
                                {productSellerInfo.accountNumber && (
                                  <p>
                                    <strong>
                                      {t("adminOrders.accountNumber")}:
                                    </strong>{" "}
                                    {productSellerInfo.accountNumber}
                                  </p>
                                )}
                              </>
                            )}

                            {/* If role is neither admin nor seller, display available information */}
                            {productSellerInfo.role !== "admin" &&
                              productSellerInfo.role !== "seller" && (
                                <>
                                  <div className="seller-profile-image">
                                    {(() => {
                                      const imageUrl =
                                        getSellerImage(productSellerInfo);
                                      if (imageUrl) {
                                        return (
                                          <Image
                                            src={imageUrl}
                                            alt={productSellerInfo.name}
                                            width={80}
                                            height={80}
                                            className="profile-avatar"
                                            onError={(e) => {
                                              const target =
                                                e.target as HTMLImageElement;
                                              target.style.display = "none";
                                              const fallback =
                                                target.parentElement?.querySelector(
                                                  ".avatar-fallback"
                                                ) as HTMLElement;
                                              if (fallback)
                                                fallback.style.display = "flex";
                                            }}
                                          />
                                        );
                                      }
                                      return null;
                                    })()}
                                    <div
                                      className="avatar-fallback"
                                      style={{
                                        display: getSellerImage(
                                          productSellerInfo
                                        )
                                          ? "none"
                                          : "flex",
                                      }}
                                    >
                                      <AvatarInitial
                                        name={productSellerInfo.name || "User"}
                                        size={80}
                                      />
                                    </div>
                                  </div>
                                  <p>
                                    <strong>
                                      {t("adminOrders.sellerName")}:
                                    </strong>{" "}
                                    {productSellerInfo.name}
                                  </p>
                                  {productSellerInfo.email && (
                                    <p>
                                      <strong>
                                        {t("adminOrders.sellerEmail")}:
                                      </strong>{" "}
                                      {productSellerInfo.email}
                                    </p>
                                  )}
                                  {productSellerInfo.phoneNumber && (
                                    <p>
                                      <strong>
                                        {t("adminOrders.sellerPhone")}:
                                      </strong>{" "}
                                      {productSellerInfo.phoneNumber}
                                    </p>
                                  )}
                                </>
                              )}
                          </>
                        )}

                        {/* Show delivery time if available */}
                        {item.product?.minDeliveryDays &&
                          item.product?.maxDeliveryDays && (
                            <p>
                              <strong>{t("adminOrders.deliveryTime")}:</strong>{" "}
                              {item.product.minDeliveryDays}-
                              {item.product.maxDeliveryDays}{" "}
                              {t("adminOrders.days")}
                            </p>
                          )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {/* Order Items - Now grouped by delivery type with fixed logic */}
          <div className="card">
            <h2>{t("adminOrders.orderItems")}</h2>
            {sellerDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Store size={18} />
                  <h3>აგზავნის ავტორი</h3>
                </div>
                {sellerDeliveryItems.map((item) => (
                  <div
                    key={
                      typeof item.productId === "string"
                        ? item.productId
                        : item.productId._id
                    }
                    className="order-item"
                  >
                    <Image
                      src={getImageSrc(item.image)}
                      alt={getDisplayName(item)}
                      width={80}
                      height={80}
                      className="item-image"
                    />{" "}
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="item-name"
                      >
                        {getDisplayName(item)}
                      </Link>
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("adminOrders.size")}: {item.size}
                            </span>
                          )}
                          <br />
                          {item.color && (
                            <span className="variant-tag">
                              {t("adminOrders.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          <br />
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("adminOrders.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x {item.price.toFixed(2)} ₾ =
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                      {item.product?.minDeliveryDays &&
                        item.product?.maxDeliveryDays && (
                          <p className="delivery-time">
                            {t("adminOrders.deliveryTime")}:{" "}
                            {item.product.minDeliveryDays}-
                            {item.product.maxDeliveryDays}{" "}
                            {t("adminOrders.days")}
                          </p>
                        )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {soulartDeliveryItems.length > 0 && (
              <div className="delivery-group">
                <div className="delivery-group-header">
                  <Truck size={18} />
                  {/* <h3>soulart-ის კურიერი</h3> */}
                </div>{" "}
                {soulartDeliveryItems.map((item) => (
                  <div
                    key={
                      typeof item.productId === "string"
                        ? item.productId
                        : item.productId._id
                    }
                    className="order-item"
                  >
                    <Image
                      src={getImageSrc(item.image)}
                      alt={getDisplayName(item)}
                      width={80}
                      height={80}
                      className="item-image"
                    />
                    <div>
                      <Link
                        href={`/products/${item.productId}`}
                        className="item-name"
                      >
                        {getDisplayName(item)}
                      </Link>
                      {/* Display variant information if available */}
                      {(item.size || item.color || item.ageGroup) && (
                        <div className="variant-info">
                          {item.size && (
                            <span className="variant-tag">
                              {t("adminOrders.size")}: {item.size}
                            </span>
                          )}
                          {item.color && (
                            <span className="variant-tag">
                              {t("adminOrders.color")}:{" "}
                              {getLocalizedColorName(item.color)}
                            </span>
                          )}
                          {item.ageGroup && (
                            <span className="variant-tag">
                              {t("adminOrders.age")}:{" "}
                              {getLocalizedAgeGroupName(item.ageGroup)}
                            </span>
                          )}
                        </div>
                      )}
                      <p>
                        {item.qty} x {item.price.toFixed(2)} ₾ =
                        {(item.qty * item.price).toFixed(2)} ₾
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}{" "}
            {/* If there are no delivery type groups, show items normally */}
            {sellerDeliveryItems.length === 0 &&
              soulartDeliveryItems.length === 0 &&
              order.orderItems.map((item) => (
                <div
                  key={
                    typeof item.productId === "string"
                      ? item.productId
                      : item.productId._id
                  }
                  className="order-item"
                >
                  <Image
                    src={getImageSrc(item.image)}
                    alt={getDisplayName(item)}
                    width={80}
                    height={80}
                    className="item-image"
                  />
                  <div>
                    <Link
                      href={`/products/${item.productId}`}
                      className="item-name"
                    >
                      {getDisplayName(item)}
                    </Link>
                    {/* Display variant information if available */}
                    {(item.size || item.color || item.ageGroup) && (
                      <div className="variant-info">
                        {item.size && (
                          <span className="variant-tag">
                            {t("adminOrders.size")}: {item.size}
                          </span>
                        )}
                        <br />
                        {item.color && (
                          <span className="variant-tag">
                            {t("adminOrders.color")}:{" "}
                            {getLocalizedColorName(item.color)}
                          </span>
                        )}
                        <br />
                        {item.ageGroup && (
                          <span className="variant-tag">
                            {t("adminOrders.age")}:{" "}
                            {getLocalizedAgeGroupName(item.ageGroup)}
                          </span>
                        )}
                      </div>
                    )}
                    <p>
                      {item.qty} x ${item.price.toFixed(2)} = $
                      {(item.qty * item.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="right-section">
          <div className="card">
            <h2>{t("adminOrders.orderSummary")}</h2>
            <div className="summary-item">
              <span>{t("adminOrders.items")}</span>
              <span>₾{order.itemsPrice.toFixed(2)}</span>
            </div>
            <div className="summary-item">
              <span>{t("adminOrders.shipping")}</span>
              <span>
                {order.shippingPrice === 0
                  ? t("cart.free")
                  : `₾${order.shippingPrice.toFixed(2)}`}
              </span>
            </div>
            <div className="summary-item">
              <span>{t("adminOrders.tax")}</span>
              <span>₾{order.taxPrice.toFixed(2)}</span>
            </div>
            <div className="summary-total">
              <span>{t("adminOrders.total")}</span>
              <span>₾{order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
