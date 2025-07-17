import { createContext } from 'react';
import type { Currency } from '../lib/currency';

export interface CurrencyContextType {
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  currencies: Currency[];
  loading: boolean;
  error: string | null;
}

export const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);