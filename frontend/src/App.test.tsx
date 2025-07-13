import { render, screen } from '@testing-library/react';
import App from './App';

test('renders headline', () => {
  render(<App />);
  const headlineElement = screen.getByRole('heading', { name: /invoice converter/i });
  expect(headlineElement).toBeInTheDocument();
});