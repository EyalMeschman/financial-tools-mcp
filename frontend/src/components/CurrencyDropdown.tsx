/**
 * Currency dropdown component that matches the PNG design exactly
 * - Button showing selected currency
 * - Click opens dropdown with search input + scrollable list
 */
import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronUpDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/20/solid';
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
        className="w-full px-3 py-2 text-left bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between"
      >
        <span className="truncate">
          {selectedCurrencyData 
            ? `${selectedCurrencyData.code} - ${selectedCurrencyData.name}`
            : currentValue || 'Select currency...'}
        </span>
        <ChevronUpDownIcon className="h-5 w-5 text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-80 bg-white border border-gray-200 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search currencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
            </div>
          </div>

          {/* Currency List */}
          <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            {filteredCurrencies.length === 0 ? (
              <div className="px-3 py-2 text-gray-500 text-center">
                No currencies found.
              </div>
            ) : (
              filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onClick={() => handleSelect(currency.code)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between ${
                    currency.code === currentValue ? 'bg-blue-50 text-blue-900' : ''
                  }`}
                  data-testid={`currency-option-${currency.code}`}
                >
                  <span className="font-medium">
                    {currency.code} - {currency.name}
                  </span>
                  {currency.code === currentValue && (
                    <CheckIcon className="h-4 w-4 text-blue-600" />
                  )}
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