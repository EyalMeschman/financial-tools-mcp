import { initDropdown } from './dropdown.js';
import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';

// Mock the fetchCurrencies function
jest.mock('./currency-dropdown/fetchCurrencies.js');

// Mock DOM elements
const mockCurrencies = [
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }
];

describe('Dropdown Keyboard Navigation', () => {
  let searchInput, dropdownRoot, dropdownContainer;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="dropdown-container" role="combobox" aria-expanded="true" aria-haspopup="listbox">
        <input id="currency-search" type="text" placeholder="Search currencies..." aria-autocomplete="list" aria-controls="dropdown-list">
        <div id="dropdown-root"></div>
      </div>
    `;

    searchInput = document.getElementById('currency-search');
    dropdownRoot = document.getElementById('dropdown-root');
    dropdownContainer = document.getElementById('dropdown-container');

    // Mock fetch
    fetchCurrencies.mockResolvedValue(mockCurrencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Arrow Key Navigation', () => {
    it('should navigate down with ArrowDown key', async () => {
      await initDropdown();
      
      // Press ArrowDown
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      
      // Should select first item
      expect(searchInput.getAttribute('aria-activedescendant')).toBe('currency-option-0');
      expect(document.getElementById('currency-option-0')).toHaveClass('selected');
    });

    it('should navigate up with ArrowUp key', async () => {
      await initDropdown();
      
      // Press ArrowDown twice to select second item
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      searchInput.dispatchEvent(downEvent);
      
      // Press ArrowUp to go back to first item
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      searchInput.dispatchEvent(upEvent);
      
      expect(searchInput.getAttribute('aria-activedescendant')).toBe('currency-option-0');
      expect(document.getElementById('currency-option-0')).toHaveClass('selected');
    });

    it('should wrap around when navigating beyond boundaries', async () => {
      await initDropdown();
      
      // Press ArrowUp from beginning (should wrap to last item)
      const upEvent = new KeyboardEvent('keydown', { key: 'ArrowUp' });
      searchInput.dispatchEvent(upEvent);
      
      expect(searchInput.getAttribute('aria-activedescendant')).toBe('currency-option-2');
      expect(document.getElementById('currency-option-2')).toHaveClass('selected');
      
      // Press ArrowDown (should wrap to first item)
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      
      expect(searchInput.getAttribute('aria-activedescendant')).toBe('currency-option-0');
      expect(document.getElementById('currency-option-0')).toHaveClass('selected');
    });
  });

  describe('Enter Key Selection', () => {
    it('should commit selection on Enter key', async () => {
      await initDropdown();
      
      // Navigate to first item
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      
      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      searchInput.dispatchEvent(enterEvent);
      
      // Should update input value and collapse list
      expect(searchInput.value).toBe('USD - United States Dollar');
      expect(dropdownRoot).toHaveClass('collapsed');
      expect(dropdownContainer.getAttribute('aria-expanded')).toBe('false');
    });

    it('should dispatch custom event on selection', async () => {
      await initDropdown();
      
      let selectedCurrency = null;
      document.addEventListener('currencySelected', (event) => {
        selectedCurrency = event.detail.currency;
      });
      
      // Navigate to first item and press Enter
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      searchInput.dispatchEvent(enterEvent);
      
      expect(selectedCurrency).toEqual(mockCurrencies[0]);
    });
  });

  describe('Escape Key Collapse', () => {
    it('should collapse list on Escape key', async () => {
      await initDropdown();
      
      // Ensure list is expanded
      expect(dropdownRoot).not.toHaveClass('collapsed');
      expect(dropdownContainer.getAttribute('aria-expanded')).toBe('true');
      
      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      searchInput.dispatchEvent(escapeEvent);
      
      // Should collapse list and clear selection
      expect(dropdownRoot).toHaveClass('collapsed');
      expect(dropdownContainer.getAttribute('aria-expanded')).toBe('false');
      expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false);
    });
  });

  describe('Focus Behavior', () => {
    it('should expand list on focus', async () => {
      await initDropdown();
      
      // Collapse list first
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      searchInput.dispatchEvent(escapeEvent);
      expect(dropdownRoot).toHaveClass('collapsed');
      
      // Focus input
      const focusEvent = new Event('focus');
      searchInput.dispatchEvent(focusEvent);
      
      // Should expand list
      expect(dropdownRoot).not.toHaveClass('collapsed');
      expect(dropdownContainer.getAttribute('aria-expanded')).toBe('true');
    });
  });

  describe('ARIA Attributes', () => {
    it('should have correct ARIA roles and attributes', async () => {
      await initDropdown();
      
      expect(dropdownContainer.getAttribute('role')).toBe('combobox');
      expect(dropdownContainer.getAttribute('aria-expanded')).toBe('true');
      expect(dropdownContainer.getAttribute('aria-haspopup')).toBe('listbox');
      
      expect(searchInput.getAttribute('aria-autocomplete')).toBe('list');
      expect(searchInput.getAttribute('aria-controls')).toBe('dropdown-list');
      
      const list = document.querySelector('.currency-list');
      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('id')).toBe('dropdown-list');
      
      const options = document.querySelectorAll('.currency-item');
      options.forEach((option, index) => {
        expect(option.getAttribute('role')).toBe('option');
        expect(option.getAttribute('id')).toBe(`currency-option-${index}`);
        expect(option.getAttribute('aria-selected')).toBe('false');
      });
    });

    it('should update aria-activedescendant correctly', async () => {
      await initDropdown();
      
      // Initially no active descendant
      expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false);
      
      // Navigate down
      const downEvent = new KeyboardEvent('keydown', { key: 'ArrowDown' });
      searchInput.dispatchEvent(downEvent);
      
      // Should have active descendant
      expect(searchInput.getAttribute('aria-activedescendant')).toBe('currency-option-0');
      
      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      searchInput.dispatchEvent(escapeEvent);
      
      // Should clear active descendant
      expect(searchInput.hasAttribute('aria-activedescendant')).toBe(false);
    });
  });

  describe('Mouse Interaction', () => {
    it('should handle click to select', async () => {
      await initDropdown();
      
      const firstItem = document.getElementById('currency-option-0');
      firstItem.click();
      
      // Should update input value and collapse list
      expect(searchInput.value).toBe('USD - United States Dollar');
      expect(dropdownRoot).toHaveClass('collapsed');
    });
  });
});