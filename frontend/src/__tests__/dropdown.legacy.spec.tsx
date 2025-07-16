import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CurrencySelect from '../components/CurrencySelect';

// Mock the fetchCurrencies utility
jest.mock('../utils/fetchCurrencies', () => ({
  fetchCurrencies: jest.fn(() => Promise.resolve([
    { code: 'USD', name: 'United States Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound Sterling' },
    { code: 'CAD', name: 'Canadian Dollar' },
    { code: 'AUD', name: 'Australian Dollar' },
    { code: 'JPY', name: 'Japanese Yen' },
    { code: 'CHF', name: 'Swiss Franc' },
    { code: 'CNY', name: 'Chinese Yuan' },
    { code: 'SEK', name: 'Swedish Krona' },
    { code: 'NZD', name: 'New Zealand Dollar' },
    { code: 'MXN', name: 'Mexican Peso' },
    { code: 'SGD', name: 'Singapore Dollar' },
    { code: 'HKD', name: 'Hong Kong Dollar' },
    { code: 'NOK', name: 'Norwegian Krone' },
    { code: 'ZAR', name: 'South African Rand' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'BRL', name: 'Brazilian Real' },
    { code: 'INR', name: 'Indian Rupee' },
    { code: 'RUB', name: 'Russian Ruble' },
    { code: 'KRW', name: 'South Korean Won' },
    { code: 'PLN', name: 'Polish Zloty' },
    { code: 'CZK', name: 'Czech Koruna' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'HUF', name: 'Hungarian Forint' },
    { code: 'ILS', name: 'Israeli New Shekel' },
    { code: 'CLP', name: 'Chilean Peso' },
    { code: 'PHP', name: 'Philippine Peso' },
    { code: 'AED', name: 'United Arab Emirates Dirham' },
    { code: 'COP', name: 'Colombian Peso' },
    { code: 'SAR', name: 'Saudi Riyal' },
    { code: 'MYR', name: 'Malaysian Ringgit' },
    { code: 'RON', name: 'Romanian Leu' },
    { code: 'THB', name: 'Thai Baht' },
    { code: 'BGN', name: 'Bulgarian Lev' },
    { code: 'HRK', name: 'Croatian Kuna' },
    { code: 'ISK', name: 'Icelandic Krona' },
    { code: 'EGP', name: 'Egyptian Pound' },
    { code: 'QAR', name: 'Qatari Riyal' },
    { code: 'OMR', name: 'Omani Rial' },
    { code: 'KWD', name: 'Kuwaiti Dinar' },
    { code: 'BHD', name: 'Bahraini Dinar' },
    { code: 'JOD', name: 'Jordanian Dinar' },
    { code: 'LBP', name: 'Lebanese Pound' },
    { code: 'TND', name: 'Tunisian Dinar' },
    { code: 'MAD', name: 'Moroccan Dirham' },
    { code: 'DZD', name: 'Algerian Dinar' },
    { code: 'LYD', name: 'Libyan Dinar' },
    { code: 'SDG', name: 'Sudanese Pound' },
    { code: 'ETB', name: 'Ethiopian Birr' },
    { code: 'KES', name: 'Kenyan Shilling' },
    { code: 'UGX', name: 'Ugandan Shilling' },
    { code: 'TZS', name: 'Tanzanian Shilling' },
    { code: 'GHS', name: 'Ghanaian Cedi' },
    { code: 'NGN', name: 'Nigerian Naira' },
    { code: 'XOF', name: 'West African CFA Franc' },
    { code: 'XAF', name: 'Central African CFA Franc' },
    { code: 'MGA', name: 'Malagasy Ariary' },
    { code: 'MUR', name: 'Mauritian Rupee' },
    { code: 'SCR', name: 'Seychellois Rupee' },
    { code: 'ZMW', name: 'Zambian Kwacha' },
    { code: 'BWP', name: 'Botswanan Pula' },
    { code: 'SZL', name: 'Swazi Lilangeni' },
    { code: 'LSL', name: 'Lesotho Loti' },
    { code: 'NAD', name: 'Namibian Dollar' },
    { code: 'AOA', name: 'Angolan Kwanza' },
    { code: 'MZN', name: 'Mozambican Metical' },
    { code: 'MWK', name: 'Malawian Kwacha' },
    { code: 'ZWL', name: 'Zimbabwean Dollar' },
    { code: 'STN', name: 'São Tomé and Príncipe Dobra' },
    { code: 'CVE', name: 'Cape Verdean Escudo' },
    { code: 'GMD', name: 'Gambian Dalasi' },
    { code: 'GNF', name: 'Guinean Franc' },
    { code: 'LRD', name: 'Liberian Dollar' },
    { code: 'SLE', name: 'Sierra Leonean Leone' },
    { code: 'SOS', name: 'Somali Shilling' },
    { code: 'DJF', name: 'Djiboutian Franc' },
    { code: 'ERN', name: 'Eritrean Nakfa' },
    { code: 'RWF', name: 'Rwandan Franc' },
    { code: 'BIF', name: 'Burundian Franc' },
    { code: 'KMF', name: 'Comorian Franc' },
    { code: 'CDF', name: 'Congolese Franc' },
    { code: 'XPF', name: 'CFP Franc' },
    { code: 'VUV', name: 'Vanuatu Vatu' },
    { code: 'TOP', name: 'Tongan Paʻanga' },
    { code: 'WST', name: 'Samoan Tala' },
    { code: 'FJD', name: 'Fijian Dollar' },
    { code: 'PGK', name: 'Papua New Guinean Kina' },
    { code: 'SBD', name: 'Solomon Islands Dollar' },
    { code: 'NCX', name: 'New Caledonian Franc' },
    { code: 'TVD', name: 'Tuvaluan Dollar' },
    { code: 'KID', name: 'Kiribati Dollar' },
    { code: 'NRU', name: 'Nauruan Dollar' },
    { code: 'CKD', name: 'Cook Islands Dollar' },
    { code: 'MOP', name: 'Macanese Pataca' },
    { code: 'BND', name: 'Brunei Dollar' },
    { code: 'KHR', name: 'Cambodian Riel' },
    { code: 'LAK', name: 'Lao Kip' },
    { code: 'MMK', name: 'Myanmar Kyat' },
    { code: 'VND', name: 'Vietnamese Dong' },
    { code: 'IDR', name: 'Indonesian Rupiah' },
    { code: 'LKR', name: 'Sri Lankan Rupee' },
    { code: 'MVR', name: 'Maldivian Rufiyaa' },
    { code: 'PKR', name: 'Pakistani Rupee' },
    { code: 'BDT', name: 'Bangladeshi Taka' },
    { code: 'BTN', name: 'Bhutanese Ngultrum' },
    { code: 'NPR', name: 'Nepalese Rupee' },
    { code: 'AFN', name: 'Afghan Afghani' },
    { code: 'IRR', name: 'Iranian Rial' },
    { code: 'IQD', name: 'Iraqi Dinar' },
    { code: 'SYP', name: 'Syrian Pound' },
    { code: 'YER', name: 'Yemeni Rial' },
    { code: 'UZS', name: 'Uzbekistani Som' },
    { code: 'KZT', name: 'Kazakhstani Tenge' },
    { code: 'KGS', name: 'Kyrgystani Som' },
    { code: 'TJS', name: 'Tajikistani Somoni' },
    { code: 'TMT', name: 'Turkmenistani Manat' },
    { code: 'AZN', name: 'Azerbaijani Manat' },
    { code: 'GEL', name: 'Georgian Lari' },
    { code: 'AMD', name: 'Armenian Dram' },
    { code: 'BYN', name: 'Belarusian Ruble' },
    { code: 'MDL', name: 'Moldovan Leu' },
    { code: 'UAH', name: 'Ukrainian Hryvnia' },
    { code: 'RSD', name: 'Serbian Dinar' },
    { code: 'MKD', name: 'Macedonian Denar' },
    { code: 'ALL', name: 'Albanian Lek' },
    { code: 'BAM', name: 'Bosnia and Herzegovina Convertible Mark' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GIP', name: 'Gibraltar Pound' },
    { code: 'FKP', name: 'Falkland Islands Pound' },
    { code: 'SHP', name: 'Saint Helena Pound' },
    { code: 'JEP', name: 'Jersey Pound' },
    { code: 'GGP', name: 'Guernsey Pound' },
    { code: 'IMP', name: 'Isle of Man Pound' },
    { code: 'SVC', name: 'Salvadoran Colón' },
    { code: 'GTQ', name: 'Guatemalan Quetzal' },
    { code: 'BZD', name: 'Belize Dollar' },
    { code: 'HNL', name: 'Honduran Lempira' },
    { code: 'NIO', name: 'Nicaraguan Córdoba' },
    { code: 'CRC', name: 'Costa Rican Colón' },
    { code: 'PAB', name: 'Panamanian Balboa' },
    { code: 'CUP', name: 'Cuban Peso' },
    { code: 'CUC', name: 'Cuban Convertible Peso' },
    { code: 'JMD', name: 'Jamaican Dollar' },
    { code: 'HTG', name: 'Haitian Gourde' },
    { code: 'DOP', name: 'Dominican Peso' },
    { code: 'TTD', name: 'Trinidad and Tobago Dollar' },
    { code: 'BBD', name: 'Barbadian Dollar' },
    { code: 'XCD', name: 'East Caribbean Dollar' },
    { code: 'AWG', name: 'Aruban Florin' },
    { code: 'ANG', name: 'Netherlands Antillean Guilder' },
    { code: 'SRD', name: 'Surinamese Dollar' },
    { code: 'GYD', name: 'Guyanese Dollar' },
    { code: 'VES', name: 'Venezuelan Bolívar' },
    { code: 'VED', name: 'Venezuelan Bolívar Digital' },
    { code: 'BOB', name: 'Bolivian Boliviano' },
    { code: 'PEN', name: 'Peruvian Sol' },
    { code: 'PYG', name: 'Paraguayan Guaraní' },
    { code: 'UYU', name: 'Uruguayan Peso' },
    { code: 'ARS', name: 'Argentine Peso' },
    { code: 'FOK', name: 'Faroese Króna' },
    { code: 'DKK', name: 'Danish Krone' },
    { code: 'GLK', name: 'Greenlandic Krone' },
  ])),
}));

// Mock the config
jest.mock('../config', () => ({
  getApiUrl: jest.fn(() => '/currencies.json'),
}));

/**
 * Legacy Dropdown Snapshot Test
 * 
 * This test captures the current state of the currency dropdown component
 * to establish a baseline for comparison during the refactoring process.
 * 
 * TODO: The current implementation has the following issues that need to be addressed:
 * 1. TRUNCATION ISSUE: The dropdown button width (w-48) causes long currency names
 *    to be truncated with ellipsis, making them hard to read
 * 2. SEARCH UX: The search input appears both in the button and in the dropdown,
 *    which can be confusing
 * 3. FIXED WIDTH: The component has a fixed width that doesn't adapt to content
 * 4. SCROLL PERFORMANCE: With 180+ currencies, the dropdown can become sluggish
 *    without virtualization
 * 5. ACCESSIBILITY: Missing proper ARIA labels and keyboard navigation patterns
 */
describe('Legacy Currency Dropdown Snapshot', () => {
  const defaultProps = {
    selectedCurrency: 'USD',
    onCurrencyChange: jest.fn(),
  };

  it('should render the currency dropdown with loading state', () => {
    const { container } = render(
      <CurrencySelect {...defaultProps} />
    );

    // This should capture the loading state before currencies are fetched
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render the currency dropdown with currencies loaded', async () => {
    const { container } = render(
      <CurrencySelect {...defaultProps} />
    );

    // Wait for currencies to load
    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    // This should capture the current state with the truncation issue
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render with a very long currency name to demonstrate truncation', async () => {
    const { container } = render(
      <CurrencySelect 
        selectedCurrency="BAM" 
        onCurrencyChange={jest.fn()} 
      />
    );

    // Wait for currencies to load
    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    // This should show the truncation issue with "Bosnia and Herzegovina Convertible Mark"
    expect(container.firstChild).toMatchSnapshot();
  });

  it('should demonstrate the current implementation structure', async () => {
    const { container } = render(
      <CurrencySelect {...defaultProps} />
    );

    // Wait for currencies to load
    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    // Verify the basic structure that will be refactored
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search currencies...')).toBeInTheDocument();
    
    // This should show the current implementation structure
    expect(container.firstChild).toMatchSnapshot();
  });
});