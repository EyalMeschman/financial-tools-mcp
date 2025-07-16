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

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Focus search input
      cy.get('#currency-search').focus();
      
      // Press down arrow to select first item
      cy.get('#currency-search').type('{downarrow}');
      
      // First item should be selected
      cy.get('#currency-option-0').should('have.class', 'selected');
      cy.get('#currency-search').should('have.attr', 'aria-activedescendant', 'currency-option-0');
      
      // Press down arrow again
      cy.get('#currency-search').type('{downarrow}');
      
      // Second item should be selected
      cy.get('#currency-option-1').should('have.class', 'selected');
      cy.get('#currency-search').should('have.attr', 'aria-activedescendant', 'currency-option-1');
      
      // Press up arrow
      cy.get('#currency-search').type('{uparrow}');
      
      // First item should be selected again
      cy.get('#currency-option-0').should('have.class', 'selected');
      cy.get('#currency-search').should('have.attr', 'aria-activedescendant', 'currency-option-0');
    });

    it('should select currency with Enter key', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Focus search input and navigate to first item
      cy.get('#currency-search').focus().type('{downarrow}');
      
      // Press Enter to select
      cy.get('#currency-search').type('{enter}');
      
      // Should update input value and collapse list
      cy.get('#currency-search').should('not.be.empty');
      cy.get('#dropdown-root').should('have.class', 'collapsed');
      cy.get('#dropdown-container').should('have.attr', 'aria-expanded', 'false');
    });

    it('should collapse list with Escape key', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Ensure list is expanded
      cy.get('#dropdown-root').should('not.have.class', 'collapsed');
      cy.get('#dropdown-container').should('have.attr', 'aria-expanded', 'true');
      
      // Press Escape
      cy.get('#currency-search').focus().type('{esc}');
      
      // Should collapse list
      cy.get('#dropdown-root').should('have.class', 'collapsed');
      cy.get('#dropdown-container').should('have.attr', 'aria-expanded', 'false');
    });

    it('should expand list on focus after collapse', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Collapse list
      cy.get('#currency-search').focus().type('{esc}');
      cy.get('#dropdown-root').should('have.class', 'collapsed');
      
      // Focus again
      cy.get('#currency-search').blur().focus();
      
      // Should expand list
      cy.get('#dropdown-root').should('not.have.class', 'collapsed');
      cy.get('#dropdown-container').should('have.attr', 'aria-expanded', 'true');
    });
  });

  describe('ARIA Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Check container attributes
      cy.get('#dropdown-container')
        .should('have.attr', 'role', 'combobox')
        .should('have.attr', 'aria-expanded', 'true')
        .should('have.attr', 'aria-haspopup', 'listbox');
      
      // Check input attributes
      cy.get('#currency-search')
        .should('have.attr', 'aria-autocomplete', 'list')
        .should('have.attr', 'aria-controls', 'dropdown-list');
      
      // Check list attributes
      cy.get('#dropdown-list')
        .should('have.attr', 'role', 'listbox');
      
      // Check option attributes
      cy.get('.currency-item').each(($item, index) => {
        cy.wrap($item)
          .should('have.attr', 'role', 'option')
          .should('have.attr', 'id', `currency-option-${index}`)
          .should('have.attr', 'aria-selected', 'false');
      });
    });

    it('should update aria-activedescendant during navigation', () => {
      cy.visit('/');
      
      // Wait for initial load
      cy.get('#dropdown-root .currency-list', { timeout: 10000 }).should('exist');
      
      // Initially no active descendant
      cy.get('#currency-search').should('not.have.attr', 'aria-activedescendant');
      
      // Navigate down
      cy.get('#currency-search').focus().type('{downarrow}');
      
      // Should have active descendant
      cy.get('#currency-search').should('have.attr', 'aria-activedescendant', 'currency-option-0');
      
      // Press Escape
      cy.get('#currency-search').type('{esc}');
      
      // Should clear active descendant
      cy.get('#currency-search').should('not.have.attr', 'aria-activedescendant');
    });
  });
});