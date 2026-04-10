const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');
const Project = require('../models/Project');
const waveService = require('../services/wave.service');
const orangeService = require('../services/orange.service');

const SANDBOX = !process.env.WAVE_API_KEY; // mode sandbox si pas de clé

// ─── INITIER UN PAIEMENT ──────────────────────────────────
exports.initierPaiement = async (req, res) => {
  try {
    const { montant, operateur, numeroPayeur, factureId, projetId, description } = req.body;

    if (!montant || !operateur || !numeroPayeur) {
      return res.status(400).json({ statut: 'erreur', message: 'Montant, opérateur et numéro requis' });
    }

    // Créer la transaction en base
    const transaction = new Transaction({
      freelance: req.utilisateur._id,
      facture: factureId || undefined,
      projet: projetId || undefined,
      operateur,
      numeroPayeur,
      montant,
      description: description || 'Paiement FreelanceHub',
      statut: 'en_attente',
    });

    const reference = `FLH-${Date.now()}-${transaction._id.toString().slice(-6)}`;

    let resultat;

    if (SANDBOX) {
      // Mode sandbox
      if (operateur === 'wave') {
        resultat = await waveService.sandboxPaiement({ montant, reference, numeroPayeur });
        transaction.waveCheckoutId = resultat.checkoutId;
      } else {
        resultat = await orangeService.sandboxPaiement({ montant, reference });
        transaction.orangePayToken = resultat.payToken;
      }
    } else {
      // Mode production
      if (operateur === 'wave') {
        resultat = await waveService.creerSessionPaiement({
          montant,
          reference,
          description,
          urlSucces: `${process.env.FRONTEND_URL}/paiement/succes?tx=${transaction._id}`,
          urlEchec: `${process.env.FRONTEND_URL}/paiement/echec?tx=${transaction._id}`,
        });
        transaction.waveCheckoutId = resultat.checkoutId;
      } else {
        resultat = await orangeService.initierPaiement({ montant, numeroPayeur, reference, description });
        transaction.orangePayToken = resultat.payToken;
      }
    }

    // Mettre à jour la transaction selon le résultat
    if (resultat.succes) {
      if (resultat.statut === 'succeeded' || resultat.statut === 'SUCCESS') {
        transaction.statut = 'succes';
        transaction.dateConfirmation = new Date();

        // Mettre à jour la facture si liée
        if (factureId) {
          await Invoice.findByIdAndUpdate(factureId, {
            statut: 'payee',
            datePaiement: new Date(),
            transactionId: transaction._id,
          });
        }

        // Mettre à jour le projet si lié
        if (projetId) {
          await Project.findByIdAndUpdate(projetId, {
            $inc: { montantPaye: montant },
          });
        }
      } else {
        transaction.statut = 'en_cours';
      }
    } else {
      transaction.statut = 'echoue';
    }

    await transaction.save();

    res.status(200).json({
      statut: resultat.succes ? 'succès' : 'erreur',
      sandbox: SANDBOX,
      transaction: {
        id: transaction._id,
        statut: transaction.statut,
        montant: transaction.montant,
        frais: transaction.frais,
        montantNet: transaction.montantNet,
        operateur,
      },
      waveUrl: resultat.waveUrl || null,
      paymentUrl: resultat.paymentUrl || null,
      message: resultat.message || (resultat.succes ? 'Paiement initié' : resultat.erreur),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── VÉRIFIER UN PAIEMENT ─────────────────────────────────
exports.verifierPaiement = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      freelance: req.utilisateur._id,
    });

    if (!transaction) return res.status(404).json({ statut: 'erreur', message: 'Transaction introuvable' });

    res.status(200).json({ statut: 'succès', data: { transaction } });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── MES TRANSACTIONS ─────────────────────────────────────
exports.mesTransactions = async (req, res) => {
  try {
    const { page = 1, limite = 20, operateur } = req.query;
    const filtre = { freelance: req.utilisateur._id };
    if (operateur) filtre.operateur = operateur;

    const transactions = await Transaction.find(filtre)
      .populate('facture', 'numero total')
      .populate('projet', 'titre')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limite)
      .limit(Number(limite));

    const total = await Transaction.countDocuments(filtre);

    // Stats
    const stats = await Transaction.aggregate([
      { $match: { freelance: req.utilisateur._id } },
      {
        $group: {
          _id: '$statut',
          count: { $sum: 1 },
          totalMontant: { $sum: '$montant' },
          totalNet: { $sum: '$montantNet' },
        },
      },
    ]);

    res.status(200).json({
      statut: 'succès',
      total,
      data: { transactions, stats },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── WEBHOOK WAVE ─────────────────────────────────────────
exports.webhookWave = async (req, res) => {
  try {
    const { id: checkoutId, payment_status, payment_reference } = req.body;

    const transaction = await Transaction.findOne({ waveCheckoutId: checkoutId });
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    transaction.statut = payment_status === 'succeeded' ? 'succes' : 'echoue';
    transaction.webhookRecu = true;
    transaction.webhookData = req.body;

    if (payment_status === 'succeeded') {
      transaction.dateConfirmation = new Date();

      if (transaction.facture) {
        await Invoice.findByIdAndUpdate(transaction.facture, {
          statut: 'payee', datePaiement: new Date(), transactionId: transaction._id,
        });
      }
      if (transaction.projet) {
        await Project.findByIdAndUpdate(transaction.projet, {
          $inc: { montantPaye: transaction.montant },
        });
      }
    }

    await transaction.save();
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── WEBHOOK ORANGE MONEY ─────────────────────────────────
exports.webhookOrange = async (req, res) => {
  try {
    const { pay_token, status } = req.body;

    const transaction = await Transaction.findOne({ orangePayToken: pay_token });
    if (!transaction) return res.status(404).json({ message: 'Transaction non trouvée' });

    transaction.statut = status === 'SUCCESS' ? 'succes' : 'echoue';
    transaction.webhookRecu = true;
    transaction.webhookData = req.body;

    if (status === 'SUCCESS') {
      transaction.dateConfirmation = new Date();
      if (transaction.facture) {
        await Invoice.findByIdAndUpdate(transaction.facture, {
          statut: 'payee', datePaiement: new Date(),
        });
      }
    }

    await transaction.save();
    res.status(200).json({ received: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
