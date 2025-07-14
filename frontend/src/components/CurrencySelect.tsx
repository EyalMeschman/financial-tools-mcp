import { useEffect, useState } from 'react';
import { Listbox } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CurrencySelectProps {
  selectedCurrency: string;
  onCurrencyChange: (currency: string) => void;
}

export default function CurrencySelect({ selectedCurrency, onCurrencyChange }: CurrencySelectProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        const response = await fetch('/currencies.json');
        const currencyData = await response.json();
        
        // Convert currency data to array and filter out non-standard currencies
        const currencyArray = Object.entries(currencyData as Record<string, { name: string; symbol: string }>)
          .filter(([code]) => code.length === 3) // Only ISO 3-letter codes
          .map(([code, data]) => ({
            code,
            name: data.name,
            symbol: data.symbol
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
        
        setCurrencies(currencyArray);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load currencies:', error);
        setLoading(false);
      }
    };

    loadCurrencies();
  }, []);

  const selectedCurrencyData = currencies.find(c => c.code === selectedCurrency);

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
      <Listbox value={selectedCurrency} onChange={onCurrencyChange}>
        <div className="relative">
          <Listbox.Button className="relative w-full cursor-default rounded-lg bg-white py-2 pl-3 pr-10 text-left shadow-md focus:outline-none focus-visible:border-indigo-500 focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-orange-300 sm:text-sm">
            <span className="block truncate" data-testid="selected-currency-display">
              {selectedCurrencyData 
                ? `${selectedCurrencyData.code} - ${selectedCurrencyData.name}`
                : selectedCurrency
              }
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </Listbox.Button>
          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm">
            {currencies.map((currency) => (
              <Listbox.Option
                key={currency.code}
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-amber-100 text-amber-900' : 'text-gray-900'
                  }`
                }
                value={currency.code}
                data-testid={`currency-option-${currency.code}`}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {currency.code} - {currency.name}
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-amber-600">
                        <CheckIcon className="h-5 w-5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </div>
      </Listbox>
    </div>
  );
}