import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient, isAuthenticated } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { CartItem } from '@/types/cart';
import { AxiosError } from 'axios';

// Define types for better type safety
// type CartItem = {
//   productId: string;
//   quantity: number;
//   product: any; // Replace with your actual Product type
//   _id?: string;
// };

type CartContextType = {
  cartItems: CartItem[];
  isLoading: boolean;
  error: string | null;
  addToCart: (productId: string, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  loadCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isLoggedIn } = useAuth();

  const loadCart = React.useCallback(async () => {
    // Skip loading if user is not authenticated
    if (!isAuthenticated() || !isLoggedIn) {
      console.log('User not authenticated, skipping cart load');
      setCartItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading cart data...');
      const response = await apiClient.get('/cart');
      
      if (response.data && Array.isArray(response.data.items)) {
        console.log('Cart loaded successfully:', response.data.items);
        setCartItems(response.data.items);
      } else {
        console.log('Cart API returned no items or invalid format:', response.data);
        setCartItems([]);
      }
    } catch (error) {
      console.error("Error loading cart:", error);
      
      // If 401, don't show error - just clear cart
      if ((error as AxiosError)?.response?.status === 401) {
        console.log('Authentication error (401) when loading cart, clearing items');
        setCartItems([]);
      } else {
        setError("Failed to load cart. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn]);

  const addToCart = async (productId: string, quantity = 1) => {
    // Check if user is logged in before proceeding
    if (!isAuthenticated() || !isLoggedIn) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Adding product ${productId} to cart, quantity: ${quantity}`);
      const response = await apiClient.post('/cart', { productId, quantity });
      
      if (response.data && Array.isArray(response.data.items)) {
        console.log('Product added to cart successfully');
        setCartItems(response.data.items);
      } else {
        console.log('Cart API returned invalid format after adding item:', response.data);
        // Reload cart to get fresh data
        await loadCart();
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      
      if ((error as AxiosError)?.response?.status === 401) {
        console.log('Authentication error (401) when adding to cart, redirecting to login');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      } else {
        setError("Failed to add item to cart. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    // Check if user is logged in before proceeding
    if (!isAuthenticated() || !isLoggedIn) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Updating quantity for product ${productId} to ${quantity}`);
      const response = await apiClient.put(`/cart/${productId}`, { quantity });
      
      if (response.data && Array.isArray(response.data.items)) {
        console.log('Cart quantity updated successfully');
        setCartItems(response.data.items);
      } else {
        console.log('Cart API returned invalid format after updating quantity:', response.data);
        // Reload cart to get fresh data
        await loadCart();
      }
    } catch (error) {
      console.error("Error updating cart item quantity:", error);
      
      if ((error as AxiosError)?.response?.status === 401) {
        console.log('Authentication error (401) when updating quantity, redirecting to login');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      } else {
        setError("Failed to update item quantity. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (productId: string) => {
    // Check if user is logged in before proceeding
    if (!isAuthenticated() || !isLoggedIn) {
      console.log('User not authenticated, redirecting to login');
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Removing product ${productId} from cart`);
      const response = await apiClient.delete(`/cart/${productId}`);
      
      if (response.data && Array.isArray(response.data.items)) {
        console.log('Item removed from cart successfully');
        setCartItems(response.data.items);
      } else {
        console.log('Cart API returned invalid format after removing item:', response.data);
        // Reload cart to get fresh data
        await loadCart();
      }
    } catch (error) {
      console.error("Error removing item from cart:", error);
      
      if ((error as AxiosError)?.response?.status === 401) {
        console.log('Authentication error (401) when removing from cart, redirecting to login');
        window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      } else {
        setError("Failed to remove item from cart. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Load cart when user auth state changes
  useEffect(() => {
    if (isLoggedIn) {
      console.log('User is logged in, loading cart data');
      loadCart();
    } else {
      console.log('User is not logged in, clearing cart data');
      setCartItems([]);
    }
  }, [isLoggedIn, user?.id, loadCart]); // Added loadCart to dependencies

  return (
    <CartContext.Provider
      value={{
        cartItems,
        isLoading,
        error,
        addToCart,
        updateQuantity,
        removeFromCart,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};