/**
 * E2E Test Stub: Complete Invoice Processing Flow
 * 
 * This test verifies the happy path from file upload to report download.
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:8000
 * - Frontend dev server running on http://localhost:5173
 * - Azure Document Intelligence configured (or mock endpoints)
 * 
 * Setup instructions:
 * npm install -D playwright @playwright/test
 * npx playwright install
 * 
 * Run with: npx playwright test e2e/invoice-flow.spec.ts
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Invoice Processing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await expect(page.getByText('Invoice Converter')).toBeVisible();
  });

  test('complete happy path: upload -> process -> download', async ({ page }) => {
    // 1. Upload files
    const fileInput = page.locator('input[type="file"]');
    
    // Create test files (in a real test, you'd have sample PDFs/images)
    await fileInput.setInputFiles([
      path.join(__dirname, 'fixtures', 'sample-invoice.pdf'),
      path.join(__dirname, 'fixtures', 'sample-receipt.jpg'),
    ]);

    // Verify files are selected
    await expect(page.getByTestId('selected-file')).toHaveCount(2);
    await expect(page.getByText('sample-invoice.pdf')).toBeVisible();
    await expect(page.getByText('sample-receipt.jpg')).toBeVisible();

    // 2. Select target currency
    await page.selectOption('[data-testid="currency-select"]', 'EUR');

    // 3. Submit for processing
    const submitButton = page.getByTestId('submit-button');
    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    // 4. Verify processing state
    await expect(submitButton).toBeDisabled();
    await expect(page.getByText('Processing...')).toBeVisible();

    // 5. Wait for progress updates
    await expect(page.getByText('Processing Progress')).toBeVisible();
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // 6. Wait for completion (timeout after 30 seconds)
    await expect(page.getByText('✓ Success')).toHaveCount(2, { timeout: 30000 });

    // 7. Verify download was triggered
    // Note: In a real test, you'd need to handle the download event
    // This is a simplified check that the processing completed
    await expect(page.getByText('Processing...')).not.toBeVisible();
  });

  test('error handling: invalid file types', async ({ page }) => {
    // Try to upload an unsupported file type
    const fileInput = page.locator('input[type="file"]');
    
    // This should be rejected by the dropzone
    await fileInput.setInputFiles([
      path.join(__dirname, 'fixtures', 'invalid-file.txt'),
    ]);

    // Verify no files were added
    await expect(page.getByTestId('selected-file')).toHaveCount(0);
  });

  test('file management: add and remove files', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    
    // Add files
    await fileInput.setInputFiles([
      path.join(__dirname, 'fixtures', 'sample-invoice.pdf'),
    ]);

    await expect(page.getByTestId('selected-file')).toHaveCount(1);

    // Remove file
    await page.getByTestId('remove-file-button').click();
    await expect(page.getByTestId('selected-file')).toHaveCount(0);

    // Submit button should be hidden when no files
    await expect(page.getByTestId('submit-button')).not.toBeVisible();
  });
});

/**
 * To create test fixtures:
 * 
 * mkdir -p frontend/e2e/fixtures
 * 
 * Add sample files:
 * - sample-invoice.pdf (valid PDF invoice)
 * - sample-receipt.jpg (valid image receipt) 
 * - invalid-file.txt (for error testing)
 */