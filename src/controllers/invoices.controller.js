const Invoice = require('../models/Invoice');
const Project = require('../models/Project');
const { genererFacturePDF } = require('../services/pdf.service');

exports.mesFactures = async (req, res) => {
  try {
    const { statut, page = 1, limite = 10 } = req.query;
    const filtre = { freelance: req.utilisateur._id };
    if (statut) filtre.statut = statut;
    const factures = await Invoice.find(filtre).populate('projet', 'titre client').sort({ createdAt: -1 }).skip((page-1)*limite).limit(Number(limite));
    const total = await Invoice.countDocuments(filtre);
    res.status(200).json({ statut: 'succès', total, data: { factures } });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.uneFacture = async (req, res) => {
  try {
    const facture = await Invoice.findOne({ _id: req.params.id, freelance: req.utilisateur._id }).populate('projet', 'titre client statut');
    if (!facture) return res.status(404).json({ statut: 'erreur', message: 'Facture introuvable' });
    res.status(200).json({ statut: 'succès', data: { facture } });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.creerFacture = async (req, res) => {
  try {
    const facture = await Invoice.create({ ...req.body, freelance: req.utilisateur._id });
    if (req.body.projet && req.body.statut === 'payee') {
      await Project.findByIdAndUpdate(req.body.projet, { $inc: { montantPaye: facture.total } });
    }
    res.status(201).json({ statut: 'succès', data: { facture } });
  } catch (err) { res.status(400).json({ statut: 'erreur', message: err.message }); }
};

exports.modifierFacture = async (req, res) => {
  try {
    const facture = await Invoice.findOneAndUpdate({ _id: req.params.id, freelance: req.utilisateur._id }, req.body, { new: true, runValidators: true });
    if (!facture) return res.status(404).json({ statut: 'erreur', message: 'Facture introuvable' });
    res.status(200).json({ statut: 'succès', data: { facture } });
  } catch (err) { res.status(400).json({ statut: 'erreur', message: err.message }); }
};

exports.marquerPayee = async (req, res) => {
  try {
    const facture = await Invoice.findOneAndUpdate(
      { _id: req.params.id, freelance: req.utilisateur._id },
      { statut: 'payee', datePaiement: new Date(), methodePaiement: req.body.methodePaiement },
      { new: true }
    );
    if (!facture) return res.status(404).json({ statut: 'erreur', message: 'Facture introuvable' });
    if (facture.projet) await Project.findByIdAndUpdate(facture.projet, { $inc: { montantPaye: facture.total } });
    res.status(200).json({ statut: 'succès', data: { facture } });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.supprimerFacture = async (req, res) => {
  try {
    const facture = await Invoice.findOneAndDelete({ _id: req.params.id, freelance: req.utilisateur._id, statut: { $in: ['brouillon', 'annulee'] } });
    if (!facture) return res.status(404).json({ statut: 'erreur', message: 'Impossible de supprimer' });
    res.status(200).json({ statut: 'succès', message: 'Facture supprimée' });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.statsFactures = async (req, res) => {
  try {
    const id = req.utilisateur._id;
    const stats = await Invoice.aggregate([{ $match: { freelance: id } }, { $group: { _id: '$statut', count: { $sum: 1 }, totalMontant: { $sum: '$total' } } }]);
    const totalFacture = stats.reduce((s, g) => s + g.totalMontant, 0);
    const totalPaye = stats.find(g => g._id === 'payee')?.totalMontant || 0;
    const totalEnAttente = stats.find(g => g._id === 'en_attente')?.totalMontant || 0;
    res.status(200).json({ statut: 'succès', data: { stats, totalFacture, totalPaye, totalEnAttente } });
  } catch (err) { res.status(500).json({ statut: 'erreur', message: err.message }); }
};

exports.telechargerPDF = async (req, res) => {
  try {
    const facture = await Invoice.findOne({ _id: req.params.id, freelance: req.utilisateur._id });
    if (!facture) return res.status(404).json({ statut: 'erreur', message: 'Facture introuvable' });
    const pdfBuffer = await genererFacturePDF(facture, req.utilisateur);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${facture.numero}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('Erreur PDF:', err);
    res.status(500).json({ statut: 'erreur', message: 'Erreur PDF: ' + err.message });
  }
};
