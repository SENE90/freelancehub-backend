const Abonnement = require('../models/Abonnement');
const { PLANS } = require('../models/Abonnement');
const Transaction = require('../models/Transaction');
const waveService = require('../services/wave.service');

exports.monAbonnement = async (req, res) => {
  try {
    let abonnement = await Abonnement.findOne({ freelance: req.utilisateur._id });
    if (!abonnement) {
      abonnement = await Abonnement.create({
        freelance: req.utilisateur._id,
        plan: 'gratuit',
        statut: 'essai',
      });
    }
    res.status(200).json({
      statut: 'succès',
      data: { abonnement, plans: PLANS, estActif: abonnement.estActif, joursRestants: abonnement.joursRestants },
    });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.listePlans = (req, res) => {
  res.status(200).json({ statut: 'succès', data: { plans: PLANS } });
};

exports.souscrire = async (req, res) => {
  try {
    const { plan, operateur, numeroWave } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ statut: 'erreur', message: 'Plan invalide' });
    const planInfo = PLANS[plan];
    if (planInfo.prix === 0) {
      const abonnement = await Abonnement.findOneAndUpdate(
        { freelance: req.utilisateur._id },
        { plan: 'gratuit', statut: 'essai', dateEssaiFin: new Date(Date.now() + 30*24*60*60*1000) },
        { upsert: true, new: true }
      );
      return res.status(200).json({ statut: 'succès', data: { abonnement }, message: 'Plan gratuit activé' });
    }
    if (!operateur || !numeroWave) return res.status(400).json({ statut: 'erreur', message: 'Opérateur et numéro requis' });
    const transaction = new Transaction({
      freelance: req.utilisateur._id, operateur, numeroPayeur: numeroWave,
      montant: planInfo.prix, description: `Abonnement ${planInfo.nom}`, statut: 'en_attente',
    });
    const SANDBOX = !process.env.WAVE_API_KEY;
    const resultat = SANDBOX
      ? await waveService.sandboxPaiement({ montant: planInfo.prix, reference: `ABO-${Date.now()}`, numeroPayeur: numeroWave })
      : await waveService.creerSessionPaiement({ montant: planInfo.prix, reference: `ABO-${Date.now()}`, description: `Abonnement ${planInfo.nom}` });
    if (resultat.succes && (resultat.statut === 'succeeded' || resultat.statut === 'SUCCESS')) {
      transaction.statut = 'succes'; transaction.dateConfirmation = new Date();
      await transaction.save();
      const dateFin = new Date(); dateFin.setMonth(dateFin.getMonth() + 1);
      const abonnement = await Abonnement.findOneAndUpdate(
        { freelance: req.utilisateur._id },
        { plan, statut: 'actif', dateDebut: new Date(), dateFin, transactionId: transaction._id,
          $push: { historiquesPaiements: { date: new Date(), montant: planInfo.prix, operateur, statut: 'succes', transactionId: transaction._id } } },
        { upsert: true, new: true }
      );
      return res.status(200).json({ statut: 'succès', sandbox: SANDBOX, data: { abonnement }, message: `Abonnement ${planInfo.nom} activé !`, dateFin });
    } else {
      transaction.statut = 'echoue'; await transaction.save();
      return res.status(400).json({ statut: 'erreur', message: resultat.erreur || 'Paiement échoué' });
    }
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.annuler = async (req, res) => {
  try {
    const abonnement = await Abonnement.findOneAndUpdate(
      { freelance: req.utilisateur._id },
      { renouvellementAuto: false, statut: 'annule' },
      { new: true }
    );
    res.status(200).json({ statut: 'succès', data: { abonnement }, message: 'Abonnement annulé' });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.historique = async (req, res) => {
  try {
    const abonnement = await Abonnement.findOne({ freelance: req.utilisateur._id });
    res.status(200).json({ statut: 'succès', data: { historique: abonnement?.historiquesPaiements || [] } });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};
