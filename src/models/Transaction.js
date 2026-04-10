const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  freelance: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  facture: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice',
  },
  projet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
  },

  // ─── INFOS PAIEMENT ───────────────────────────────────────
  operateur: {
    type: String,
    enum: ['wave', 'orange_money'],
    required: true,
  },
  numeroPayeur: {
    type: String,
    required: true, // numéro Wave/Orange du client
  },
  nomPayeur: String,

  montant: {
    type: Number,
    required: true,
    min: 0,
  },
  frais: {
    type: Number,
    default: 0, // frais prélevés par Wave/Orange
  },
  montantNet: {
    type: Number,
    default: 0, // montant reçu après frais
  },
  devise: { type: String, default: 'XOF' },

  // ─── STATUT ───────────────────────────────────────────────
  statut: {
    type: String,
    enum: ['en_attente', 'en_cours', 'succes', 'echoue', 'rembourse', 'expire'],
    default: 'en_attente',
  },

  // ─── RÉFÉRENCES EXTERNES ──────────────────────────────────
  // ID retourné par l'API Wave ou Orange
  refExterne: String,
  // ID de la session de paiement Wave
  waveCheckoutId: String,
  // Référence Orange Money
  orangePayToken: String,

  // ─── OTP & SÉCURITÉ ───────────────────────────────────────
  otpCode: {
    type: String,
    select: false, // jamais retourné dans les requêtes
  },
  otpExpiration: Date,
  otpVerifie: { type: Boolean, default: false },

  // ─── WEBHOOK ──────────────────────────────────────────────
  webhookRecu: { type: Boolean, default: false },
  webhookData: mongoose.Schema.Types.Mixed, // données brutes du webhook

  // ─── COMMISSION PLATEFORME ────────────────────────────────
  commissionPlateforme: {
    type: Number,
    default: 0, // si tu actives le modèle marketplace
  },
  tauxCommission: {
    type: Number,
    default: 0,
  },

  description: String,
  metadata: mongoose.Schema.Types.Mixed,

  dateInitiation: { type: Date, default: Date.now },
  dateConfirmation: Date,
  createdAt: { type: Date, default: Date.now },
});

// Calculer les frais et montant net avant sauvegarde
transactionSchema.pre('save', function (next) {
  const taux = this.operateur === 'wave' ? 0.01 : 0.015;
  this.frais = Math.round(this.montant * taux);
  this.montantNet = this.montant - this.frais;

  if (this.statut === 'succes' && !this.dateConfirmation) {
    this.dateConfirmation = new Date();
  }
  next();
});

// Méthode : générer un code OTP à 4 chiffres
transactionSchema.methods.genererOTP = function () {
  const code = Math.floor(1000 + Math.random() * 9000).toString();
  this.otpCode = code;
  this.otpExpiration = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
  this.otpVerifie = false;
  return code;
};

// Méthode : vérifier l'OTP
transactionSchema.methods.verifierOTP = function (codeSaisi) {
  if (new Date() > this.otpExpiration) return { valide: false, message: 'OTP expiré' };
  if (this.otpCode !== codeSaisi) return { valide: false, message: 'Code incorrect' };
  this.otpVerifie = true;
  return { valide: true };
};

// Index pour recherches fréquentes
transactionSchema.index({ freelance: 1, createdAt: -1 });
transactionSchema.index({ refExterne: 1 });
transactionSchema.index({ statut: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
