describe('Currency Dropdown', () => {
  it('should initialize Choices.js dropdown', () => {
    cy.visit('/');
    
    // Wait for Choices.js to initialize
    cy.get('.choices', { timeout: 10000 }).should('exist');
    cy.get('.choices__inner').should('exist');
    
    // Should have placeholder text
    cy.get('.choices__placeholder').should('contain', 'Search currencies...');
  });
  
  it('should filter currencies when typing "usd"', () => {
    cy.visit('/');
    
    // Wait for Choices.js to initialize
    cy.get('.choices', { timeout: 10000 }).should('exist');
    
    // Click to open dropdown
    cy.get('.choices__inner').click();
    
    // Type in search input
    cy.get('.choices__input--cloned')
      .should('exist')
      .type('usd');
    
    // Should show filtered results
    cy.get('.choices__list--dropdown .choices__item')
      .should('contain', 'USD')
      .should('contain', 'United States Dollar');
  });
  
  it('should display currency label', () => {
    cy.visit('/');
    
    cy.get('label[for="currency-picker"]')
      .should('exist')
      .should('contain', 'Currency:');
  });
  
  it('should have select element converted to Choices.js', () => {
    cy.visit('/');
    
    // Original select should exist but be hidden by Choices.js
    cy.get('#currency-picker').should('exist');
    
    // Choices.js wrapper should exist
    cy.get('.choices').should('exist');
  });
  
  it('should select currency from dropdown', () => {
    cy.visit('/');
    
    // Wait for Choices.js to initialize
    cy.get('.choices', { timeout: 10000 }).should('exist');
    
    // Click to open dropdown
    cy.get('.choices__inner').click();
    
    // Wait for dropdown to open
    cy.get('.choices__list--dropdown').should('be.visible');
    
    // Click on first option
    cy.get('.choices__list--dropdown .choices__item')
      .first()
      .click();
    
    // Should close dropdown and show selected value
    cy.get('.choices__list--dropdown').should('not.be.visible');
    cy.get('.choices__item--choice').should('exist');
  });

  describe('Keyboard Navigation', () => {
    it('should support keyboard navigation with Choices.js', () => {
      cy.visit('/');
      
      // Wait for Choices.js to initialize
      cy.get('.choices', { timeout: 10000 }).should('exist');
      
      // Click to open dropdown
      cy.get('.choices__inner').click();
      
      // Use arrow keys to navigate
      cy.get('.choices__input--cloned').type('{downarrow}');
      
      // Should highlight first item
      cy.get('.choices__item--highlighted').should('exist');
      
      // Press Enter to select
      cy.get('.choices__input--cloned').type('{enter}');
      
      // Should close dropdown and select item
      cy.get('.choices__list--dropdown').should('not.be.visible');
      cy.get('.choices__item--choice').should('exist');
    });

    it('should close dropdown with Escape key', () => {
      cy.visit('/');
      
      // Wait for Choices.js to initialize
      cy.get('.choices', { timeout: 10000 }).should('exist');
      
      // Click to open dropdown
      cy.get('.choices__inner').click();
      cy.get('.choices__list--dropdown').should('be.visible');
      
      // Press Escape
      cy.get('.choices__input--cloned').type('{esc}');
      
      // Should close dropdown
      cy.get('.choices__list--dropdown').should('not.be.visible');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes from Choices.js', () => {
      cy.visit('/');
      
      // Wait for Choices.js to initialize
      cy.get('.choices', { timeout: 10000 }).should('exist');
      
      // Check that Choices.js adds proper accessibility attributes
      cy.get('.choices__inner').should('have.attr', 'role', 'combobox');
      cy.get('.choices__inner').should('have.attr', 'aria-expanded');
      
      // Open dropdown to check list attributes
      cy.get('.choices__inner').click();
      cy.get('.choices__list--dropdown').should('have.attr', 'role', 'listbox');
      
      // Check that options have proper attributes
      cy.get('.choices__item').each(($item) => {
        cy.wrap($item).should('have.attr', 'role', 'option');
      });
    });
  });
});