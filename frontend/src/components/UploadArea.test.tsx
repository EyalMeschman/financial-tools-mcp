import { render, screen, fireEvent, act } from '@testing-library/react';
import UploadArea from './UploadArea';

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

test('displays selected files in DOM after selection', async () => {
  render(<UploadArea />);

  // Create fake files
  const file1 = new File(['file1 content'], 'invoice1.pdf', { type: 'application/pdf' });
  const file2 = new File(['file2 content'], 'receipt2.jpg', { type: 'image/jpeg' });

  // Get the file input (it's hidden by react-dropzone)
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

  // Simulate file selection wrapped in act
  await act(async () => {
    Object.defineProperty(fileInput, 'files', {
      value: [file1, file2],
      writable: false,
    });

    fireEvent.change(fileInput);
  });

  // Assert that files appear in the DOM
  expect(screen.getByText('invoice1.pdf')).toBeInTheDocument();
  expect(screen.getByText('receipt2.jpg')).toBeInTheDocument();
  expect(screen.getByText('Selected Files (2)')).toBeInTheDocument();

  // Check that file elements have the correct test id
  const selectedFiles = screen.getAllByTestId('selected-file');
  expect(selectedFiles).toHaveLength(2);
});