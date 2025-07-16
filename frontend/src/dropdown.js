import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';
import { filterCurrencies } from './currency-utils.js';

let allCurrencies = [];
let currentQuery = '';
let filteredCurrencies = [];
let selectedIndex = -1;
let isListCollapsed = false;

/**
 * Initializes the currency dropdown by fetching currencies and rendering them
 */
export async function initDropdown() {
  try {
    const currencyData = await fetchCurrencies('/currencies.json');
    allCurrencies = convertObjectToArray(currencyData);
    filteredCurrencies = allCurrencies.slice(0, 3); // Show first 3 initially
    renderCurrencies(filteredCurrencies);
    setupSearchListener();
    setupKeyboardNavigation();
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
    selectedIndex = -1; // Reset selection on new input
    performSearch();
  });

  searchInput.addEventListener('focus', () => {
    expandList();
  });
}

/**
 * Sets up keyboard navigation
 */
function setupKeyboardNavigation() {
  const searchInput = document.getElementById('currency-search');
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }

  searchInput.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (isListCollapsed) {
          expandList();
        } else {
          moveSelection(1);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isListCollapsed) {
          expandList();
        } else {
          moveSelection(-1);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredCurrencies.length) {
          commitSelection(filteredCurrencies[selectedIndex]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        collapseList();
        break;
    }
  });
}

/**
 * Performs search and re-renders results
 */
function performSearch() {
  if (currentQuery.trim() === '') {
    // Show first 3 when no search query
    filteredCurrencies = allCurrencies.slice(0, 3);
  } else {
    // Filter currencies based on search query
    filteredCurrencies = filterCurrencies(allCurrencies, currentQuery);
  }
  
  renderCurrencies(filteredCurrencies);
  updateAriaExpanded();
}

/**
 * Moves selection up or down
 */
function moveSelection(direction) {
  const newIndex = selectedIndex + direction;
  
  if (newIndex >= 0 && newIndex < filteredCurrencies.length) {
    selectedIndex = newIndex;
  } else if (newIndex < 0) {
    selectedIndex = filteredCurrencies.length - 1; // Wrap to last item
  } else if (newIndex >= filteredCurrencies.length) {
    selectedIndex = 0; // Wrap to first item
  }
  
  updateAriaActivedescendant();
  updateVisualSelection();
}

/**
 * Commits the selected currency
 */
function commitSelection(currency) {
  const searchInput = document.getElementById('currency-search');
  if (searchInput) {
    searchInput.value = `${currency.code} - ${currency.name}`;
    currentQuery = searchInput.value;
  }
  
  selectedIndex = -1;
  collapseList();
  
  // Trigger custom event for other components
  const event = new CustomEvent('currencySelected', {
    detail: { currency }
  });
  document.dispatchEvent(event);
}

/**
 * Expands the dropdown list
 */
function expandList() {
  isListCollapsed = false;
  const dropdownRoot = document.getElementById('dropdown-root');
  const container = document.getElementById('dropdown-container');
  
  if (dropdownRoot) {
    dropdownRoot.classList.remove('collapsed');
  }
  
  updateAriaExpanded();
}

/**
 * Collapses the dropdown list
 */
function collapseList() {
  isListCollapsed = true;
  selectedIndex = -1;
  const dropdownRoot = document.getElementById('dropdown-root');
  
  if (dropdownRoot) {
    dropdownRoot.classList.add('collapsed');
  }
  
  updateAriaExpanded();
  updateAriaActivedescendant();
}

/**
 * Updates aria-expanded attribute
 */
function updateAriaExpanded() {
  const container = document.getElementById('dropdown-container');
  if (container) {
    container.setAttribute('aria-expanded', !isListCollapsed);
  }
}

/**
 * Updates aria-activedescendant attribute
 */
function updateAriaActivedescendant() {
  const searchInput = document.getElementById('currency-search');
  if (searchInput) {
    if (selectedIndex >= 0 && selectedIndex < filteredCurrencies.length) {
      const activeId = `currency-option-${selectedIndex}`;
      searchInput.setAttribute('aria-activedescendant', activeId);
    } else {
      searchInput.removeAttribute('aria-activedescendant');
    }
  }
}

/**
 * Updates visual selection highlighting
 */
function updateVisualSelection() {
  const items = document.querySelectorAll('.currency-item');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
    } else {
      item.classList.remove('selected');
    }
  });
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
  list.setAttribute('role', 'listbox');
  list.setAttribute('id', 'dropdown-list');

  currencies.forEach((currency, index) => {
    const listItem = document.createElement('li');
    listItem.className = 'currency-item';
    listItem.setAttribute('role', 'option');
    listItem.setAttribute('id', `currency-option-${index}`);
    listItem.setAttribute('aria-selected', 'false');
    
    // Create highlighted text
    const highlightedCode = highlightMatch(currency.code, currentQuery);
    const highlightedName = highlightMatch(currency.name, currentQuery);
    
    listItem.innerHTML = `${highlightedCode} - ${highlightedName}`;
    listItem.setAttribute('data-code', currency.code);
    
    // Add click handler
    listItem.addEventListener('click', () => {
      selectedIndex = index;
      commitSelection(currency);
    });
    
    list.appendChild(listItem);
  });

  dropdownRoot.appendChild(list);
  
  // Update visual selection after rendering
  updateVisualSelection();
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