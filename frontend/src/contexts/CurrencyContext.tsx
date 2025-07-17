/**
 * Currency context for managing selected currency state across the application
 */
import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { fetchCurrencies } from '../lib/currency';
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
        
        const currencyData = await fetchCurrencies(getApiUrl('/currencies.json'));
        
        // Convert to expected format with symbol from raw data
        const currencyArray: Currency[] = currencyData
          .filter((currency) => currency.code?.length === 3) // Only ISO 3-letter codes
          .map((currency) => ({
            code: currency.code,
            name: currency.name,
            symbol: currency.code // Use code as symbol since fetchCurrencies doesn't return symbol
          }));
        
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