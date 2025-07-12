import React from 'react';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App Component', () => {
  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Invoice Converter')).toBeInTheDocument();
  });

  it('renders the placeholder text', () => {
    render(<App />);
    expect(screen.getByText('Placeholder React app')).toBeInTheDocument();
  });
});