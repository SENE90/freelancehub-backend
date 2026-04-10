const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  titre: {
    type: String,
    required: [true, 'Le titre du projet est obligatoire'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  freelance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  client: {
    nom: { type: String, required: true },
    email: String,
    telephone: String,
    entreprise: String,
  },
  statut: {
    type: String,
    enum: ['en_attente', 'en_cours', 'en_revision', 'termine', 'annule'],
    default: 'en_attente',
  },
  categorie: {
    type: String,
    enum: ['dev_web', 'mobile', 'design', 'redaction', 'marketing', 'data', 'autre'],
    default: 'autre',
  },
  montant: {
    type: Number,
    required: [true, 'Le montant est obligatoire'],
    min: 0,
  },
  acompte: {
    type: Number,
    default: 0,
  },
  montantPaye: {
    type: Number,
    default: 0,
  },
  devise: {
    type: String,
    default: 'XOF', // Franc CFA
  },
  dateDebut: {
    type: Date,
    default: Date.now,
  },
  dateLivraison: {
    type: Date,
    required: [true, 'La date de livraison est obligatoire'],
  },
  dateLivraisonReelle: Date,
  competences: [String],
  fichiers: [
    {
      nom: String,
      url: String,
      uploadedAt: { type: Date, default: Date.now },
    },
  ],
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Mettre à jour updatedAt avant chaque sauvegarde
projectSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Champ virtuel : montant restant à payer
projectSchema.virtual('montantRestant').get(function () {
  return this.montant - this.montantPaye;
});

// Champ virtuel : pourcentage payé
projectSchema.virtual('progressionPaiement').get(function () {
  if (this.montant === 0) return 0;
  return Math.round((this.montantPaye / this.montant) * 100);
});

projectSchema.set('toJSON', { virtuals: true });
projectSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Project', projectSchema);
