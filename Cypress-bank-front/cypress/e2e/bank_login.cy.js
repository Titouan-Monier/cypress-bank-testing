describe("Cypress Bank - Test de Connexion", () => {
  beforeEach(() => {
    
    cy.request("POST", "http://localhost:8080/api/reset");
    cy.visit("/");
  });

  it("Doit afficher la page de connexion et permettre de se connecter avec succès", () => {
    
    cy.get("[data-cy=login-card]").should("be.visible");
    cy.get("[data-cy=app-title]").should("contain", "Cypress Bank Testing");

    cy.get("[data-cy=input-client-id]").type("12345678");
    cy.get("[data-cy=input-password]").type("Banque2026!");

    cy.get("[data-cy=btn-login]").click();

    cy.get("[data-cy=top-navbar]").should("be.visible");
    cy.get("[data-cy=user-fullname]").should("contain", "Jean Dupont");
    cy.get("[data-cy=accounts-list]").should("be.visible");
  });

  it("Doit afficher une erreur en cas de mauvais identifiants", () => {
    cy.get("[data-cy=input-client-id]").type("99999999");
    cy.get("[data-cy=input-password]").type("MauvaisMotDePasse");
    cy.get("[data-cy=btn-login]").click();

    cy.get("[data-cy=alert-error]").should("be.visible");
  });
});