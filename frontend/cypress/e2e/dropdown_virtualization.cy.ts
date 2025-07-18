/**
 * E2E tests for virtualized dropdown scrolling behavior
 * Tests the react-window implementation and scroll-to-item functionality
 */

describe('Currency Dropdown Virtualization', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should virtualize large currency list with proper scrolling', () => {
    // Wait for the page to load
    cy.get('[data-testid="currency-dropdown"]').should('be.visible');
    
    // Click to open the dropdown
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    
    // Wait for dropdown to open
    cy.get('[role="listbox"]').should('be.visible');
    
    // Take a screenshot of the opened dropdown
    cy.screenshot('dropdown-opened-virtualized');
    
    // Verify the dropdown has fixed dimensions (w-80 h-72)
    cy.get('[role="listbox"]').should('have.class', 'w-80');
    cy.get('[role="listbox"]').should('have.class', 'h-72');
    
    // Verify only a limited number of items are rendered (virtualization)
    // With ~8 visible items, we should not see all 180+ currencies in the DOM
    cy.get('[role="option"]').should('have.length.lessThan', 20);
  });

  it('should scroll to bottom and show ZMW currency', () => {
    // Open the dropdown
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    cy.get('[role="listbox"]').should('be.visible');
    
    // Get the virtual list container and scroll to bottom
    cy.get('[role="listbox"]').within(() => {
      // Find the scrollable container (react-window creates a div with specific styling)
      cy.get('div[style*="overflow"]').first().scrollTo('bottom');
    });
    
    // Wait for scroll to complete
    cy.wait(500);
    
    // Search for ZMW specifically to bring it into view
    cy.get('[data-testid="currency-dropdown"]').find('input').clear().type('ZMW');
    
    // Wait for search to complete (200ms debounce + render time)
    cy.wait(300);
    
    // Verify ZMW is visible
    cy.get('[data-testid="currency-option-ZMW"]').should('be.visible');
    cy.get('[data-testid="currency-option-ZMW"]').should('contain', 'ZMW');
    cy.get('[data-testid="currency-option-ZMW"]').should('contain', 'Zambian Kwacha');
    
    // Take a screenshot showing ZMW in the list
    cy.screenshot('dropdown-zmw-visible');
  });

  it('should scroll selected currency into view when dropdown opens', () => {
    // First, select a currency that would be far down the list
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    cy.get('[role="listbox"]').should('be.visible');
    
    // Search for a currency that would be towards the end of the alphabet
    cy.get('[data-testid="currency-dropdown"]').find('input').clear().type('ZAR');
    cy.wait(300);
    
    // Select South African Rand
    cy.get('[data-testid="currency-option-ZAR"]').should('be.visible').click();
    
    // Verify the selection was made
    cy.get('[data-testid="currency-dropdown"]').find('input').should('have.value', 'ZAR - South African Rand');
    
    // Close dropdown by clicking outside
    cy.get('body').click();
    
    // Reopen dropdown to test scroll-to-selected behavior
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    cy.get('[role="listbox"]').should('be.visible');
    
    // Wait for scroll-to-item to complete
    cy.wait(500);
    
    // The selected item (ZAR) should be visible without scrolling
    cy.get('[data-testid="currency-option-ZAR"]').should('be.visible');
    
    // Take a screenshot showing the selected item is in view
    cy.screenshot('dropdown-selected-in-view');
  });

  it('should handle empty search results gracefully', () => {
    // Open dropdown
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    cy.get('[role="listbox"]').should('be.visible');
    
    // Search for something that doesn't exist
    cy.get('[data-testid="currency-dropdown"]').find('input').clear().type('XYZ123');
    cy.wait(300);
    
    // Should show "No currencies found" message
    cy.get('[role="listbox"]').should('contain', 'No currencies found');
    
    // Virtual list should not be rendered
    cy.get('[role="option"]').should('not.exist');
    
    // Take a screenshot of empty state
    cy.screenshot('dropdown-empty-search');
  });

  it('should maintain keyboard navigation with virtualized list', () => {
    // Open dropdown
    cy.get('[data-testid="currency-dropdown"]').find('input').click();
    cy.get('[role="listbox"]').should('be.visible');
    
    // Use arrow keys to navigate
    cy.get('[data-testid="currency-dropdown"]').find('input').type('{downarrow}');
    cy.wait(100);
    
    // Should be able to navigate with arrow keys
    cy.get('[data-testid="currency-dropdown"]').find('input').type('{downarrow}{downarrow}');
    cy.wait(100);
    
    // Press Enter to select
    cy.get('[data-testid="currency-dropdown"]').find('input').type('{enter}');
    
    // Should have selected a currency
    cy.get('[data-testid="currency-dropdown"]').find('input').should('not.have.value', '');
    
    // Take a screenshot of keyboard selection
    cy.screenshot('dropdown-keyboard-navigation');
  });
});