const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: [true, 'Le nom est obligatoire'],
    trim: true,
  },
  prenom: {
    type: String,
    required: [true, 'Le prénom est obligatoire'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, "L'email est obligatoire"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Email invalide'],
  },
  motDePasse: {
    type: String,
    required: [true, 'Le mot de passe est obligatoire'],
    minlength: [6, 'Minimum 6 caractères'],
    select: false, // jamais retourné dans les requêtes
  },
  telephone: {
    type: String,
    trim: true,
  },
  // Comptes mobile money
  wave: {
    numero: String,
    actif: { type: Boolean, default: false },
  },
  orangeMoney: {
    numero: String,
    actif: { type: Boolean, default: false },
  },
  avatar: {
    type: String,
    default: '',
  },
  disponible: {
    type: Boolean,
    default: true,
  },
  competences: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash du mot de passe avant sauvegarde
userSchema.pre('save', async function (next) {
  if (!this.isModified('motDePasse')) return next();
  this.motDePasse = await bcrypt.hash(this.motDePasse, 12);
  next();
});

// Méthode pour comparer les mots de passe
userSchema.methods.verifierMotDePasse = async function (motDePasseSaisi, motDePasseHash) {
  return await bcrypt.compare(motDePasseSaisi, motDePasseHash);
};

module.exports = mongoose.model('User', userSchema);
