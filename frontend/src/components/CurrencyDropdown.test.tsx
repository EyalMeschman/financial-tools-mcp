import { render, screen, waitFor } from '@testing-library/react';
import { CurrencyDropdown } from './CurrencyDropdown';
import { CurrencyProvider } from '../contexts/CurrencyContext';
import { fetchCurrencies } from '../lib/currency';
import type { Currency } from '../lib/currency';

// Mock the fetchCurrencies utility
jest.mock('../lib/currency', () => ({
  fetchCurrencies: jest.fn(),
}));

// Mock the config
jest.mock('../config', () => ({
  getApiUrl: jest.fn(() => '/currencies.json'),
}));

const mockCurrencyData: Currency[] = [
  { code: 'USD', name: 'United States Dollar', symbol: 'USD' },
  { code: 'EUR', name: 'Euro', symbol: 'EUR' },
  { code: 'GBP', name: 'Pound Sterling', symbol: 'GBP' },
];

describe('CurrencyDropdown', () => {
  const mockFetchCurrencies = fetchCurrencies as jest.MockedFunction<typeof fetchCurrencies>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchCurrencies.mockResolvedValue(mockCurrencyData);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const renderWithProvider = (props = {}) => {
    return render(
      <CurrencyProvider defaultCurrency="USD">
        <CurrencyDropdown {...props} />
      </CurrencyProvider>
    );
  };

  it('renders loading state initially', () => {
    // Mock a slow response to test loading state
    let resolvePromise: (value: Currency[]) => void;
    const slowPromise = new Promise<Currency[]>(resolve => {
      resolvePromise = resolve;
    });
    
    mockFetchCurrencies.mockReturnValue(slowPromise);

    renderWithProvider();

    expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
    
    // Clean up by resolving the promise
    resolvePromise!(mockCurrencyData);
  });

  it('renders default USD value when currencies are loaded', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('currency-dropdown')).toBeInTheDocument();
    });

    expect(mockFetchCurrencies).toHaveBeenCalledWith('/currencies.json');
    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('USD - United States Dollar');
  });

  it('renders with custom default value', async () => {
    renderWithProvider({ value: 'EUR' });

    await waitFor(() => {
      expect(screen.getByTestId('currency-dropdown')).toBeInTheDocument();
    });

    const input = screen.getByRole('combobox');
    expect(input).toHaveValue('EUR - Euro');
  });

  it('renders error state when fetch fails', async () => {
    mockFetchCurrencies.mockRejectedValue(new Error('Network error'));

    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('renders static list of currencies', async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByTestId('currency-dropdown')).toBeInTheDocument();
    });

    // Click to open dropdown
    const button = screen.getByRole('button');
    button.click();

    // Wait for options to appear
    await waitFor(() => {
      expect(screen.getByTestId('currency-option-USD')).toBeInTheDocument();
    });

    expect(screen.getByTestId('currency-option-EUR')).toBeInTheDocument();
    expect(screen.getByTestId('currency-option-GBP')).toBeInTheDocument();
  });

  it('calls onChange when provided', async () => {
    const mockOnChange = jest.fn();
    renderWithProvider({ onChange: mockOnChange });

    await waitFor(() => {
      expect(screen.getByTestId('currency-dropdown')).toBeInTheDocument();
    });

    // Click to open dropdown
    const button = screen.getByRole('button');
    button.click();

    // Wait for options to appear and click EUR
    await waitFor(() => {
      expect(screen.getByTestId('currency-option-EUR')).toBeInTheDocument();
    });

    screen.getByTestId('currency-option-EUR').click();

    expect(mockOnChange).toHaveBeenCalledWith('EUR');
  });
});