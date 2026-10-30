/* global cy, describe, it, beforeEach */

describe("Parcours Utilisateur : Authentification et Tableau de bord", () => {
  
  beforeEach(() => {
    // 1. On appelle l'API Back-End pour remettre les comptes à zéro avant chaque test
    cy.request("POST", "http://localhost:8080/api/reset");
    
    // 2. On charge l'URL de l'application (baseUrl définie dans cypress.config.js)
    cy.visit("/");
  });

  it("Doit permettre à un client de se connecter et d'afficher ses comptes", () => {
    // ÉTAPE 1 : Connexion
    cy.get("[data-cy=login-card]").should("be.visible");
    cy.get("[data-cy=input-client-id]").type("12345678");
    cy.get("[data-cy=input-password]").type("Banque2026!");
    cy.get("[data-cy=btn-login]").click();

    // ÉTAPE 2 : Vérification du Dashboard
    cy.get("[data-cy=top-navbar]").should("be.visible");
    cy.get("[data-cy=user-fullname]").should("contain", "Jean Dupont");
    cy.get("[data-cy=user-current-range]").should("contain", "Gamme Essentiel");

    // ÉTAPE 3 : Vérification de la présence des comptes
    cy.get("[data-cy=accounts-list]").children().should("have.length", 2);
    cy.get("[data-cy=account-label-ACC_COURANT]").should("contain", "Compte Courant");
    cy.get("[data-cy=account-balance-ACC_COURANT]").should("contain", "2450.50 €");
  });

  it("Doit afficher une erreur lors d'une tentative avec de mauvais identifiants", () => {
    cy.get("[data-cy=input-client-id]").type("00000000");
    cy.get("[data-cy=input-password]").type("FauxMotDePasse!");
    cy.get("[data-cy=btn-login]").click();

    cy.get("[data-cy=alert-error]")
      .should("be.visible")
      .and("contain", "Identifiant client ou code secret incorrect");
      
    // Vérifier qu'on est toujours sur la page de login
    cy.get("[data-cy=top-navbar]").should("not.exist");
  });

  it("Doit permettre au client de se déconnecter ", () => {
    // Raccourci pour se connecter rapidement en vue de tester la déconnexion
    cy.get("[data-cy=input-client-id]").type("12345678");
    cy.get("[data-cy=input-password]").type("Banque2026!{enter}"); // {enter} simule la touche Entrée

    // On s'assure d'être connecté
    cy.get("[data-cy=top-navbar]").should("be.visible");

    // On clique sur Déconnexion
    cy.get("[data-cy=btn-logout]").click();

    // On vérifie le retour sur la page de login
    cy.get("[data-cy=login-card]").should("be.visible");
    cy.get("[data-cy=input-client-id]").should("have.value", "");
  });
});