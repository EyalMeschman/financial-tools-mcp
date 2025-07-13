import { render } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar', () => {
  it('should display correct width based on percentage', () => {
    const { container, rerender } = render(<ProgressBar percentage={25} />);
    
    const progressFill = container.querySelector('.bg-blue-600');
    expect(progressFill).toHaveStyle('width: 25%');

    // Test width increases
    rerender(<ProgressBar percentage={75} />);
    expect(progressFill).toHaveStyle('width: 75%');
  });

  it('should clamp percentage values', () => {
    const { container, rerender } = render(<ProgressBar percentage={-10} />);
    
    const progressFill = container.querySelector('.bg-blue-600');
    expect(progressFill).toHaveStyle('width: 0%');

    rerender(<ProgressBar percentage={150} />);
    expect(progressFill).toHaveStyle('width: 100%');
  });
});