describe('Currency Dropdown', () => {
  it('should display 3 currency list items', () => {
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
});