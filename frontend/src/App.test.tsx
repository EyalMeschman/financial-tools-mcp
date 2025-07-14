import { render, screen } from '@testing-library/react';
import App from './App';

const mockCurrencies = {
  USD: { name: "United States Dollar", symbol: "$" },
  EUR: { name: "Euro", symbol: "€" }
};

beforeEach(() => {
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => mockCurrencies,
  });
});

test('renders headline', () => {
  render(<App />);
  const headlineElement = screen.getByRole('heading', { name: /invoice converter/i });
  expect(headlineElement).toBeInTheDocument();
});