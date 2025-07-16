import { useEffect, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { fetchCurrencies } from '../utils/fetchCurrencies';
import { filterCurrencies, sortCurrencies } from '../utils/currency-utils';

interface Currency {
  code: string;
  name: string;
  symbol?: string;
}

interface CurrencySelectProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export default function CurrencySelect({ selectedCurrency, onCurrencyChange }: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [filteredCurrencies, setFilteredCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const currencyData = await fetchCurrencies('/currencies.json');
        
        // Convert to expected format with symbol from raw data
        const currencyArray: Currency[] = currencyData
          .filter((currency: any) => currency.code?.length === 3) // Only ISO 3-letter codes
          .map((currency: any) => ({
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol || currency.code
          }));
        
        const sortedCurrencies = sortCurrencies(currencyArray);
        setCurrencies(sortedCurrencies);
        setFilteredCurrencies(sortedCurrencies);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load currencies:', error);
        setLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  // Filter currencies based on search query
  useEffect(() => {
    const filtered = filterCurrencies(currencies, query);
    setFilteredCurrencies(filtered);
  }, [currencies, query]);


  if (loading) {
    return (
      <div className="w-48">
        <div className="relative">
          <div className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <span className="block truncate text-gray-400">Loading currencies...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-48" data-testid="currency-select">
      <Combobox value={selectedCurrency} onChange={onCurrencyChange}>
        <div className="relative">
          <ComboboxInput
            className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm"
            displayValue={(currency: string) => {
              const currencyData = currencies.find(c => c.code === currency);
              return currencyData ? `${currencyData.code} - ${currencyData.name}` : currency;
            }}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search currencies..."
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
          </ComboboxButton>
          <ComboboxOptions className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {filteredCurrencies.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                No currencies found.
              </div>
            ) : (
              filteredCurrencies.map((currency) => (
                <ComboboxOption
                  key={currency.code}
                  className="data-[focus]:bg-amber-100 data-[focus]:text-amber-900 relative cursor-default select-none py-2 pl-10 pr-4 text-gray-900"
                  value={currency.code}
                  data-testid={`currency-option-${currency.code}`}
                >
                  <span className="data-[selected]:font-medium block truncate font-normal">
                    {currency.code} - {currency.name}
                  </span>
                  <span className="data-[selected]:flex absolute inset-y-0 left-0 hidden items-center pl-3 text-amber-600">
                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
    </div>
  );
}