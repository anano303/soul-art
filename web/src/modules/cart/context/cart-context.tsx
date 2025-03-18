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
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, qty: number) => Promise<void>;
  clearCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "cart_items";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { toast } = useToast();

  const addItem = useCallback(
    async (productId: string, qty: number) => {
      setLoading(true);
      try {
        if (user) {
          const { data } = await apiClient.post("/cart/items", {
            productId,
            qty,
          });
          setItems(data.items);
          toast({
            title: "Item added to cart",
            description: "Your item has been added successfully.",
          });
        } else {
          const response = await apiClient.get(`/products/${productId}`);
          const product = response.data;

          setItems((prevItems) => {
            const existingItem = prevItems.find(
              (item) => item.productId === productId
            );
            if (existingItem) {
              return prevItems.map((item) =>
                item.productId === productId ? { ...item, qty } : item
              );
            } else {
              return [
                ...prevItems,
                { ...product, productId: product._id, qty },
              ];
            }
          });

          toast({
            title: "Item added to cart",
            description: "Your item has been saved locally.",
          });
        }
      } catch (error) {
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

  const updateQuantity = useCallback(
    async (productId: string, qty: number) => {
      setLoading(true);
      try {
        if (user) {
          const { data } = await apiClient.put(`/cart/items/${productId}`, {
            qty,
          });
          setItems(data.items);
        } else {
          setItems((prevItems) =>
            prevItems.map((item) =>
              item.productId === productId ? { ...item, qty } : item
            )
          );
        }
      } catch (error) {
        console.error("Error updating cart item:", error);
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const removeItem = useCallback(
    async (productId: string) => {
      setLoading(true);
      try {
        if (user) {
          const { data } = await apiClient.delete(`/cart/items/${productId}`);
          setItems(data.items);
        } else {
          setItems((prevItems) =>
            prevItems.filter((item) => item.productId !== productId)
          );
        }
        toast({
          title: "Item removed",
          description: "The item has been removed from your cart.",
        });
      } catch (error) {
        console.error("Error removing item from cart:", error);
        toast({
          title: "Error removing item",
          description: "There was a problem removing the item.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [user, toast]
  );

  const clearCart = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        await apiClient.delete("/cart");
      }
      setItems([]);
      toast({
        title: "Cart cleared",
        description: "All items have been removed from your cart.",
      });
    } catch (error) {
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

  const mergeCarts = useCallback(
    async (localItems: CartItem[], serverItems: CartItem[]) => {
      const serverItemsMap = new Map(
        serverItems.map((item) => [item.productId, item])
      );

      for (const localItem of localItems) {
        const serverItem = serverItemsMap.get(localItem.productId);
        if (serverItem) {
          await updateQuantity(
            localItem.productId,
            Math.max(localItem.qty, serverItem.qty)
          );
        } else {
          await addItem(localItem.productId, localItem.qty);
        }
      }
    },
    [updateQuantity, addItem]
  );

  useEffect(() => {
    const loadCart = async () => {
      setLoading(true);
      try {
        if (user) {
          const localCart = localStorage.getItem(CART_STORAGE_KEY);
          const localItems = localCart ? JSON.parse(localCart) : [];

          const { data } = await apiClient.get("/cart");

          if (localItems.length > 0) {
            toast({
              title: "Syncing your cart...",
              description: "We're adding your saved items to your account.",
            });
            await mergeCarts(localItems, data.items);
            toast({
              title: "Cart synced!",
              description: "Your items have been saved to your account.",
            });
            localStorage.removeItem(CART_STORAGE_KEY);
          } else {
            setItems(data.items);
          }
        } else {
          const storedCart = localStorage.getItem(CART_STORAGE_KEY);
          if (storedCart) {
            setItems(JSON.parse(storedCart));
          }
        }
      } catch (error) {
        console.error("Error loading cart:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [user, mergeCarts, toast]);

  useEffect(() => {
    if (!user) {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, user]);

  return (
    <CartContext.Provider
      value={{ items, loading, addItem, removeItem, updateQuantity, clearCart }}
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
