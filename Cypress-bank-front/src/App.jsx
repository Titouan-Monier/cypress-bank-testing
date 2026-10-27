import { useState, useEffect } from "react";
import "./App.css";

const API_URL = "http://localhost:8080/api";

export default function App() {
  // Authentification
  const [user, setUser] = useState(null);
  const [clientId, setClientId] = useState("");
  const [password, setPassword] = useState("");

  // Données bancaires
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState("ACCUEIL");
  const [rangeCategoryTab, setRangeCategoryTab] = useState("CARTES");

  // Filtres Historique (Accueil)
  const [txFilter, setTxFilter] = useState("ALL");
  const [txSearch, setTxSearch] = useState("");

  // Formulaire Virement
  const [fromAccountId, setFromAccountId] = useState("ACC_COURANT");
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferMotif, setTransferMotif] = useState("");

  // Formulaire Ajout Bénéficiaire
  const [newBenName, setNewBenName] = useState("");
  const [newBenIban, setNewBenIban] = useState("");

  // Formulaire Souscription Gammes
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [employmentStatus, setEmploymentStatus] = useState("CDI");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Notifications / Alertes
  const [notification, setNotification] = useState(null);

  const showAlert = (type, message) => {
    setNotification({ type, message });
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${API_URL}/dashboard`);
      const data = await res.json();
      setDashboard(data);
      if (data.beneficiaries?.length > 0 && !selectedBeneficiaryId) {
        setSelectedBeneficiaryId(data.beneficiaries[0].id);
      }
    } catch {
      showAlert("error", "Impossible de joindre le serveur bancaire Spring Boot (port 8080).");
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setNotification(null);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("error", data.message || "Erreur d'authentification");
        return;
      }
      setUser(data);
    } catch {
      showAlert("error", "Serveur indisponible. Vérifiez que le Back-End Java tourne sur le port 8080.");
    }
  };

  const handleResetServer = async () => {
    try {
      const res = await fetch(`${API_URL}/reset`, { method: "POST" });
      const data = await res.json();
      await fetchDashboard();
      showAlert("success", data.message);
    } catch {
      showAlert("error", "Erreur lors de la réinitialisation des données.");
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setNotification(null);
    const ben = dashboard?.beneficiaries.find((b) => b.id === selectedBeneficiaryId);

    try {
      const res = await fetch(`${API_URL}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromAccountId,
          toIban: ben ? ben.iban : "",
          beneficiaryName: ben ? ben.name : "Inconnu",
          amount: parseFloat(transferAmount || 0),
          motif: transferMotif,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("error", data.message);
        return;
      }
      showAlert("success", data.message);
      setTransferAmount("");
      setTransferMotif("");
      await fetchDashboard();
    } catch {
      showAlert("error", "Erreur réseau lors de l'exécution du virement.");
    }
  };

  const handleAddBeneficiary = async (e) => {
    e.preventDefault();
    setNotification(null);
    try {
      const res = await fetch(`${API_URL}/beneficiaries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newBenName, iban: newBenIban }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("error", data.message);
        return;
      }
      showAlert("success", data.message);
      setNewBenName("");
      setNewBenIban("");
      await fetchDashboard();
      if (data.data?.beneficiary?.id) {
        setSelectedBeneficiaryId(data.data.beneficiary.id);
      }
    } catch {
      showAlert("error", "Erreur réseau lors de l'ajout du bénéficiaire.");
    }
  };

  const handleSubscribe = async (e) => {
    e.preventDefault();
    setNotification(null);
    if (!selectedOffer) return;

    try {
      const res = await fetch(`${API_URL}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: selectedOffer.id,
          monthlyIncome: parseFloat(monthlyIncome || 0),
          employmentStatus,
          acceptTerms,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showAlert("error", data.message);
        return;
      }
      showAlert("success", data.message);
      setSelectedOffer(null);
      setMonthlyIncome("");
      setAcceptTerms(false);
      await fetchDashboard();
    } catch {
      showAlert("error", "Erreur lors de la demande de souscription.");
    }
  };

  // ==========================================
  // VUE 1 : PAGE DE CONNEXION
  // ==========================================
  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card" data-cy="login-card">
          <div className="bank-logo">
            <span className="logo-icon">🏦</span>
            <div>
              <h1 data-cy="app-title">Cypress Bank Testing</h1>
              <p>Portail d&apos;entraînement E2E & Automatisation Bancaire</p>
            </div>
          </div>

          {notification && (
            <div
              className={`alert ${notification.type === "error" ? "alert-error" : "alert-success"}`}
              data-cy={`alert-${notification.type}`}
            >
              {notification.message}
            </div>
          )}

          <form onSubmit={handleLogin} data-cy="login-form">
            <div className="form-group">
              <label htmlFor="clientId">Identifiant Client (8 chiffres)</label>
              <input
                id="clientId"
                data-cy="input-client-id"
                type="text"
                placeholder="Ex: 12345678"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Code Secret</label>
              <input
                id="password"
                data-cy="input-password"
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary full-width" data-cy="btn-login">
              Accéder à mes comptes
            </button>
          </form>

          <div className="credentials-hint" data-cy="credentials-hint">
            <strong>Jeu de données QA :</strong>
            <div>Identifiant : <code>12345678</code></div>
            <div>Code secret : <code>Banque2026!</code></div>
          </div>
        </div>
      </div>
    );
  }

  // Filtrage des opérations sur l'accueil
  const filteredTransactions = (dashboard?.transactions || []).filter((tx) => {
    const matchesType = txFilter === "ALL" || tx.type === txFilter;
    const matchesSearch =
      tx.label.toLowerCase().includes(txSearch.toLowerCase()) ||
      tx.category.toLowerCase().includes(txSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  // ==========================================
  // VUE 2 : ESPACE CLIENT AUTHENTIFIÉ
  // ==========================================
  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="top-navbar" data-cy="top-navbar">
        <div className="brand">
          <span className="logo-icon">🏦</span>
          <div>
            <h2>Cypress Bank Testing</h2>
            <span className="subtitle">Environnement de Recette QA</span>
          </div>
        </div>

        <div className="user-info">
          <span className="badge-range" data-cy="user-current-range">
            {dashboard?.currentRange || user.currentRange}
          </span>
          <span className="client-name" data-cy="user-fullname">
            👤 {user.fullName} ({user.clientId})
          </span>
          <button
            className="btn-outline"
            data-cy="btn-reset-data"
            onClick={handleResetServer}
            title="Réinitialise les comptes pour rejouer les tests Cypress"
          >
            🔄 Reset DB
          </button>
          <button
            className="btn-danger"
            data-cy="btn-logout"
            onClick={() => {
              setUser(null);
              setNotification(null);
            }}
          >
            Déconnexion
          </button>
        </div>
      </header>

      {/* ONGLET DE NAVIGATION */}
      <nav className="main-tabs" data-cy="main-navigation">
        <button
          className={activeTab === "ACCUEIL" ? "tab-btn active" : "tab-btn"}
          data-cy="nav-accueil"
          onClick={() => {
            setActiveTab("ACCUEIL");
            setNotification(null);
          }}
        >
          📊 Synthèse & Comptes
        </button>
        <button
          className={activeTab === "VIREMENTS" ? "tab-btn active" : "tab-btn"}
          data-cy="nav-virements"
          onClick={() => {
            setActiveTab("VIREMENTS");
            setNotification(null);
          }}
        >
          💸 Virements & Bénéficiaires
        </button>
        <button
          className={activeTab === "GAMMES" ? "tab-btn active" : "tab-btn"}
          data-cy="nav-gammes"
          onClick={() => {
            setActiveTab("GAMMES");
            setNotification(null);
          }}
        >
          💳 Souscription aux Gammes
        </button>
      </nav>

      {/* BANNIÈRE DE NOTIFICATION */}
      <main className="main-content">
        {notification && (
          <div
            className={`alert ${notification.type === "error" ? "alert-error" : "alert-success"}`}
            data-cy={`alert-${notification.type}`}
          >
            <span>{notification.message}</span>
            <button
              className="close-alert"
              data-cy="btn-close-alert"
              onClick={() => setNotification(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* ==========================================
            ONGLET 1 : ACCUEIL & SYNTHÈSE DES COMPTES
           ========================================== */}
        {activeTab === "ACCUEIL" && dashboard && (
          <div data-cy="view-accueil">
            <section className="section-block">
              <h3>Mes Comptes Bancaires</h3>
              <div className="accounts-grid" data-cy="accounts-list">
                {dashboard.accounts.map((acc) => (
                  <div key={acc.id} className="account-card" data-cy={`account-card-${acc.id}`}>
                    <div className="account-card-header">
                      <span className="account-type-tag">{acc.type}</span>
                      <h4 data-cy={`account-label-${acc.id}`}>{acc.label}</h4>
                    </div>
                    <p className="account-iban" data-cy={`account-iban-${acc.id}`}>
                      {acc.iban}
                    </p>
                    <div className="account-balance" data-cy={`account-balance-${acc.id}`}>
                      {acc.balance.toFixed(2)} €
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="transactions-header">
                <h3>Dernières Opérations</h3>
                <div className="filters-bar">
                  <input
                    type="text"
                    placeholder="Rechercher une opération..."
                    data-cy="input-search-tx"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                  />
                  <select
                    data-cy="select-filter-tx"
                    value={txFilter}
                    onChange={(e) => setTxFilter(e.target.value)}
                  >
                    <option value="ALL">Toutes les opérations</option>
                    <option value="DEBIT">Débits uniquement</option>
                    <option value="CREDIT">Crédits uniquement</option>
                  </select>
                </div>
              </div>

              <table className="tx-table" data-cy="transactions-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Libellé de l&apos;opération</th>
                    <th>Catégorie</th>
                    <th className="text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="empty-row" data-cy="tx-empty">
                        Aucune opération ne correspond à votre recherche.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.id} data-cy="transaction-row">
                        <td>{tx.date}</td>
                        <td data-cy="tx-label">{tx.label}</td>
                        <td>
                          <span className="category-pill">{tx.category}</span>
                        </td>
                        <td
                          data-cy="tx-amount"
                          className={`text-right font-bold ${
                            tx.amount < 0 ? "amount-negative" : "amount-positive"
                          }`}
                        >
                          {tx.amount > 0 ? `+${tx.amount.toFixed(2)}` : tx.amount.toFixed(2)} €
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          </div>
        )}

        {/* ==========================================
            ONGLET 2 : VIREMENTS SEPA & BÉNÉFICIAIRES
           ========================================== */}
        {activeTab === "VIREMENTS" && dashboard && (
          <div className="two-columns" data-cy="view-virements">
            <div className="card-panel">
              <h3>Exécuter un Virement SEPA</h3>
              <p className="panel-hint">Plafond autorisé par opération : 3 000,00 €</p>

              <form onSubmit={handleTransfer} data-cy="form-transfer">
                <div className="form-group">
                  <label htmlFor="fromAccount">Compte à débiter</label>
                  <select
                    id="fromAccount"
                    data-cy="select-from-account"
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                  >
                    {dashboard.accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.label} ({acc.balance.toFixed(2)} €)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="beneficiary">Compte bénéficiaire</label>
                  <select
                    id="beneficiary"
                    data-cy="select-beneficiary"
                    value={selectedBeneficiaryId}
                    onChange={(e) => setSelectedBeneficiaryId(e.target.value)}
                  >
                    {dashboard.beneficiaries.map((ben) => (
                      <option key={ben.id} value={ben.id}>
                        {ben.name} — {ben.iban}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="amount">Montant du virement (€)</label>
                  <input
                    id="amount"
                    data-cy="input-transfer-amount"
                    type="number"
                    step="0.01"
                    placeholder="Ex: 150.00"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="motif">Motif du virement (optionnel)</label>
                  <input
                    id="motif"
                    data-cy="input-transfer-motif"
                    type="text"
                    placeholder="Ex: Loyer Octobre, Remboursement..."
                    value={transferMotif}
                    onChange={(e) => setTransferMotif(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-primary full-width" data-cy="btn-submit-transfer">
                  Valider le virement
                </button>
              </form>
            </div>

            <div className="card-panel">
              <h3>Ajouter un Bénéficiaire</h3>
              <p className="panel-hint">L&apos;IBAN doit débuter par FR76 (14 caractères minimum).</p>

              <form onSubmit={handleAddBeneficiary} data-cy="form-beneficiary">
                <div className="form-group">
                  <label htmlFor="benName">Nom / Raison sociale du bénéficiaire</label>
                  <input
                    id="benName"
                    data-cy="input-ben-name"
                    type="text"
                    placeholder="Ex: Marie Martin"
                    value={newBenName}
                    onChange={(e) => setNewBenName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="benIban">IBAN (Zone SEPA)</label>
                  <input
                    id="benIban"
                    data-cy="input-ben-iban"
                    type="text"
                    placeholder="FR76 3000 4000 ..."
                    value={newBenIban}
                    onChange={(e) => setNewBenIban(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn-secondary full-width" data-cy="btn-add-beneficiary">
                  Enregistrer le bénéficiaire
                </button>
              </form>

              <div className="beneficiaries-list" data-cy="beneficiaries-list">
                <h4>Bénéficiaires enregistrés ({dashboard.beneficiaries.length})</h4>
                <ul>
                  {dashboard.beneficiaries.map((b) => (
                    <li key={b.id} data-cy="beneficiary-item">
                      <strong>{b.name}</strong>
                      <span>{b.iban}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            ONGLET 3 : SOUSCRIPTION AUX GAMMES
           ========================================== */}
        {activeTab === "GAMMES" && dashboard && (
          <div data-cy="view-gammes">
            <div className="sub-tabs" data-cy="sub-tabs-gammes">
              <button
                className={rangeCategoryTab === "CARTES" ? "sub-tab active" : "sub-tab"}
                data-cy="subtab-cartes"
                onClick={() => {
                  setRangeCategoryTab("CARTES");
                  setSelectedOffer(null);
                }}
              >
                💳 Gammes de Cartes Bancaires
              </button>
              <button
                className={rangeCategoryTab === "EPARGNE" ? "sub-tab active" : "sub-tab"}
                data-cy="subtab-epargne"
                onClick={() => {
                  setRangeCategoryTab("EPARGNE");
                  setSelectedOffer(null);
                }}
              >
                🌱 Livrets & Épargne Financière
              </button>
            </div>

            <div className="offers-grid" data-cy="offers-grid">
              {dashboard.offers
                .filter((offer) => offer.category === rangeCategoryTab)
                .map((offer) => {
                  const isCurrentCard =
                    offer.category === "CARTES" && dashboard.currentRange === offer.name;

                  return (
                    <div
                      key={offer.id}
                      className={`offer-card ${selectedOffer?.id === offer.id ? "selected" : ""}`}
                      data-cy={`offer-card-${offer.id}`}
                    >
                      <div
                        className="offer-header"
                        style={{ borderTop: `5px solid ${offer.badgeColor}` }}
                      >
                        <h4 data-cy={`offer-title-${offer.id}`}>{offer.name}</h4>
                        <div className="offer-price" data-cy={`offer-price-${offer.id}`}>
                          {offer.monthlyFee === 0
                            ? "Gratuit"
                            : `${offer.monthlyFee.toFixed(2)} € / mois`}
                        </div>
                        <div className="offer-condition">
                          {offer.minIncome === 0
                            ? "Sans condition de revenus"
                            : `Revenus nets min. : ${offer.minIncome} € / mois`}
                        </div>
                      </div>

                      <ul className="offer-features">
                        {offer.features.map((feat, i) => (
                          <li key={i}>✓ {feat}</li>
                        ))}
                      </ul>

                      {isCurrentCard ? (
                        <button
                          className="btn-disabled full-width"
                          disabled
                          data-cy={`btn-offer-active-${offer.id}`}
                        >
                          Gamme actuellement détenue
                        </button>
                      ) : (
                        <button
                          className="btn-primary full-width"
                          data-cy={`btn-select-offer-${offer.id}`}
                          onClick={() => {
                            setSelectedOffer(offer);
                            setNotification(null);
                          }}
                        >
                          Choisir cette offre
                        </button>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* FORMULAIRE D'ÉLIGIBILITÉ ET DE SOUSCRIPTION */}
            {selectedOffer && (
              <div className="subscription-modal-card" data-cy="subscription-form-panel">
                <h3>Dossier de souscription : {selectedOffer.name}</h3>
                <p className="panel-hint">
                  Veuillez compléter vos informations financières pour l&apos;étude d&apos;éligibilité immédiate.
                </p>

                <form onSubmit={handleSubscribe} data-cy="form-subscription">
                  <div className="two-columns">
                    <div className="form-group">
                      <label htmlFor="monthlyIncome">Revenus mensuels nets déclarés (€)</label>
                      <input
                        id="monthlyIncome"
                        data-cy="input-sub-income"
                        type="number"
                        placeholder="Ex: 2500"
                        value={monthlyIncome}
                        onChange={(e) => setMonthlyIncome(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="employmentStatus">Situation professionnelle</label>
                      <select
                        id="employmentStatus"
                        data-cy="select-sub-status"
                        value={employmentStatus}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                      >
                        <option value="CDI">Salarié en CDI / Fonctionnaire</option>
                        <option value="CDD">Salarié en CDD / Intérim</option>
                        <option value="INDEPENDANT">Indépendant / Profession libérale</option>
                        <option value="ETUDIANT">Étudiant / Alternant</option>
                      </select>
                    </div>
                  </div>

                  <div className="checkbox-group">
                    <input
                      id="acceptTerms"
                      data-cy="checkbox-sub-terms"
                      type="checkbox"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                    />
                    <label htmlFor="acceptTerms">
                      Je reconnais avoir pris connaissance et j&apos;accepte les Conditions Générales
                      et Tarifaires associées à l&apos;offre <strong>{selectedOffer.name}</strong>.
                    </label>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-outline"
                      data-cy="btn-cancel-subscription"
                      onClick={() => setSelectedOffer(null)}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      data-cy="btn-confirm-subscription"
                    >
                      Confirmer ma souscription
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}