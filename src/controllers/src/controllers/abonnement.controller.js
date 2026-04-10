const Abonnement = require('../models/Abonnement');
const { PLANS } = require('../models/Abonnement');
const Transaction = require('../models/Transaction');
const waveService = require('../services/wave.service');

// ─── MON ABONNEMENT ────────────────────────────────────────────
exports.monAbonnement = async (req, res) => {
  try {
    let abonnement = await Abonnement.findOne({ freelance: req.utilisateur._id });

    // Créer un abonnement gratuit si inexistant
    if (!abonnement) {
      abonnement = await Abonnement.create({
        freelance: req.utilisateur._id,
        plan: 'gratuit',
        statut: 'essai',
      });
    }

    res.status(200).json({
      statut: 'succès',
      data: {
        abonnement,
        plans: PLANS,
        estActif: abonnement.estActif,
        joursRestants: abonnement.joursRestants,
      },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── LISTE DES PLANS ───────────────────────────────────────────
exports.listePlans = (req, res) => {
  res.status(200).json({ statut: 'succès', data: { plans: PLANS } });
};

// ─── SOUSCRIRE À UN PLAN ───────────────────────────────────────
exports.souscrire = async (req, res) => {
  try {
    const { plan, operateur, numeroWave } = req.body;

    if (!PLANS[plan]) {
      return res.status(400).json({ statut: 'erreur', message: 'Plan invalide' });
    }

    const planInfo = PLANS[plan];

    // Plan gratuit — pas de paiement
    if (planInfo.prix === 0) {
      const abonnement = await Abonnement.findOneAndUpdate(
        { freelance: req.utilisateur._id },
        { plan: 'gratuit', statut: 'essai', dateEssaiFin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
        { upsert: true, new: true }
      );
      return res.status(200).json({ statut: 'succès', data: { abonnement }, message: 'Plan gratuit activé' });
    }

    if (!operateur || !numeroWave) {
      return res.status(400).json({ statut: 'erreur', message: 'Opérateur et numéro Wave requis' });
    }

    // Créer la transaction
    const transaction = new Transaction({
      freelance: req.utilisateur._id,
      operateur,
      numeroPayeur: numeroWave,
      montant: planInfo.prix,
      description: `Abonnement FreelanceHub ${planInfo.nom} — 1 mois`,
      statut: 'en_attente',
    });

    // Paiement sandbox ou production
    const SANDBOX = !process.env.WAVE_API_KEY;
    let resultat;

    if (SANDBOX) {
      resultat = await waveService.sandboxPaiement({
        montant: planInfo.prix,
        reference: `ABO-${Date.now()}`,
        numeroPayeur: numeroWave,
      });
      transaction.waveCheckoutId = resultat.checkoutId;
    } else {
      resultat = await waveService.creerSessionPaiement({
        montant: planInfo.prix,
        reference: `ABO-${Date.now()}`,
        description: `Abonnement ${planInfo.nom}`,
      });
      transaction.waveCheckoutId = resultat.checkoutId;
    }

    if (resultat.succes && (resultat.statut === 'succeeded' || resultat.statut === 'SUCCESS')) {
      transaction.statut = 'succes';
      transaction.dateConfirmation = new Date();
      await transaction.save();

      // Activer l'abonnement
      const dateFin = new Date();
      dateFin.setMonth(dateFin.getMonth() + 1);

      const abonnement = await Abonnement.findOneAndUpdate(
        { freelance: req.utilisateur._id },
        {
          plan,
          statut: 'actif',
          dateDebut: new Date(),
          dateFin,
          transactionId: transaction._id,
          $push: {
            historiquesPaiements: {
              date: new Date(),
              montant: planInfo.prix,
              operateur,
              statut: 'succes',
              transactionId: transaction._id,
            },
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        statut: 'succès',
        sandbox: SANDBOX,
        data: { abonnement },
        message: `Abonnement ${planInfo.nom} activé avec succès !`,
        dateFin,
      });
    } else {
      transaction.statut = 'echoue';
      await transaction.save();
      return res.status(400).json({
        statut: 'erreur',
        message: resultat.erreur || 'Paiement échoué',
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── ANNULER L'ABONNEMENT ──────────────────────────────────────
exports.annuler = async (req, res) => {
  try {
    const abonnement = await Abonnement.findOneAndUpdate(
      { freelance: req.utilisateur._id },
      { renouvellementAuto: false, statut: 'annule' },
      { new: true }
    );
    res.status(200).json({ statut: 'succès', data: { abonnement }, message: 'Abonnement annulé' });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── HISTORIQUE PAIEMENTS ──────────────────────────────────────
exports.historique = async (req, res) => {
  try {
    const abonnement = await Abonnement.findOne({ freelance: req.utilisateur._id });
    res.status(200).json({
      statut: 'succès',
      data: { historique: abonnement?.historiquesPaiements || [] },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};
