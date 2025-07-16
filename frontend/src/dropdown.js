import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';
import { filterCurrencies } from './currency-utils.js';

let allCurrencies = [];
let currentQuery = '';

/**
 * Initializes the currency dropdown by fetching currencies and rendering them
 */
export async function initDropdown() {
  try {
    const currencyData = await fetchCurrencies('/currencies.json');
    allCurrencies = convertObjectToArray(currencyData);
    renderCurrencies(allCurrencies.slice(0, 3)); // Show first 3 initially
    setupSearchListener();
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
 * Sets up the search input listener
 */
function setupSearchListener() {
  const searchInput = document.getElementById('currency-search');
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }

  searchInput.addEventListener('input', (event) => {
    currentQuery = event.target.value;
    performSearch();
  });
}

/**
 * Performs search and re-renders results
 */
function performSearch() {
  let filteredCurrencies;
  
  if (currentQuery.trim() === '') {
    // Show first 3 when no search query
    filteredCurrencies = allCurrencies.slice(0, 3);
  } else {
    // Filter currencies based on search query
    filteredCurrencies = filterCurrencies(allCurrencies, currentQuery);
  }
  
  renderCurrencies(filteredCurrencies);
}

/**
 * Highlights matching substring in text
 * @param {string} text - Text to highlight
 * @param {string} query - Query to highlight
 * @returns {string} HTML with highlighted matches
 */
function highlightMatch(text, query) {
  if (!query || query.trim() === '') {
    return text;
  }
  
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<strong>$1</strong>');
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
    
    // Create highlighted text
    const highlightedCode = highlightMatch(currency.code, currentQuery);
    const highlightedName = highlightMatch(currency.name, currentQuery);
    
    listItem.innerHTML = `${highlightedCode} - ${highlightedName}`;
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