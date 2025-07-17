/**
 * Modern currency dropdown component using Headless UI
 * This is the new implementation that will replace the legacy CurrencySelect
 */
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { FixedSizeList as List } from 'react-window';
import { useCurrencies } from '../hooks/useCurrencies';
import { useDebounce } from '../hooks/useDebounce';
import type { Currency } from '../lib/currency';

interface CurrencyDropdownProps {
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
}

// Component for rendering individual currency items in the virtual list
interface CurrencyItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    currencies: Currency[];
    selectedCurrency: string;
    onSelect: (currency: string) => void;
  };
}

function CurrencyItem({ index, style, data }: CurrencyItemProps) {
  const { currencies } = data;
  const currency = currencies[index];
  
  if (!currency) return null;
  
  return (
    <div style={style}>
      <ComboboxOption
        key={currency.code}
        className="data-[focus]:bg-blue-50 data-[focus]:text-blue-900 relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900 hover:bg-gray-50"
        value={currency.code}
        data-testid={`currency-option-${currency.code}`}
      >
        <span className="data-[selected]:font-medium block truncate font-normal">
          {currency.code} - {currency.name}
        </span>
        <span className="data-[selected]:flex absolute inset-y-0 left-0 hidden items-center pl-3 text-blue-600">
          <CheckIcon className="h-5 w-5" aria-hidden="true" />
        </span>
      </ComboboxOption>
    </div>
  );
}

export function CurrencyDropdown({ value, onChange, className = '' }: CurrencyDropdownProps) {
  const { currencies, loading, error, selectedCurrency, setSelectedCurrency } = useCurrencies();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);
  const listRef = useRef<List>(null);

  // Use controlled value if provided, otherwise use context value
  const currentValue = value ?? selectedCurrency;
  const handleChange = (newValue: string) => {
    if (onChange) {
      onChange(newValue);
    } else {
      setSelectedCurrency(newValue);
    }
    setQuery(''); // Reset search query when selection is made
  };

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    if (!debouncedQuery) return currencies;
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return currencies.filter(currency => 
      currency.code.toLowerCase().includes(lowerQuery) ||
      currency.name.toLowerCase().includes(lowerQuery)
    );
  }, [currencies, debouncedQuery]);

  // Calculate the index of the selected currency for scrolling
  const selectedIndex = useMemo(() => {
    return filteredCurrencies.findIndex(currency => currency.code === currentValue);
  }, [filteredCurrencies, currentValue]);

  // Scroll to selected item when dropdown opens
  useEffect(() => {
    if (listRef.current && selectedIndex >= 0) {
      listRef.current.scrollToItem(selectedIndex, 'center');
    }
  }, [selectedIndex]);

  // Virtual list configuration
  const ITEM_HEIGHT = 36; // Height of each item in pixels (py-2 = 8px top + 8px bottom + text height)
  const LIST_HEIGHT = 288; // h-72 = 288px

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
          <span className="block truncate text-gray-400">Loading currencies...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="relative w-full cursor-default rounded-lg bg-red-50 py-2 pl-3 pr-10 text-left shadow-md focus:outline-none sm:text-sm">
          <span className="block truncate text-red-600">Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative w-80 ${className}`} data-testid="currency-dropdown">
      <Combobox value={currentValue} onChange={handleChange}>
        <div className="relative">
          <ComboboxInput
            className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
            displayValue={(currency: string) => {
              // Show search query when user is typing, otherwise show selected currency
              if (query) return query;
              const currencyData = currencies.find(c => c.code === currency);
              return currencyData ? `${currencyData.code} - ${currencyData.name}` : currency;
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search currencies..."
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ComboboxButton>
          <ComboboxOptions className="absolute z-10 mt-1 w-80 h-72 overflow-hidden rounded-md bg-white text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {filteredCurrencies.length === 0 ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                No currencies found.
              </div>
            ) : (
              <List
                ref={listRef}
                height={LIST_HEIGHT}
                width="100%"
                itemCount={filteredCurrencies.length}
                itemSize={ITEM_HEIGHT}
                itemData={{
                  currencies: filteredCurrencies,
                  selectedCurrency: currentValue,
                  onSelect: handleChange,
                }}
                className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
              >
                {CurrencyItem}
              </List>
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}

export default CurrencyDropdown;