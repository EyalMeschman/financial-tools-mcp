import { initDropdown } from './dropdown.js';
import { fetchCurrencies } from './currency-dropdown/fetchCurrencies.js';

// Mock the fetchCurrencies function
jest.mock('./currency-dropdown/fetchCurrencies.js');

// Mock Choices.js
jest.mock('choices.js', () => {
  return jest.fn().mockImplementation(() => ({
    setChoices: jest.fn(),
    destroy: jest.fn(),
    showDropdown: jest.fn(),
    hideDropdown: jest.fn()
  }));
});

const mockCurrencies = [
  { code: 'USD', name: 'United States Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }
];

describe('Dropdown with Choices.js', () => {
  let selectElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <label for="currency-picker">Currency:</label>
      <select id="currency-picker"></select>
    `;

    selectElement = document.getElementById('currency-picker');

    // Mock fetch
    fetchCurrencies.mockResolvedValue(mockCurrencies);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize Choices.js with correct options', async () => {
      const Choices = require('choices.js');
      
      await initDropdown();
      
      // Should have created Choices instance
      expect(Choices).toHaveBeenCalledWith(selectElement, expect.objectContaining({
        searchEnabled: true,
        searchChoices: true,
        searchPlaceholderValue: 'Search currencies...',
        itemSelectText: '',
        shouldSort: false,
        position: 'bottom'
      }));
    });

    it('should populate choices with currency data', async () => {
      const Choices = require('choices.js');
      const mockSetChoices = jest.fn();
      Choices.mockImplementation(() => ({
        setChoices: mockSetChoices,
        destroy: jest.fn(),
        showDropdown: jest.fn(),
        hideDropdown: jest.fn()
      }));
      
      await initDropdown();
      
      // Should have called setChoices with currency data
      expect(mockSetChoices).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            value: 'USD',
            label: 'USD - United States Dollar',
            selected: false
          }),
          expect.objectContaining({
            value: 'EUR',
            label: 'EUR - Euro',
            selected: false
          }),
          expect.objectContaining({
            value: 'GBP',
            label: 'GBP - British Pound',
            selected: false
          })
        ]),
        'value',
        'label',
        false
      );
    });
  });

  describe('Event Handling', () => {
    it('should dispatch custom event on selection', async () => {
      await initDropdown();
      
      let selectedCurrency = null;
      document.addEventListener('currencySelected', (event) => {
        selectedCurrency = event.detail.currency;
      });
      
      // Simulate select change
      selectElement.value = 'USD';
      const changeEvent = new Event('change');
      selectElement.dispatchEvent(changeEvent);
      
      expect(selectedCurrency).toEqual(mockCurrencies[0]);
    });

    it('should handle currency data conversion', async () => {
      await initDropdown();
      
      // Test that currencies are converted to proper format
      expect(fetchCurrencies).toHaveBeenCalledWith('/currencies.json');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      fetchCurrencies.mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await initDropdown();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to load currencies:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });

    it('should handle missing select element', async () => {
      document.body.innerHTML = ''; // Remove select element
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await initDropdown();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Currency picker element not found');
      
      consoleErrorSpy.mockRestore();
    });
  });
});