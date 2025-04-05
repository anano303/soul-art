'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { isAuthenticated } from '@/lib/api-client';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { OrderHistory } from '@/modules/profile/components/order-history';
import './orders.css';
import { Order } from '@/types/order';


function ProfileOrdersContent() {
  // Use state to store orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // This useEffect will only run in the browser after hydration
  useEffect(() => {
    const checkAuthAndFetchOrders = async () => {
      // Check if the user is authenticated
      if (!isAuthenticated()) {
        router.push('/login?redirect=/profile/orders');
        return;
      }

      try {
        // Fetch orders
        const response = await fetchWithAuth('/orders/myorders');
        const data = await response.json();
        setOrders(data);
      } catch (err) {
        console.error('Error fetching orders:', err);
        setError('Failed to load orders. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    checkAuthAndFetchOrders();
  }, [router]);

  // Handle loading state
  if (loading) {
    return (
      <div className="orders-container">
        <h1 className="orders-title">ჩემი შეკვეთები</h1>
        <div className="loading-indicator">იტვირთება...</div>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="orders-container">
        <h1 className="orders-title">ჩემი შეკვეთები</h1>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  // No orders found
  if (orders.length === 0) {
    return (
      <div className="orders-container">
        <h1 className="orders-title">ჩემი შეკვეთები</h1>
        <div className="no-orders">
          <p>თქვენ ჯერ არ გაქვთ შეკვეთები</p>
          <Link href="/shop" className="shop-now-button">
            ნახე პროდუქტები
          </Link>
        </div>
      </div>
    );
  }

  // Render orders using the OrderHistory component
  return (
    <div className="orders-container">
      <h1 className="orders-title">ჩემი შეკვეთები</h1>
      <OrderHistory orders={orders} />
    </div>
  );
}

// Dynamically import the content component with SSR disabled
const OrdersContentWithNoSSR = dynamic(() => Promise.resolve(ProfileOrdersContent), {
  ssr: false,
});

// Export a simple wrapper that uses the dynamic component
export default function ProfileOrdersPage() {
  return <OrdersContentWithNoSSR />;
}
