# Cypress Bank Testing - POC Bancaire & Banc de Test E2E

## 1. Présentation du Projet

**Cypress Bank Testing** est une application web bancaire complète (Full-Stack) conçue comme un démonstrateur technique (POC) et un environnement d'entraînement réaliste pour l'automatisation des tests End-to-End (E2E) et API avec **Cypress**.

L'application reproduit le fonctionnement et les règles de gestion d'un portail client bancaire (consultation des comptes, virements SEPA, gestion des bénéficiaires, souscription à des gammes de cartes et produits d'épargne) tout en intégrant des mécanismes dédiés à la testabilité logicielle (sélecteurs `data-cy` et réinitialisation d'état à la volée).

---

## 2. Architecture Globale du Monorepo

Le projet est organisé en **monorepo** afin de synchroniser les évolutions des règles métier du Back-End, l'interface Front-End et les scripts de test automatisés.

### Arborescence du dépôt

```text
Projet_Bank_Cypress/
├── .github/
│   └── workflows/
│       └── cypress.yml                  # Pipeline CI/CD GitHub Actions
├── Cypress-bank-back/                   # Serveur API REST (Java 17 / Spring Boot 3)
│   ├── pom.xml
│   └── src/main/java/com/cypressbank/
│       └── CypressBankApplication.java  # Contrôleur REST, DTOs et règles métier
├── Cypress-bank-front/                  # Application Cliente (React 18 / Vite) & Tests
│   ├── cypress/
│   │   ├── e2e/
│   │   │   └── bank_login.cy.js         # Suite de tests E2E Cypress
│   │   ├── fixtures/                    # Jeux de données statiques (JSON)
│   │   └── support/                     # Commandes personnalisées (commands.js, e2e.js)
│   ├── src/
│   │   ├── App.jsx                      # Composant principal et logique d'affichage
│   │   ├── App.css                      # Styles de l'interface bancaire
│   │   └── main.jsx                     # Point d'entrée React
│   ├── cypress.config.js                # Configuration de Cypress (baseUrl, timeouts)
│   ├── eslint.config.js                 # Configuration du linter JS/Cypress
│   ├── jsconfig.json                    # Résolution de l'autocomplétion Cypress dans l'IDE
│   └── package.json                     # Dépendances Node.js, React, Vite et Cypress
└── .gitignore                           # Exclusion des fichiers compilés et dépendances
```

### Schéma d'Architecture Système

```text
+-----------------------------------------------------------------------------------+
|                           ENVIRONNEMENT D'EXECUTION                               |
|                                                                                   |
|  +-----------------------------+               +-------------------------------+  |
|  |      FRONT-END (Client)     |   HTTP/JSON   |       BACK-END (Serveur)      |  |
|  |       React 18 + Vite       | ------------> |     Java 17 + Spring Boot 3   |  |
|  |    http://localhost:5173    | <------------ |     http://localhost:8080     |  |
|  +-----------------------------+   API REST    +-------------------------------+  |
|                 ^                                              ^                  |
|                 | Manipulation du DOM                          | Appels directs   |
|                 | Assertions visuelles                         | POST /api/reset  |
|                 | attributs [data-cy=*]                        | Contrôle d'état  |
|                 |                                              |                  |
|  +--------------+----------------------------------------------+---------------+  |
|  |                         MOTEUR D'AUTOMATISATION QA                          |  |
|  |                               Cypress Runner                                |  |
|  |         (Exécution locale interactive ou Headless via GitHub Actions)       |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 3. Architecture Détaillée par Composant

### 3.1. Back-End (Java 17 / Spring Boot 3)

Le serveur expose une API RESTful sur le port `8080`. Dans sa version actuelle de POC initial, la persistance est gérée en mémoire vive (collections Java) pour garantir une exécution instantanée sans dépendance à un moteur de base de données externe.

```text
[Requête HTTP Client]
         |
         v
+-----------------------------------------------------------------------+
| BankController (@RestController - /api)                               |
+-----------------------------------------------------------------------+
| - POST /api/auth/login     -> Vérification identifiant / mot de passe |
| - GET  /api/dashboard      -> Agrégation comptes, opérations, offres  |
| - POST /api/beneficiaries  -> Validation format IBAN (FR76, >=14 car.)|
| - POST /api/transfers      -> Contrôle plafond (3000 EUR) et solde    |
| - POST /api/subscriptions  -> Contrôle éligibilité revenus et CGV     |
| - POST /api/reset          -> Restauration de l'état initial QA       |
+-----------------------------------------------------------------------+
         |
         v
[Réponse HTTP Structurée : 200 OK | 201 Created | 400 | 401 | 409 | 422]
```

**Règles de gestion implémentées :**

- **Authentification** : Validation stricte du couple identifiant (`12345678`) et code secret (`Banque2026!`). Retourne un code `401 Unauthorized` en cas d'échec.
- **Ajout de bénéficiaire** : Vérification de la longueur du nom (minimum 3 caractères), du format IBAN SEPA français (`FR76`, 14 caractères minimum, code `422 Unprocessable Entity` si invalide) et détection des doublons (`409 Conflict`).
- **Virements SEPA** : Interdiction des montants négatifs ou nuls (`400 Bad Request`), blocage au-delà du plafond unitaire de 3 000 EUR (`422 Unprocessable Entity`), vérification de la provision du compte émetteur (`422`), débit du compte source et crédit automatique si le compte cible est un compte interne (ex. : Livret A).
- **Souscription aux gammes** : Vérification de l'acceptation des conditions générales (`400`), contrôle du revenu net mensuel minimum requis par offre (`422`), vérification de non-détention préalable (`409`) et prélèvement de la cotisation ou du versement initial sur le compte courant.

### 3.2. Front-End (React / Vite)

L'application cliente fonctionne sur le port `5173` et s'articule autour de quatre vues logiques pilotées par l'état :

```text
+-----------------------------------------------------------------------+
|                               App.jsx                                 |
+-----------------------------------------------------------------------+
                                   |
         +-------------------------+-------------------------+
         | (Non authentifié)                                 | (Authentifié)
         v                                                   v
+--------------------+                       +--------------------------+
|  Vue Authentif.    |                       |   Espace Client Bancaire |
|  [data-cy=         |                       |   [data-cy=top-navbar]   |
|   login-card]      |                       +--------------------------+
+--------------------+                                       |
                                    +------------------------+------------------------+
                                    |                        |                        |
                                    v                        v                        v
                          +-------------------+    +-------------------+    +-------------------+
                          | Onglet 1: Accueil |    | Onglet 2: Virement|    | Onglet 3: Gammes  |
                          | - Cartes comptes  |    | - Form. SEPA      |    | - Sous-onglets    |
                          | - Filtres Déb/Créd|    | - Ajout Bénéf.    |    |   Cartes / Epargne|
                          | - Recherche texte |    | - Liste Bénéf.    |    | - Dossier éligib. |
                          +-------------------+    +-------------------+    +-------------------+
```

Chaque composant interactif (champs de saisie, boutons, tableaux, alertes, cartes de compte) possède un attribut dédié `data-cy="..."` afin de découpler les tests E2E de la structure CSS ou HTML.

### 3.3. Automatisation QA (Cypress & GitHub Actions)

L'exécution des tests suit un cycle déterministe garantissant l'indépendance de chaque scénario :

```text
+-----------------------------------------------------------------------------+
|                         CYCLE DE VIE D'UN TEST CYPRESS                      |
|                                                                             |
|  1. Hook beforeEach()                                                       |
|     |-- cy.request('POST', 'http://localhost:8080/api/reset')               |
|     +-- cy.visit('/')                                                       |
|                                                                             |
|  2. Action Utilisateur                                                      |
|     |-- Sélection via cy.get('[data-cy=...]')                               |
|     +-- Simulation d'événements (.type(), .click(), .select())              |
|                                                                             |
|  3. Validation & Assertions                                                 |
|     |-- Vérification de l'état du DOM (.should('be.visible'), 'contain')    |
|     +-- Vérification des règles métier (soldes mis à jour, alertes erreur)  |
+-----------------------------------------------------------------------------+
```

**Flux du Pipeline CI (`.github/workflows/cypress.yml`) :**

```text
[Git Push sur main]
        |
        v
[Runner Ubuntu GitHub Actions]
        |
        +--> 1. Checkout du code source (actions/checkout)
        +--> 2. Installation Java 17 & cache Maven (actions/setup-java)
        +--> 3. Démarrage de Spring Boot en tâche de fond (mvn spring-boot:run &)
        +--> 4. Attente active de disponibilité de l'API (wait-on port 8080)
        +--> 5. Installation Node.js 18 & cache npm (actions/setup-node)
        +--> 6. Démarrage de Vite (port 5173) et exécution Headless de Cypress
```

---

## 4. Guide de Démarrage en Local

### Prérequis

- **Java JDK 17** et **Maven**
- **Node.js 18+** et **npm**

### 1. Lancer le Back-End

```bash
cd Cypress-bank-back
mvn spring-boot:run
```

Le serveur API est accessible sur `http://localhost:8080`.

### 2. Lancer le Front-End

```bash
cd Cypress-bank-front
npm install
npm run dev
```

L'interface est accessible sur `http://localhost:5173`.

### 3. Lancer Cypress

```bash
cd Cypress-bank-front
# Mode interactif (interface graphique)
npx cypress open

# Mode console (Headless)
npx cypress run
```

---

## 5. Roadmap du Projet : Vers un POC Industriel Complet

Cette feuille de route recense ce qui a été validé jusqu'à présent et structure le reste à faire pour transformer cette base en un véritable POC de niveau production, tant sur le plan du développement (Back/Front) que de l'ingénierie de test.

### Phase 1 : Socle Technique, Métier et CI (Validé et Opérationnel)

- [x] **Architecture Monorepo & Git** : Initialisation du dépôt unique, aplatissement de l'arborescence et configuration du `.gitignore` pour exclure les binaires Java (`target/`, `.class`), les dépendances (`node_modules/`) et les artefacts Cypress.
- [x] **Back-End Fonctionnel** : Création de l'API Spring Boot intégrant les 6 endpoints principaux et les contrôles métier (authentification, virements, bénéficiaires, souscriptions).
- [x] **Mécanisme de Reset QA** : Implémentation de l'endpoint `POST /api/reset` et du bouton d'interface associé pour restaurer le jeu de données initial.
- [x] **Front-End Bancaire Réactif** : Création des vues React (Connexion, Synthèse des comptes, Filtres d'opérations, Virements SEPA, Souscription aux gammes) avec instrumentation complète via `data-cy`.
- [x] **Initialisation Cypress & Outillage IDE** : Configuration de `cypress.config.js`, `jsconfig.json` et `eslint.config.js` pour la reconnaissance des globales Cypress.
- [x] **Première Suite E2E** : Implémentation et validation de `bank_login.cy.js` (connexion nominale, rejet d'identifiants invalides, déconnexion).
- [x] **Pipeline CI/CD** : Mise en place du workflow GitHub Actions orchestrant le build Java, le serveur React et l'exécution automatique des tests Cypress à chaque `push`.

### Phase 2 : Industrialisation de l'Automatisation Cypress (Court Terme)

- [ ] **Couverture E2E des Virements (`bank_transfers.cy.js`)** :
  - Tester un virement valide entre le Compte Courant et le Livret A (vérifier le débit, le crédit simultané et l'apparition de la ligne dans l'historique).
  - Tester les cas aux limites et erreurs : montant supérieur au plafond de 3 000 EUR (`422`), montant supérieur au solde disponible (`422`), montant négatif ou nul (`400`).
- [ ] **Couverture E2E des Bénéficiaires (`bank_beneficiaries.cy.js`)** :
  - Tester l'ajout d'un bénéficiaire valide suivi d'un virement immédiat vers ce nouveau bénéficiaire.
  - Tester le rejet d'un IBAN ne commençant pas par `FR76` ou trop court (`422`) et le rejet d'un IBAN en doublon (`409`).
- [ ] **Couverture E2E des Souscriptions (`bank_subscriptions.cy.js`)** :
  - Tester le passage de la _Gamme Essentiel_ à la _Gamme Gold Premier_ avec un revenu éligible (>= 1 800 EUR) et vérifier le prélèvement de la cotisation de 12,50 EUR.
  - Tester le refus d'éligibilité pour la _Gamme Prestige Infinite_ avec un revenu inférieur à 4 000 EUR.
  - Tester l'ouverture d'un _LDDS_ et vérifier la création dynamique du troisième compte dans la synthèse.
- [ ] **Commandes Personnalisées (`cypress/support/commands.js`)** :
  - Créer une commande `cy.login(clientId, password)` utilisant `cy.session()` pour mettre en cache la session utilisateur et accélérer l'exécution des tests.
- [ ] **Mocks et Interceptions Réseau (`cy.intercept`)** :
  - Intercepter `POST /api/transfers` pour vérifier le payload JSON envoyé par le Front-End.
  - Simuler une erreur serveur (`statusCode: 500`) et une latence réseau (`delay: 2000`) pour tester la résilience de l'interface.
- [ ] **Structuration en Page Object Model (POM)** :
  - Créer un dossier `cypress/support/pages/` (`LoginPage.js`, `DashboardPage.js`, `TransferPage.js`, `SubscriptionPage.js`) pour centraliser les sélecteurs et les actions métier.
- [ ] **Externalisation des Données (`cypress/fixtures/`)** :
  - Remplacer les valeurs codées en dur dans les tests par des fichiers JSON (`users.json`, `transfers.json`, `beneficiaries.json`).

### Phase 3 : Refonte Back-End vers une Architecture d'Entreprise (Moyen Terme)

- [ ] **Découpage Multi-Couches (Clean / Layered Architecture)** :
  - Séparer le fichier monolithique `CypressBankApplication.java` en packages distincts : `controller`, `service`, `repository`, `model` (Entities), `dto`, et `exception` (`@ControllerAdvice` pour une gestion centralisée des erreurs).
- [ ] **Persistance en Base de Données Relationnelle (Spring Data JPA)** :
  - Intégrer **H2 Database** pour l'environnement de test/CI et **PostgreSQL** pour l'environnement de développement local.
  - Gérer l'initialisation du schéma et des données de référence via **Flyway** ou **Liquibase**.
- [ ] **Sécurité Bancaire Réelle (Spring Security & JWT)** :
  - Remplacer le jeton fictif par une génération et une vérification cryptographique de jetons **JWT** (`io.jsonwebtoken`).
  - Protéger les routes `/api/dashboard`, `/api/transfers`, `/api/beneficiaries` et `/api/subscriptions` via un filtre d'authentification Bearer Token.
- [ ] **Documentation et Tests Back-End** :
  - Intégrer **Springdoc OpenAPI (Swagger UI)** pour documenter et tester les endpoints sur `/swagger-ui.html`.
  - Ajouter des tests unitaires sur la couche Service avec **JUnit 5** et **Mockito**, ainsi que des tests d'intégration de contrôleurs avec **MockMvc**.

### Phase 4 : Évolution Front-End & Ergonomie (Moyen Terme)

- [ ] **Architecture Modulaire & Routage** :
  - Découper `App.jsx` en composants réutilisables (`src/components/`, `src/pages/`, `src/services/api.js`).
  - Intégrer **React Router** pour gérer de vraies URLs (`/login`, `/synthese`, `/virements`, `/souscriptions`) et permettre à Cypress de tester la navigation par URL (`cy.url().should('include', '/virements')`).
- [ ] **Gestion de Session & États de Chargement** :
  - Stocker le jeton JWT dans le `sessionStorage` et l'injecter automatiquement dans les en-têtes HTTP `Authorization`.
  - Ajouter des indicateurs visuels de chargement (`[data-cy=loading-spinner]`) lors des appels API asynchrones.
- [ ] **Fonctionnalités Bancaires Complémentaires** :
  - Ajouter un module de gestion des plafonds de carte bancaire et de mise en opposition temporaire.
  - Ajouter un simulateur de crédit immobilier avec calcul de mensualités et TAEG.

### Phase 5 : Reporting QA & Conteneurisation DevOps (Long Terme)

- [ ] **Rapports de Tests et Artefacts CI** :
  - Intégrer `cypress-mochawesome-reporter` pour générer un rapport HTML détaillé à chaque exécution de la CI.
  - Configurer `.github/workflows/cypress.yml` avec `actions/upload-artifact` pour conserver les captures d'écran et vidéos en cas d'échec d'un test sur GitHub.
- [ ] **Conteneurisation Docker** :
  - Créer un `Dockerfile` pour le Back-End Spring Boot, un `Dockerfile` pour le Front-End React (servi par Nginx) et un fichier `docker-compose.yml` à la racine pour lancer l'infrastructure complète en une seule commande.
