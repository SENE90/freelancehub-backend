const mongoose = require('mongoose');

const abonnementSchema = new mongoose.Schema({
  freelance: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['gratuit','starter','pro','business'], default: 'gratuit' },
  statut: { type: String, enum: ['actif','expire','annule','essai'], default: 'essai' },
  dateDebut: { type: Date, default: Date.now },
  dateFin: { type: Date },
  dateEssaiFin: { type: Date, default: () => new Date(Date.now() + 30*24*60*60*1000) },
  renouvellementAuto: { type: Boolean, default: true },
  transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
  historiquesPaiements: [{ date: Date, montant: Number, operateur: String, statut: String, transactionId: mongoose.Schema.Types.ObjectId }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const PLANS = {
  gratuit:  { nom: 'Gratuit',   prix: 0,     projetsMax: 3,   facturesMax: 5,   pdfMax: 3,   description: 'Pour démarrer' },
  starter:  { nom: 'Starter',   prix: 5000,  projetsMax: 10,  facturesMax: 20,  pdfMax: 20,  description: 'Pour les freelances débutants' },
  pro:      { nom: 'Pro',       prix: 10000, projetsMax: 50,  facturesMax: 100, pdfMax: 100, description: 'Pour les freelances actifs' },
  business: { nom: 'Business',  prix: 25000, projetsMax: 999, facturesMax: 999, pdfMax: 999, description: 'Pour les agences et pros' },
};

abonnementSchema.virtual('estActif').get(function() {
  if (this.statut === 'essai') return new Date() < this.dateEssaiFin;
  if (this.statut === 'actif') return new Date() < this.dateFin;
  return false;
});

abonnementSchema.virtual('joursRestants').get(function() {
  const fin = this.statut === 'essai' ? this.dateEssaiFin : this.dateFin;
  if (!fin) return 0;
  return Math.max(0, Math.ceil((fin - new Date()) / (1000*60*60*24)));
});

abonnementSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Abonnement', abonnementSchema);
module.exports.PLANS = PLANS;
