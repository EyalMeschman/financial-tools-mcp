/**
 * Currency context for managing selected currency state across the application
 */
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Currency } from '../lib/currency';
import { getApiUrl } from '../config';
import { CurrencyContext } from './CurrencyContextTypes';
import type { CurrencyContextType } from './CurrencyContextTypes';

interface CurrencyProviderProps {
  children: ReactNode;
  defaultCurrency?: string;
}

export function CurrencyProvider({ children, defaultCurrency = 'USD' }: CurrencyProviderProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultCurrency);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch currencies directly from the public/currencies.json file
        const response = await fetch(getApiUrl('/currencies.json'));
        
        if (!response.ok) {
          throw new Error(`Failed to fetch currencies: ${response.status}`);
        }
        
        const rawData = await response.json();
        
        // The currencies.json is an object with currency codes as keys
        // Convert to array format
        const currencyArray: Currency[] = Object.entries(rawData)
          .filter(([code]) => code.length === 3) // Only ISO 3-letter codes
          .map(([code, data]) => {
            const currencyData = data as { name: string; symbol?: string; symbolNative?: string };
            return {
              code,
              name: currencyData.name,
              symbol: currencyData.symbol || currencyData.symbolNative || code // Use native symbol, fallback to symbol, then code
            };
          });
        
        setCurrencies(currencyArray);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load currencies');
        console.error('Failed to load currencies:', err);
      } finally {
        setLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  const value: CurrencyContextType = {
    selectedCurrency,
    setSelectedCurrency,
    currencies,
    loading,
    error,
  };

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}