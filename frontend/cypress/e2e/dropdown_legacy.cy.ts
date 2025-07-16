/**
 * Legacy Currency Dropdown E2E Test
 * 
 * This test captures the current behavior of the currency dropdown component
 * to establish a baseline for comparison during the refactoring process.
 * 
 * Issues being tested:
 * 1. TRUNCATION ISSUE: Currency names are truncated in the dropdown button
 * 2. VIEWPORT ISSUES: Long currency names don't display properly in narrow viewports
 * 3. SEARCH UX: Dual search inputs can be confusing
 * 4. ACCESSIBILITY: Missing proper keyboard navigation patterns
 */

describe('Legacy Currency Dropdown E2E', () => {
  beforeEach(() => {
    // Visit the main page where the currency dropdown is located
    cy.visit('/');
    
    // Wait for the page to load and currency dropdown to be available
    cy.get('[data-testid="currency-select"]', { timeout: 10000 }).should('be.visible');
  });

  it('should display currency dropdown with default USD selection', () => {
    // Verify the dropdown is visible
    cy.get('[data-testid="currency-select"]').should('be.visible');
    
    // Verify default value is USD
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .should('have.value', 'USD - United States Dollar');
  });

  it('should open dropdown and display currency list including USD', () => {
    // Click on the dropdown to open it
    cy.get('[data-testid="currency-select"]')
      .find('button')
      .click();

    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');

    // Assert that USD is visible in the list
    cy.get('[data-testid="currency-option-USD"]')
      .should('be.visible')
      .and('contain.text', 'USD – United States Dollar');
  });

  it('should demonstrate truncation issue with long currency names', () => {
    // Click on the dropdown to open it
    cy.get('[data-testid="currency-select"]')
      .find('button')
      .click();

    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');

    // Look for a currency with a very long name that would be truncated
    cy.get('[data-testid="currency-option-BAM"]')
      .should('be.visible')
      .and('contain.text', 'BAM – Bosnia and Herzegovina Convertible Mark');

    // Select the long currency name to demonstrate button truncation
    cy.get('[data-testid="currency-option-BAM"]').click();

    // Verify the button now shows the truncated version
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .should('have.value', 'BAM - Bosnia and Herzegovina Convertible Mark');

    // Take a screenshot to document the truncation issue
    cy.screenshot('truncation-issue-long-currency-name');
  });

  it('should demonstrate search functionality in current implementation', () => {
    // Click on the dropdown to open it
    cy.get('[data-testid="currency-select"]')
      .find('button')
      .click();

    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');

    // There should be a search input in the dropdown
    cy.get('[role="listbox"]')
      .find('input[placeholder="Search currencies..."]')
      .should('be.visible');

    // Type in the search to filter currencies
    cy.get('[role="listbox"]')
      .find('input[placeholder="Search currencies..."]')
      .type('za');

    // Should show filtered results including Zambia
    cy.get('[data-testid="currency-option-ZMW"]')
      .should('be.visible')
      .and('contain.text', 'ZMW – Zambian Kwacha');

    // Take a screenshot to document current search behavior
    cy.screenshot('current-search-functionality');
  });

  it('should handle viewport width issues with currency names', () => {
    // Test with a narrow viewport to demonstrate truncation issues
    cy.viewport(375, 667); // iPhone SE viewport

    // Click on the dropdown to open it
    cy.get('[data-testid="currency-select"]')
      .find('button')
      .click();

    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');

    // Select a currency with a long name
    cy.get('[data-testid="currency-option-BAM"]').click();

    // The button should show ellipsis due to narrow viewport
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .should('have.css', 'text-overflow', 'ellipsis');

    // Take a screenshot to document viewport truncation issue
    cy.screenshot('viewport-truncation-issue');
  });

  it('should demonstrate keyboard navigation limitations', () => {
    // Focus on the dropdown
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .focus();

    // Try to open with keyboard
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .type('{downarrow}');

    // The dropdown should open
    cy.get('[role="listbox"]').should('be.visible');

    // Navigate with arrow keys
    cy.get('[data-testid="currency-select"]')
      .find('input')
      .type('{downarrow}{downarrow}{enter}');

    // The dropdown should close and a selection should be made
    cy.get('[role="listbox"]').should('not.exist');
    
    // Take a screenshot to document keyboard navigation
    cy.screenshot('keyboard-navigation-behavior');
  });

  it('should demonstrate performance with large currency list', () => {
    // Click on the dropdown to open it
    cy.get('[data-testid="currency-select"]')
      .find('button')
      .click();

    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');

    // Count the total number of currency options (should be 180+)
    cy.get('[data-testid^="currency-option-"]')
      .should('have.length.greaterThan', 100);

    // Scroll to the bottom of the dropdown to test performance
    cy.get('[role="listbox"]')
      .scrollTo('bottom');

    // Verify that currencies at the bottom are visible (like ZMW)
    cy.get('[data-testid="currency-option-ZMW"]')
      .should('be.visible');

    // Take a screenshot to document the full dropdown
    cy.screenshot('full-currency-dropdown-performance');
  });
});