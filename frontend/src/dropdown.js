import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';

/**
 * Initializes the currency dropdown by fetching currencies and rendering them
 */
export async function initDropdown() {
  try {
    const currencyData = await fetchCurrencies('/currencies.json');
    const currencies = convertObjectToArray(currencyData);
    renderCurrencies(currencies.slice(0, 3)); // Show only first 3 for test
  } catch (error) {
    console.error('Failed to load currencies:', error);
    renderError('Failed to load currencies');
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
 * Renders currency list items in the dropdown root
 * @param {Array} currencies - Array of currency objects
 */
function renderCurrencies(currencies) {
  const dropdownRoot = document.getElementById('dropdown-root');
  if (!dropdownRoot) {
    console.error('Dropdown root element not found');
    return;
  }

  dropdownRoot.innerHTML = '';
  
  if (!currencies || currencies.length === 0) {
    dropdownRoot.innerHTML = '<div class="no-currencies">No currencies available</div>';
    return;
  }

  const list = document.createElement('ul');
  list.className = 'currency-list';

  currencies.forEach(currency => {
    const listItem = document.createElement('li');
    listItem.className = 'currency-item';
    listItem.textContent = `${currency.code} - ${currency.name}`;
    listItem.setAttribute('data-code', currency.code);
    list.appendChild(listItem);
  });

  dropdownRoot.appendChild(list);
}

/**
 * Renders error message
 * @param {string} message - Error message to display
 */
function renderError(message) {
  const dropdownRoot = document.getElementById('dropdown-root');
  if (!dropdownRoot) return;

  dropdownRoot.innerHTML = `<div class="error-message">${message}</div>`;
}

// Initialize dropdown when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDropdown);
} else {
  initDropdown();
}