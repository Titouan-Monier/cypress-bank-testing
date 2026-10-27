package com.cypressbank;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;

@SpringBootApplication
public class CypressBankApplication {
    public static void main(String[] args) {
        SpringApplication.run(CypressBankApplication.class, args);
    }
}

// ==========================================
// MODÈLES DE DONNÉES & DTOs (Java 17 Records)
// ==========================================
record LoginRequest(String clientId, String password) {}
record AuthResponse(String clientId, String fullName, String currentRange, String token) {}
record Account(String id, String label, String iban, double balance, String type) {}
record Transaction(String id, String date, String label, String category, double amount, String type) {}
record Beneficiary(String id, String name, String iban) {}
record OfferRange(String id, String category, String name, double monthlyFee, double minIncome, List<String> features, String badgeColor) {}

record TransferRequest(String fromAccountId, String toIban, String beneficiaryName, double amount, String motif) {}
record BeneficiaryRequest(String name, String iban) {}
record SubscriptionRequest(String offerId, double monthlyIncome, String employmentStatus, boolean acceptTerms) {}
record ApiError(String code, String message) {}
record ApiSuccess(String message, Map<String, Object> data) {}

// ==========================================
// CONTRÔLEUR REST & LOGIQUE MÉTIER BANCAIRE
// ==========================================
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
class BankController {

    private String currentRange = "Gamme Essentiel";
    private final List<Account> accounts = new ArrayList<>();
    private final List<Transaction> transactions = new ArrayList<>();
    private final List<Beneficiary> beneficiaries = new ArrayList<>();
    private final List<OfferRange> offers = new ArrayList<>();

    public BankController() {
        initOffers();
        resetData();
    }

    private void initOffers() {
        offers.add(new OfferRange(
                "CARTE_ESSENTIEL", "CARTES", "Gamme Essentiel", 0.0, 0.0,
                List.of("Carte Visa Classic à autorisation systématique", "Plafond de paiement : 1 500 € / 30j", "Virements SEPA gratuits"),
                "#64748b"
        ));
        offers.add(new OfferRange(
                "CARTE_GOLD", "CARTES", "Gamme Gold Premier", 12.50, 1800.0,
                List.of("Carte Visa Premier (Débit immédiat ou différé)", "Plafond de paiement : 5 000 € / 30j", "Assurances voyage & neige incluses", "Retraits gratuits en zone Euro"),
                "#d97706"
        ));
        offers.add(new OfferRange(
                "CARTE_INFINITE", "CARTES", "Gamme Prestige Infinite", 29.90, 4000.0,
                List.of("Carte Visa Infinite Métal", "Plafond de paiement : 15 000 € / 30j", "Service de conciergerie 24/7", "Exonération totale des frais à l'étranger"),
                "#1e293b"
        ));
        offers.add(new OfferRange(
                "EPARGNE_LDDS", "EPARGNE", "Livret Développement Durable (LDDS)", 0.0, 0.0,
                List.of("Taux net garanti : 3,00 %", "Plafond de dépôt : 12 000 €", "Intérêts exonérés d'impôt sur le revenu", "Versement initial de 50 € prélevé à l'ouverture"),
                "#059669"
        ));
        offers.add(new OfferRange(
                "EPARGNE_AV", "EPARGNE", "Assurance Vie Patrimoine+", 0.0, 1500.0,
                List.of("Fonds en euros sécurisé + Unités de Compte", "Versement initial de 200 € prélevé à l'ouverture", "Gestion pilotée par nos experts", "Fiscalité avantageuse après 8 ans"),
                "#2563eb"
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<ApiSuccess> resetData() {
        this.currentRange = "Gamme Essentiel";
        accounts.clear();
        transactions.clear();
        beneficiaries.clear();

        accounts.add(new Account("ACC_COURANT", "Compte Courant Particulier", "FR76 3000 4000 0100 0012 3456 789", 2450.50, "COURANT"));
        accounts.add(new Account("ACC_LIVRET_A", "Livret A", "FR76 3000 4000 0100 0098 7654 321", 8500.00, "EPARGNE"));

        transactions.add(new Transaction(UUID.randomUUID().toString(), LocalDate.now().minusDays(1).toString(), "Carrefour Hypermarché", "Alimentation", -84.20, "DEBIT"));
        transactions.add(new Transaction(UUID.randomUUID().toString(), LocalDate.now().minusDays(3).toString(), "Virement Salaire CapTech", "Revenus", 2650.00, "CREDIT"));
        transactions.add(new Transaction(UUID.randomUUID().toString(), LocalDate.now().minusDays(5).toString(), "Prélèvement EDF Énergie", "Logement", -95.30, "DEBIT"));
        transactions.add(new Transaction(UUID.randomUUID().toString(), LocalDate.now().minusDays(8).toString(), "SNCF Connect", "Transports", -49.00, "DEBIT"));

        beneficiaries.add(new Beneficiary("BEN_1", "Propriétaire Agence Immo", "FR76 1009 6000 5000 0123 4567 890"));
        beneficiaries.add(new Beneficiary("BEN_2", "Livret A (Compte Interne)", "FR76 3000 4000 0100 0098 7654 321"));

        return ResponseEntity.ok(new ApiSuccess("Les données du serveur bancaire ont été réinitialisées.", Map.of()));
    }

    @PostMapping("/auth/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        if (req.clientId() == null || req.password() == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_AUTH_EMPTY", "Veuillez renseigner votre identifiant et votre code secret."));
        }
        if ("12345678".equals(req.clientId().trim()) && "Banque2026!".equals(req.password())) {
            return ResponseEntity.ok(new AuthResponse("12345678", "Jean Dupont", currentRange, "jwt-mock-token-cypress-bank-2026"));
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ApiError("ERR_AUTH_INVALID", "Identifiant client ou code secret incorrect."));
    }

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboard() {
        Map<String, Object> response = new HashMap<>();
        response.put("clientName", "Jean Dupont");
        response.put("clientId", "12345678");
        response.put("currentRange", currentRange);
        response.put("accounts", accounts);
        response.put("transactions", transactions);
        response.put("beneficiaries", beneficiaries);
        response.put("offers", offers);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/beneficiaries")
    public ResponseEntity<?> addBeneficiary(@RequestBody BeneficiaryRequest req) {
        if (req.name() == null || req.name().trim().length() < 3) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_BEN_NAME", "Le nom du bénéficiaire doit contenir au moins 3 caractères."));
        }
        String cleanIban = req.iban() == null ? "" : req.iban().replaceAll("\\s+", "").toUpperCase();
        if (!cleanIban.startsWith("FR76") || cleanIban.length() < 14) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("ERR_IBAN_FORMAT", "Format IBAN invalide. L'IBAN doit commencer par FR76 et contenir au moins 14 caractères."));
        }
        boolean exists = beneficiaries.stream()
                .anyMatch(b -> b.iban().replaceAll("\\s+", "").equalsIgnoreCase(cleanIban));
        if (exists) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("ERR_BEN_EXISTS", "Un bénéficiaire avec cet IBAN est déjà enregistré."));
        }

        Beneficiary newBen = new Beneficiary("BEN_" + (beneficiaries.size() + 1), req.name().trim(), req.iban().trim().toUpperCase());
        beneficiaries.add(newBen);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiSuccess("Bénéficiaire ajouté avec succès.", Map.of("beneficiary", newBen)));
    }

    @PostMapping("/transfers")
    public ResponseEntity<?> executeTransfer(@RequestBody TransferRequest req) {
        if (req.amount() <= 0) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_AMOUNT_INVALID", "Le montant du virement doit être strictement supérieur à 0 €."));
        }
        if (req.amount() > 3000) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("ERR_TRANSFER_LIMIT", "Plafond dépassé : les virements en ligne sont limités à 3 000 € par opération."));
        }
        if (req.toIban() == null || req.toIban().trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_DEST_MISSING", "Veuillez sélectionner un bénéficiaire valide."));
        }

        int sourceIdx = -1;
        for (int i = 0; i < accounts.size(); i++) {
            if (accounts.get(i).id().equals(req.fromAccountId())) {
                sourceIdx = i;
                break;
            }
        }
        if (sourceIdx == -1) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_ACC_NOT_FOUND", "Compte émetteur introuvable."));
        }

        Account sourceAcc = accounts.get(sourceIdx);
        if (sourceAcc.balance() < req.amount()) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("ERR_INSUFFICIENT_FUNDS", "Solde insuffisant sur le compte sélectionné pour effectuer ce virement."));
        }

        // Débit du compte émetteur
        double newBalance = Math.round((sourceAcc.balance() - req.amount()) * 100.0) / 100.0;
        accounts.set(sourceIdx, new Account(sourceAcc.id(), sourceAcc.label(), sourceAcc.iban(), newBalance, sourceAcc.type()));

        // Si le bénéficiaire est un compte interne (ex: Livret A), on le crédite aussi
        String cleanDestIban = req.toIban().replaceAll("\\s+", "");
        for (int i = 0; i < accounts.size(); i++) {
            Account acc = accounts.get(i);
            if (acc.iban().replaceAll("\\s+", "").equalsIgnoreCase(cleanDestIban)) {
                double creditedBalance = Math.round((acc.balance() + req.amount()) * 100.0) / 100.0;
                accounts.set(i, new Account(acc.id(), acc.label(), acc.iban(), creditedBalance, acc.type()));
            }
        }

        String motifLabel = (req.motif() == null || req.motif().trim().isEmpty()) ? "Virement SEPA" : req.motif().trim();
        Transaction tx = new Transaction(
                UUID.randomUUID().toString(),
                LocalDate.now().toString(),
                "Virement vers " + req.beneficiaryName() + " (" + motifLabel + ")",
                "Virement",
                -req.amount(),
                "DEBIT"
        );
        transactions.add(0, tx);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiSuccess("Virement de " + String.format("%.2f", req.amount()) + " € exécuté avec succès.", Map.of("transaction", tx)));
    }

    @PostMapping("/subscriptions")
    public ResponseEntity<?> subscribeOffer(@RequestBody SubscriptionRequest req) {
        if (!req.acceptTerms()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_CGV_NOT_ACCEPTED", "Vous devez accepter les Conditions Générales Bancaires pour souscrire."));
        }

        Optional<OfferRange> offerOpt = offers.stream().filter(o -> o.id().equals(req.offerId())).findFirst();
        if (offerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new ApiError("ERR_OFFER_NOT_FOUND", "Offre bancaire introuvable."));
        }

        OfferRange offer = offerOpt.get();

        // Vérification d'éligibilité sur les revenus
        if (req.monthlyIncome() < offer.minIncome()) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError(
                            "ERR_INCOME_TOO_LOW",
                            "Éligibilité refusée : l'offre '" + offer.name() + "' requiert un revenu mensuel net minimum de " + (int) offer.minIncome() + " €."
                    ));
        }

        // Cas 1 : Changement de gamme de carte bancaire
        if ("CARTES".equals(offer.category())) {
            if (this.currentRange.equalsIgnoreCase(offer.name())) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(new ApiError("ERR_ALREADY_SUBSCRIBED", "Vous êtes déjà titulaire de la " + offer.name() + "."));
            }
            this.currentRange = offer.name();
            if (offer.monthlyFee() > 0) {
                Account courant = accounts.get(0);
                double updatedBalance = Math.round((courant.balance() - offer.monthlyFee()) * 100.0) / 100.0;
                accounts.set(0, new Account(courant.id(), courant.label(), courant.iban(), updatedBalance, courant.type()));
                transactions.add(0, new Transaction(
                        UUID.randomUUID().toString(),
                        LocalDate.now().toString(),
                        "Cotisation 1er mois - " + offer.name(),
                        "Frais bancaires",
                        -offer.monthlyFee(),
                        "DEBIT"
                ));
            }
            return ResponseEntity.ok(new ApiSuccess(
                    "Félicitations ! Votre souscription à la " + offer.name() + " est active.",
                    Map.of("currentRange", this.currentRange)
            ));
        }

        // Cas 2 : Ouverture d'un produit d'épargne
        boolean alreadyHasAccount = accounts.stream().anyMatch(a -> a.label().equalsIgnoreCase(offer.name()));
        if (alreadyHasAccount) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(new ApiError("ERR_ACCOUNT_EXISTS", "Vous détenez déjà le contrat '" + offer.name() + "'."));
        }

        double initialDeposit = "EPARGNE_AV".equals(offer.id()) ? 200.0 : 50.0;
        Account courant = accounts.get(0);
        if (courant.balance() < initialDeposit) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY)
                    .body(new ApiError("ERR_INSUFFICIENT_DEPOSIT", "Solde insuffisant sur votre compte courant pour le versement initial de " + (int) initialDeposit + " €."));
        }

        // Prélèvement du versement initial et création du nouveau compte d'épargne
        double updatedBalance = Math.round((courant.balance() - initialDeposit) * 100.0) / 100.0;
        accounts.set(0, new Account(courant.id(), courant.label(), courant.iban(), updatedBalance, courant.type()));

        String newIban = "FR76 3000 4000 0100 0055 5555 " + (100 + accounts.size());
        Account newSavings = new Account("ACC_" + offer.id(), offer.name(), newIban, initialDeposit, "EPARGNE");
        accounts.add(newSavings);

        transactions.add(0, new Transaction(
                UUID.randomUUID().toString(),
                LocalDate.now().toString(),
                "Versement initial ouverture - " + offer.name(),
                "Épargne",
                -initialDeposit,
                "DEBIT"
        ));

        return ResponseEntity.status(HttpStatus.CREATED).body(new ApiSuccess(
                "Ouverture du contrat '" + offer.name() + "' validée avec un versement initial de " + (int) initialDeposit + " €.",
                Map.of("newAccount", newSavings)
        ));
    }
}