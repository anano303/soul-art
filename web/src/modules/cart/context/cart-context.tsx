"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { CartItem } from "@/types/cart";
import { apiClient } from "@/lib/api-client";
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
      // თუ მომხმარებელი არაა ავტორიზებული, გადავიყვანოთ ლოგინ გვერდზე
      if (!user) {
        console.log("User not authenticated, redirecting to login");
        window.location.href =
          "/login?redirect=" + encodeURIComponent(window.location.pathname);
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
    // თუ მომხმარებელი არაა ავტორიზებული, გადავიყვანოთ ლოგინ გვერდზე
    if (!user) {
      console.log("User not authenticated, redirecting to login");
      window.location.href =
        "/login?redirect=" + encodeURIComponent(window.location.pathname);
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
          // მხოლოდ ავტორიზებული მომხმარებლებისთვის ვტვირთავთ კალათას
          const { data } = await apiClient.get("/cart");
          setItems(data.items || []);
        } else {
          // არაავტორიზებული მომხმარებლებისთვის კალათა ცარიელი უნდა იყოს
          setItems([]);
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
