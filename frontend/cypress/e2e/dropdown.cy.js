describe('Currency Dropdown', () => {
  it('should display 3 currency list items initially', () => {
    cy.visit('/');
    
    // Wait for the dropdown to render
    cy.get('#dropdown-root .currency-list', { timeout: 10000 })
      .should('exist')
      .within(() => {
        cy.get('.currency-item').should('have.length', 3);
      });
    
    // Verify the items contain currency codes and names
    cy.get('#dropdown-root .currency-item').each(($item) => {
      cy.wrap($item).should('contain', '-');
      cy.wrap($item).invoke('text').should('match', /[A-Z]{3} - .+/);
    });
  });
  
  it('should filter currencies when typing "usd"', () => {
    cy.visit('/');
    
    // Wait for initial load
    cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
    
    // Type in search input
    cy.get('#currency-search')
      .should('exist')
      .type('usd');
    
    // Should show only one result (USD)
    cy.get('#dropdown-root .currency-list .currency-item')
      .should('have.length', 1)
      .first()
      .should('contain', 'USD')
      .should('contain', 'United States Dollar');
    
    // Verify highlighting
    cy.get('#dropdown-root .currency-item strong')
      .should('exist')
      .should('contain', 'USD');
  });
  
  it('should display currency label', () => {
    cy.visit('/');
    
    cy.get('label[for="currency-picker"]')
      .should('exist')
      .should('contain', 'Currency:');
  });
  
  it('should have hidden select element', () => {
    cy.visit('/');
    
    cy.get('#currency-picker')
      .should('exist')
      .should('not.be.visible');
  });
  
  it('should have search input with placeholder', () => {
    cy.visit('/');
    
    cy.get('#currency-search')
      .should('exist')
      .should('have.attr', 'placeholder', 'Search currencies...');
  });
  
  it('should show all currencies when search is cleared', () => {
    cy.visit('/');
    
    // Wait for initial load
    cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
    
    // Type and then clear search
    cy.get('#currency-search')
      .type('usd')
      .clear();
    
    // Should show initial 3 items again
    cy.get('#dropdown-root .currency-list .currency-item')
      .should('have.length', 3);
  });
});