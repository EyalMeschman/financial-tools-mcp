import { useContext } from 'react';
import { CurrencyContext } from '../contexts/CurrencyContextTypes';

export function useCurrencies() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrencies must be used within a CurrencyProvider');
  }
  return context;
}