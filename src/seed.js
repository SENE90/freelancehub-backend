const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');
const Project = require('./models/Project');
const Invoice = require('./models/Invoice');
const Transaction = require('./models/Transaction');

const seeder = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connecté à MongoDB');

  // Nettoyer les collections
  await Promise.all([
    User.deleteMany(),
    Project.deleteMany(),
    Invoice.deleteMany(),
    Transaction.deleteMany(),
  ]);
  console.log('🗑️  Collections nettoyées');

  // Créer un utilisateur freelance de test
  const freelance = await User.create({
    nom: 'Koné',
    prenom: 'Amadou',
    email: 'amadou@freelancehub.sn',
    motDePasse: 'test123456',
    telephone: '+221771234567',
    wave: { numero: '+221771234567', actif: true },
    competences: ['React', 'Node.js', 'Figma'],
  });
  console.log('👤 Freelance créé :', freelance.email);

  // Créer un projet
  const projet = await Project.create({
    titre: 'Redesign site e-commerce',
    description: 'Refonte complète du site avec React',
    freelance: freelance._id,
    client: {
      nom: 'Binta Mbaye',
      email: 'binta@dakarmode.sn',
      telephone: '+221774523321',
      entreprise: 'Boutique Dakar Mode',
    },
    statut: 'en_cours',
    categorie: 'design',
    montant: 180000,
    acompte: 90000,
    montantPaye: 90000,
    dateLivraison: new Date('2026-04-28'),
    competences: ['Figma', 'React', 'CSS'],
  });
  console.log('📁 Projet créé :', projet.titre);

  // Créer une facture
  const facture = await Invoice.create({
    freelance: freelance._id,
    projet: projet._id,
    client: {
      nom: 'Binta Mbaye',
      email: 'binta@dakarmode.sn',
      entreprise: 'Boutique Dakar Mode',
    },
    lignes: [
      { description: 'Maquettes Figma (5 pages)', quantite: 1, prixUnitaire: 80000 },
      { description: 'Intégration React', quantite: 1, prixUnitaire: 80000 },
      { description: 'Tests & livraison', quantite: 1, prixUnitaire: 20000 },
    ],
    statut: 'en_attente',
    methodePaiement: 'wave',
    dateEcheance: new Date('2026-04-30'),
    conditionsPaiement: 'Paiement Wave à réception',
  });
  console.log('🧾 Facture créée :', facture.numero);

  // Créer une transaction Wave
  const tx = new Transaction({
    freelance: freelance._id,
    facture: facture._id,
    projet: projet._id,
    operateur: 'wave',
    numeroPayeur: '+221774523321',
    nomPayeur: 'Binta Mbaye',
    montant: 90000,
    statut: 'succes',
    description: 'Acompte 50% — Redesign Dakar Mode',
  });
  await tx.save();
  console.log('💸 Transaction créée — montant net :', tx.montantNet, 'XOF');

  console.log('\n✅ Seed terminé avec succès !');
  console.log('📧 Email test :', freelance.email);
  console.log('🔑 Mot de passe :', 'test123456');
  process.exit(0);
};

seeder().catch((err) => {
  console.error('❌ Erreur seed :', err);
  process.exit(1);
});
