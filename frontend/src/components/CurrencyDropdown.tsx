/**
 * Currency dropdown component that matches the PNG design exactly
 * - Button showing selected currency
 * - Click opens dropdown with search input + scrollable list
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { useCurrencies } from '../hooks/useCurrencies';
import { useDebounce } from '../hooks/useDebounce';

interface CurrencyDropdownProps {
  value?: string;
  onChange?: (currency: string) => void;
  className?: string;
}

export function CurrencyDropdown({ value, onChange, className = '' }: CurrencyDropdownProps) {
  const { currencies, loading, error, selectedCurrency, setSelectedCurrency } = useCurrencies();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 200);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Use controlled value if provided, otherwise use context value
  const currentValue = value ?? selectedCurrency;
  
  // Find the selected currency data
  const selectedCurrencyData = currencies.find(c => c.code === currentValue);

  // Filter currencies based on search query
  const filteredCurrencies = useMemo(() => {
    if (!debouncedQuery) return currencies;
    
    const lowerQuery = debouncedQuery.toLowerCase();
    return currencies.filter(currency => 
      currency.code.toLowerCase().includes(lowerQuery) ||
      currency.name.toLowerCase().includes(lowerQuery)
    );
  }, [currencies, debouncedQuery]);

  // Handle selection
  const handleSelect = (currencyCode: string) => {
    if (onChange) {
      onChange(currencyCode);
    } else {
      setSelectedCurrency(currencyCode);
    }
    setIsOpen(false);
    setSearchQuery('');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className={`relative w-80 ${className}`}>
        <button className="w-full px-3 py-2 text-left bg-gray-100 border border-gray-300 rounded-md cursor-not-allowed">
          Loading currencies...
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative w-80 ${className}`}>
        <button className="w-full px-3 py-2 text-left bg-red-50 border border-red-300 rounded-md cursor-not-allowed text-red-600">
          Error: {error}
        </button>
      </div>
    );
  }

  return (
    <div className={`relative w-80 ${className}`} ref={dropdownRef} data-testid="currency-dropdown">
      {/* Main Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2.5 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
      >
        <span className="truncate text-sm font-medium">
          {selectedCurrencyData 
            ? `${selectedCurrencyData.code} - ${selectedCurrencyData.name}`
            : currentValue || 'Select currency...'}
        </span>
        <ChevronUpDownIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-80 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search currencies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              autoFocus
            />
          </div>

          {/* Currency List - Small fixed height showing only ~4-5 items */}
          <div className="h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredCurrencies.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No currencies found.
              </div>
            ) : (
              filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleSelect(currency.code)}
                  className={`w-full px-3 py-2.5 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${
                    currency.code === currentValue ? 'bg-blue-50 text-blue-900' : 'text-gray-900'
                  }`}
                  data-testid={`currency-option-${currency.code}`}
                >
                  <span className="text-sm font-medium">
                    {currency.code} - {currency.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CurrencyDropdown;