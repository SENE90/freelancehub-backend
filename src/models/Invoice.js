const mongoose = require('mongoose');

const ligneSchema = new mongoose.Schema({
  description: { type: String, required: true },
  quantite: { type: Number, default: 1, min: 1 },
  prixUnitaire: { type: Number, required: true, min: 0 },
  total: { type: Number },
});

ligneSchema.pre('save', function (next) {
  this.total = this.quantite * this.prixUnitaire;
  next();
});

const invoiceSchema = new mongoose.Schema({
  numero: {
    type: String,
  },
  freelance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },
  client: {
    nom: { type: String, required: true },
    email: String,
    telephone: String,
    adresse: String,
    entreprise: String,
  },
  lignes: [ligneSchema],
  sousTotal: { type: Number, default: 0 },
  tva: { type: Number, default: 0 },
  montantTva: { type: Number, default: 0 },
  remise: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  devise: { type: String, default: 'XOF' },
  statut: {
    type: String,
    enum: ['brouillon', 'envoyee', 'en_attente', 'payee', 'annulee', 'en_retard'],
    default: 'brouillon',
  },
  methodePaiement: {
    type: String,
    enum: ['wave', 'orange_money', 'virement', 'especes', 'cheque', 'autre'],
  },
  dateEmission: { type: Date, default: Date.now },
  dateEcheance: { type: Date },
  datePaiement: { type: Date },
  notes: String,
  conditionsPaiement: {
    type: String,
    default: 'Paiement à réception de facture',
  },
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
  },
  pdfUrl: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

invoiceSchema.pre('save', async function (next) {
  this.updatedAt = Date.now();

  if (!this.numero) {
    const annee = new Date().getFullYear();
    const derniere = await mongoose.model('Invoice').findOne(
      { freelance: this.freelance },
      { numero: 1 },
      { sort: { createdAt: -1 } }
    );
    let num = 1;
    if (derniere && derniere.numero) {
      const parts = derniere.numero.split('-');
      const dernierNum = parseInt(parts[2]) || 0;
      num = dernierNum + 1;
    }
    this.numero = `FAC-${annee}-${String(num).padStart(3, '0')}`;
  }

  this.sousTotal = this.lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaire, 0);
  this.montantTva = Math.round(this.sousTotal * (this.tva / 100));
  this.total = this.sousTotal + this.montantTva - this.remise;

  if (this.dateEcheance && new Date() > this.dateEcheance && this.statut === 'en_attente') {
    this.statut = 'en_retard';
  }

  next();
});

invoiceSchema.virtual('joursRestants').get(function () {
  if (!this.dateEcheance) return null;
  const diff = this.dateEcheance - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

invoiceSchema.set('toJSON', { virtuals: true });
invoiceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Invoice', invoiceSchema);
