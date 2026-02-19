import { useState, useEffect } from 'react';
import { fetchShippingRates, ShippingRate } from './shipping';

export function useShippingRates() {
  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedRates = await fetchShippingRates();
      setRates(fetchedRates);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { rates, loading, error, refresh: loadRates };
}
