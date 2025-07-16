/**
 * Filters currencies by case-insensitive match on code or name
 * @param {Array} list - Array of currency objects with code and name properties
 * @param {string} query - Search query string
 * @returns {Array} Filtered array of currencies
 */
export function filterCurrencies(list, query) {
  if (!Array.isArray(list)) {
    return [];
  }
  
  if (!query || typeof query !== 'string') {
    return list;
  }

  const normalizedQuery = query.toLowerCase().trim();
  
  if (normalizedQuery === '') {
    return list;
  }

  return list.filter(currency => {
    if (!currency || typeof currency !== 'object') {
      return false;
    }
    
    const code = currency.code ? currency.code.toLowerCase() : '';
    const name = currency.name ? currency.name.toLowerCase() : '';
    
    return code.includes(normalizedQuery) || name.includes(normalizedQuery);
  });
}

/**
 * Sorts currencies by name in ascending order
 * @param {Array} list - Array of currency objects with name property
 * @returns {Array} New sorted array of currencies
 */
export function sortCurrencies(list) {
  if (!Array.isArray(list)) {
    return [];
  }

  return [...list].sort((a, b) => {
    if (!a || typeof a !== 'object' || !a.name) {
      return 1;
    }
    if (!b || typeof b !== 'object' || !b.name) {
      return -1;
    }
    
    return a.name.localeCompare(b.name);
  });
}