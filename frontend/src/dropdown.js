import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';
import { filterCurrencies } from './currency-utils.js';
import Choices from 'choices.js';

let allCurrencies = [];
let choicesInstance = null;

/**
 * Initializes the currency dropdown by fetching currencies and rendering them
 */
export async function initDropdown() {
  try {
    const currencyData = await fetchCurrencies('/currencies.json');
    allCurrencies = convertObjectToArray(currencyData);
    
    // Initialize Choices.js
    const selectElement = document.getElementById('currency-picker');
    if (!selectElement) {
      console.error('Currency picker element not found');
      return;
    }

    choicesInstance = new Choices(selectElement, {
      searchEnabled: true,
      searchChoices: true,
      searchPlaceholderValue: 'Search currencies...',
      itemSelectText: '',
      shouldSort: false,
      position: 'bottom',
      fuseOptions: {
        threshold: 0.3,
        keys: ['label', 'value']
      }
    });

    // Populate with currencies
    populateChoices();
    
    // Set up event listeners
    setupEventListeners();
  } catch (error) {
    console.error('Failed to load currencies:', error);
  }
}

function convertObjectToArray(currencyObject) {
  if (Array.isArray(currencyObject)) {
    return currencyObject;
  }
  
  return Object.entries(currencyObject).map(([code, data]) => ({
    code,
    name: data.name
  }));
}

/**
 * Populates the Choices.js instance with currency data
 */
function populateChoices() {
  if (!choicesInstance) return;

  const choices = allCurrencies.map(currency => ({
    value: currency.code,
    label: `${currency.code} - ${currency.name}`,
    selected: false
  }));

  choicesInstance.setChoices(choices, 'value', 'label', false);
}

/**
 * Sets up event listeners for the Choices instance
 */
function setupEventListeners() {
  if (!choicesInstance) return;

  const selectElement = document.getElementById('currency-picker');
  
  selectElement.addEventListener('change', (event) => {
    const selectedValue = event.target.value;
    const selectedCurrency = allCurrencies.find(c => c.code === selectedValue);
    
    if (selectedCurrency) {
      // Set value of hidden select element
      selectElement.value = selectedValue;
      
      // Dispatch custom currency:change event with code detail
      const currencyChangeEvent = new CustomEvent('currency:change', {
        detail: { code: selectedValue }
      });
      document.dispatchEvent(currencyChangeEvent);
      
      // Also dispatch legacy event for compatibility with existing code
      const legacyEvent = new CustomEvent('currencySelected', {
        detail: { currency: selectedCurrency }
      });
      document.dispatchEvent(legacyEvent);
    }
  });
}

// Initialize dropdown when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDropdown);
} else {
  initDropdown();
}