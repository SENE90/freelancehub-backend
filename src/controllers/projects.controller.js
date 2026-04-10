const Project = require('../models/Project');

// ─── LISTER MES PROJETS ────────────────────────────────────────
exports.mesProjets = async (req, res) => {
  try {
    const { statut, categorie, page = 1, limite = 10 } = req.query;
    const filtre = { freelance: req.utilisateur._id };
    if (statut) filtre.statut = statut;
    if (categorie) filtre.categorie = categorie;

    const projets = await Project.find(filtre)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limite)
      .limit(Number(limite));

    const total = await Project.countDocuments(filtre);

    res.status(200).json({
      statut: 'succès',
      total,
      page: Number(page),
      data: { projets },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── UN PROJET ─────────────────────────────────────────────────
exports.unProjet = async (req, res) => {
  try {
    const projet = await Project.findOne({
      _id: req.params.id,
      freelance: req.utilisateur._id,
    });
    if (!projet) return res.status(404).json({ statut: 'erreur', message: 'Projet introuvable' });

    res.status(200).json({ statut: 'succès', data: { projet } });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── CRÉER UN PROJET ───────────────────────────────────────────
exports.creerProjet = async (req, res) => {
  try {
    const projet = await Project.create({
      ...req.body,
      freelance: req.utilisateur._id,
    });
    res.status(201).json({ statut: 'succès', data: { projet } });
  } catch (err) {
    res.status(400).json({ statut: 'erreur', message: err.message });
  }
};

// ─── MODIFIER UN PROJET ────────────────────────────────────────
exports.modifierProjet = async (req, res) => {
  try {
    const projet = await Project.findOneAndUpdate(
      { _id: req.params.id, freelance: req.utilisateur._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!projet) return res.status(404).json({ statut: 'erreur', message: 'Projet introuvable' });

    res.status(200).json({ statut: 'succès', data: { projet } });
  } catch (err) {
    res.status(400).json({ statut: 'erreur', message: err.message });
  }
};

// ─── SUPPRIMER UN PROJET ───────────────────────────────────────
exports.supprimerProjet = async (req, res) => {
  try {
    const projet = await Project.findOneAndDelete({
      _id: req.params.id,
      freelance: req.utilisateur._id,
    });
    if (!projet) return res.status(404).json({ statut: 'erreur', message: 'Projet introuvable' });

    res.status(200).json({ statut: 'succès', message: 'Projet supprimé' });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── STATISTIQUES PROJETS ──────────────────────────────────────
exports.statsProjects = async (req, res) => {
  try {
    const id = req.utilisateur._id;
    const [stats, parStatut] = await Promise.all([
      Project.aggregate([
        { $match: { freelance: id } },
        {
          $group: {
            _id: null,
            totalProjets: { $sum: 1 },
            totalMontant: { $sum: '$montant' },
            totalPaye: { $sum: '$montantPaye' },
          },
        },
      ]),
      Project.aggregate([
        { $match: { freelance: id } },
        { $group: { _id: '$statut', count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      statut: 'succès',
      data: {
        global: stats[0] || { totalProjets: 0, totalMontant: 0, totalPaye: 0 },
        parStatut,
      },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};
