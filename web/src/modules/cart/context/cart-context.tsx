"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CartItem } from "@/types/cart";
import { apiClient } from "@/lib/axios";
import { useUser } from "@/modules/auth/hooks/use-user";
import { useToast } from "@/hooks/use-toast";

interface CartContextType {
  items: CartItem[];
  loading: boolean;
  addItem: (productId: string, qty: number) => Promise<void>;
  removeItem: (
    productId: string,
    size?: string,
    color?: string,
    ageGroup?: string
  ) => Promise<void>;
  updateQuantity: (
    productId: string,
    qty: number,
    size?: string,
    color?: string,
    ageGroup?: string
  ) => Promise<void>;
  clearCart: () => Promise<void>;
  addToCart: (
    productId: string,
    quantity?: number,
    size?: string,
    color?: string,
    ageGroup?: string,
    price?: number
  ) => Promise<void>;
  totalItems: number;
  getItemQuantity: (
    productId: string,
    size?: string,
    color?: string,
    ageGroup?: string
  ) => number;
  isItemInCart: (
    productId: string,
    size?: string,
    color?: string,
    ageGroup?: string
  ) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const totalItems = items.reduce((total, item) => total + item.qty, 0);

  // ფუნქცია რომ შევამოწმოთ არის თუ არა პროდუქტი კალათაში
  const isItemInCart = useCallback(
    (
      productId: string,
      size?: string,
      color?: string,
      ageGroup?: string
    ): boolean => {
      return items.some(
        (item) =>
          item.productId === productId &&
          (item.size || "") === (size || "") &&
          (item.color || "") === (color || "") &&
          (item.ageGroup || "") === (ageGroup || "")
      );
    },
    [items]
  );

  // ფუნქცია რაოდენობის მისაღებად
  const getItemQuantity = useCallback(
    (
      productId: string,
      size?: string,
      color?: string,
      ageGroup?: string
    ): number => {
      const item = items.find(
        (item) =>
          item.productId === productId &&
          (item.size || "") === (size || "") &&
          (item.color || "") === (color || "") &&
          (item.ageGroup || "") === (ageGroup || "")
      );
      return item ? item.qty : 0;
    },
    [items]
  );

  const addItem = useCallback(
    async (productId: string, qty: number) => {
      // თუ მომხმარებელი არაა ავტორიზებული, გადავიყვანოთ ლოგინ გვერდზე
      if (!user) {
        console.log("User not authenticated, redirecting to login");
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname);
        // Promise რომ არ გაგრძელდეს
        throw new Error("User not authenticated");
      }

      setLoading(true);
      try {
        const { data } = await apiClient.post("/cart/items", {
          productId,
          qty,
        });
        setItems(data.items);

        // მხოლოდ წარმატებული ოპერაციის შემდეგ ვაჩვენოთ toast
        toast({
          title: "პროდუქტი დაემატა",
          description: "პროდუქტი წარმატებით დაემატა კალათაში",
        });
      } catch (error) {
        // თუ 401 შეცდომაა (არაავტორიზებული), გადავიყვანოთ ლოგინზე
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          console.log("Authentication error (401), redirecting to login");
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }

        toast({
          title: "Error adding item",
          description: "There was a problem adding your item.",
          variant: "destructive",
        });
        console.error("Error adding item to cart:", error);
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const addToCart = useCallback(
    async (
      productId: string,
      quantity = 1,
      size = "",
      color = "",
      ageGroup = "",
      price?: number
    ) => {
      // Support guest checkout - use localStorage if not authenticated
      if (!user) {
        console.log("Guest user - adding to localStorage cart");
        setLoading(true);
        try {
          const existingCart = localStorage.getItem("guest_cart");
          const guestItems: CartItem[] = existingCart ? JSON.parse(existingCart) : [];
          
          // Find if item already exists
          const existingItemIndex = guestItems.findIndex(
            (item) =>
              item.productId === productId &&
              (item.size || "") === (size || "") &&
              (item.color || "") === (color || "") &&
              (item.ageGroup || "") === (ageGroup || "")
          );

          if (existingItemIndex > -1) {
            // Update quantity
            guestItems[existingItemIndex].qty += quantity;
          } else {
            // Add new item - we'll need to fetch product details
            try {
              const response = await apiClient.get(`/products/${productId}`);
              const product = response.data;
              guestItems.push({
                productId,
                name: product.name,
                nameEn: product.nameEn,
                image: product.images?.[0] || "",
                price: price || product.price,
                qty: quantity,
                size,
                color,
                ageGroup,
                countInStock: product.countInStock || 0,
              });
            } catch (error) {
              console.error("Error fetching product details:", error);
              throw error;
            }
          }

          localStorage.setItem("guest_cart", JSON.stringify(guestItems));
          setItems(guestItems);

          toast({
            title: "პროდუქტი დაემატა",
            description: "პროდუქტი წარმატებით დაემატა კალათაში",
          });
        } catch (error) {
          toast({
            title: "Error adding item",
            description: "There was a problem adding your item.",
            variant: "destructive",
          });
          console.error("Error adding item to guest cart:", error);
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const requestData: {
          productId: string;
          qty: number;
          size: string;
          color: string;
          ageGroup: string;
          price?: number;
        } = {
          productId,
          qty: quantity,
          size,
          color,
          ageGroup,
        };

        // Add price if provided (discounted price)
        if (price !== undefined) {
          requestData.price = price;
        }

        const { data } = await apiClient.post("/cart/items", requestData);
        setItems(data.items);

        // მხოლოდ წარმატებული ოპერაციის შემდეგ ვაჩვენოთ toast
        toast({
          title: "პროდუქტი დაემატა",
          description: "პროდუქტი წარმატებით დაემატა კალათაში",
        });
      } catch (error) {
        // თუ 401 შეცდომაა (არაავტორიზებული), გადავიყვანოთ ლოგინზე
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          console.log("Authentication error (401), redirecting to login");
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }

        toast({
          title: "Error",
          description: "პროდუქტის დამატება ვერ მოხერხდა",
          variant: "destructive",
        });
        console.error("Error adding item to cart:", error);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const updateQuantity = useCallback(
    async (
      productId: string,
      qty: number,
      size?: string,
      color?: string,
      ageGroup?: string
    ) => {
      // Support guest cart
      if (!user) {
        setLoading(true);
        try {
          const existingCart = localStorage.getItem("guest_cart");
          const guestItems: CartItem[] = existingCart ? JSON.parse(existingCart) : [];
          
          const itemIndex = guestItems.findIndex(
            (item) =>
              item.productId === productId &&
              (item.size || "") === (size || "") &&
              (item.color || "") === (color || "") &&
              (item.ageGroup || "") === (ageGroup || "")
          );

          if (itemIndex > -1) {
            if (qty <= 0) {
              guestItems.splice(itemIndex, 1);
            } else {
              guestItems[itemIndex].qty = qty;
            }
            localStorage.setItem("guest_cart", JSON.stringify(guestItems));
            setItems(guestItems);
          }
        } catch (error) {
          console.error("Error updating guest cart quantity:", error);
          toast({
            title: "Error",
            description: "There was a problem updating your item quantity.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        const { data } = await apiClient.put(`/cart/items/${productId}`, {
          qty,
          size,
          color,
          ageGroup,
        });
        setItems(data.items);
      } catch (error) {
        // თუ 401 შეცდომაა (არაავტორიზებული), გადავიყვანოთ ლოგინზე
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          console.log("Authentication error (401), redirecting to login");
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }

        console.error("Error updating item quantity:", error);
        toast({
          title: "Error",
          description: "There was a problem updating your item quantity.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const removeItem = useCallback(
    async (
      productId: string,
      size?: string,
      color?: string,
      ageGroup?: string
    ) => {
      // Support guest cart
      if (!user) {
        setLoading(true);
        try {
          const existingCart = localStorage.getItem("guest_cart");
          const guestItems: CartItem[] = existingCart ? JSON.parse(existingCart) : [];
          
          const filteredItems = guestItems.filter(
            (item) =>
              !(
                item.productId === productId &&
                (item.size || "") === (size || "") &&
                (item.color || "") === (color || "") &&
                (item.ageGroup || "") === (ageGroup || "")
              )
          );

          localStorage.setItem("guest_cart", JSON.stringify(filteredItems));
          setItems(filteredItems);
          
          toast({
            title: "პროდუქტი წაშალდა",
            description: "პროდუქტი წარმატებით წაშალდა კალათიდან",
          });
        } catch (error) {
          console.error("Error removing item from guest cart:", error);
          toast({
            title: "Error",
            description: "There was a problem removing your item from the cart.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
        return;
      }

      // თუ მომხმარებელი არაა ავტორიზებული, გადავიყვანოთ ლოგინ გვერდზე
      if (!user) {
        console.log("User not authenticated, redirecting to login");
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return;
      }

      setLoading(true);
      try {
        const { data } = await apiClient.delete(`/cart/items/${productId}`, {
          data: { size, color, ageGroup },
        });
        setItems(data.items);
      } catch (error) {
        // თუ 401 შეცდომაა (არაავტორიზებული), გადავიყვანოთ ლოგინზე
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          console.log("Authentication error (401), redirecting to login");
          window.location.href =
            "/login?redirect=" + encodeURIComponent(window.location.pathname);
          return;
        }

        console.error("Error removing item from cart:", error);
        toast({
          title: "Error",
          description: "There was a problem removing your item from the cart.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const clearCart = useCallback(async () => {
    // Support guest cart
    if (!user) {
      localStorage.removeItem("guest_cart");
      setItems([]);
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      });
      return;
    }

    setLoading(true);
    try {
      await apiClient.delete("/cart");
      setItems([]);
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      });
    } catch (error) {
      // თუ 401 შეცდომაა (არაავტორიზებული), გადავიყვანოთ ლოგინზე
      if (
        (error as { response?: { status?: number } })?.response?.status === 401
      ) {
        console.log("Authentication error (401), redirecting to login");
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname);
        return;
      }

      console.error("Error clearing cart:", error);
      toast({
        title: "Error clearing cart",
        description: "There was a problem clearing your cart.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (user) {
          // Load authenticated user cart from server
          const { data } = await apiClient.get("/cart");
          const serverItems: CartItem[] = data.items || [];
          setItems(serverItems);
          
          // Sync guest cart if exists
          const guestCart = localStorage.getItem("guest_cart");
          if (guestCart) {
            const guestItems: CartItem[] = JSON.parse(guestCart);
            if (guestItems.length > 0) {
              // Merge guest cart items - add quantities for existing items
              for (const guestItem of guestItems) {
                try {
                  // Find if this item exists in server cart
                  const existingItem = serverItems.find(
                    (serverItem) =>
                      serverItem.productId === guestItem.productId &&
                      (serverItem.size || "") === (guestItem.size || "") &&
                      (serverItem.color || "") === (guestItem.color || "") &&
                      (serverItem.ageGroup || "") === (guestItem.ageGroup || "")
                  );
                  
                  // Calculate new quantity (add guest qty to existing or use guest qty)
                  const newQty = existingItem 
                    ? existingItem.qty + guestItem.qty 
                    : guestItem.qty;
                  
                  await apiClient.post("/cart/items", {
                    productId: guestItem.productId,
                    qty: newQty,
                    size: guestItem.size || "",
                    color: guestItem.color || "",
                    ageGroup: guestItem.ageGroup || "",
                    price: guestItem.price,
                  });
                } catch (error) {
                  console.error("Error syncing guest cart item:", error);
                }
              }
              // Reload cart after sync
              const { data: updatedData } = await apiClient.get("/cart");
              setItems(updatedData.items || []);
              // Clear guest cart
              localStorage.removeItem("guest_cart");
            }
          }
        } else {
          // Load guest cart from localStorage
          const guestCart = localStorage.getItem("guest_cart");
          if (guestCart) {
            setItems(JSON.parse(guestCart));
          } else {
            setItems([]);
          }
        }
      } catch (error) {
        console.error("Error loading cart:", error);
        // თუ 401 შეცდომაა, კალათა გავასუფთავოთ
        if (
          (error as { response?: { status?: number } })?.response?.status ===
          401
        ) {
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user, toast]);

  return (
    <CartContext.Provider
      value={{
        items,
        loading,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        addToCart,
        totalItems,
        getItemQuantity,
        isItemInCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
