import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CurrencySelect from './CurrencySelect';

const mockCurrencies = {
  USD: {
    name: "United States Dollar",
    symbol: "$"
  },
  EUR: {
    name: "Euro",
    symbol: "€"
  },
  GBP: {
    name: "Pound Sterling",
    symbol: "£"
  }
};

describe('CurrencySelect', () => {
  const mockOnCurrencyChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockCurrencies,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('renders loading state initially', () => {
    render(
      <CurrencySelect
        selectedCurrency="USD"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    expect(screen.getByText('Loading currencies...')).toBeInTheDocument();
  });

  it('loads and displays currencies', async () => {
    render(
      <CurrencySelect
        selectedCurrency="USD"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith('/currencies.json');
    expect(screen.getByText('USD - United States Dollar')).toBeInTheDocument();
  });

  it('opens dropdown and allows currency selection', async () => {
    render(
      <CurrencySelect
        selectedCurrency="USD"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    // Click the dropdown button to open it
    const button = screen.getByTestId('selected-currency-display');
    fireEvent.click(button.closest('button')!);

    // Wait for dropdown options to appear
    await waitFor(() => {
      expect(screen.getByTestId('currency-option-EUR')).toBeInTheDocument();
    });

    // Click on EUR option
    fireEvent.click(screen.getByTestId('currency-option-EUR'));

    // Verify the callback was called with EUR
    expect(mockOnCurrencyChange).toHaveBeenCalledWith('EUR');
  });

  it('displays selected currency correctly', async () => {
    render(
      <CurrencySelect
        selectedCurrency="EUR"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('EUR - Euro')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <CurrencySelect
        selectedCurrency="USD"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load currencies:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('filters out non-ISO currency codes', async () => {
    const mixedCurrencies = {
      ...mockCurrencies,
      'Abkhazia': { // Non-ISO code (not 3 letters)
        name: "Abkhazian Apsar",
        symbol: ""
      }
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mixedCurrencies,
    });

    render(
      <CurrencySelect
        selectedCurrency="USD"
        onCurrencyChange={mockOnCurrencyChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('currency-select')).toBeInTheDocument();
    });

    // Click the dropdown button to open it
    const button = screen.getByTestId('selected-currency-display');
    fireEvent.click(button.closest('button')!);

    await waitFor(() => {
      expect(screen.getByTestId('currency-option-EUR')).toBeInTheDocument();
    });

    // Verify Abkhazia is not in the options
    expect(screen.queryByText(/Abkhazian Apsar/)).not.toBeInTheDocument();
    
    // But EUR should be there
    expect(screen.getByTestId('currency-option-EUR')).toBeInTheDocument();
  });
});