const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Générer un token JWT
const genererToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Envoyer le token en réponse
const envoyerToken = (user, statusCode, res) => {
  const token = genererToken(user._id);

  // Options du cookie
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 jours
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
  };

  res.cookie('jwt', token, cookieOptions);

  // Cacher le mot de passe dans la réponse
  user.motDePasse = undefined;

  res.status(statusCode).json({
    statut: 'succès',
    token,
    data: { utilisateur: user },
  });
};

// ─── INSCRIPTION ───────────────────────────────────────────────
exports.inscription = async (req, res) => {
  try {
    const { nom, prenom, email, motDePasse, telephone } = req.body;

    // Vérifier si l'email existe déjà
    const existeDeja = await User.findOne({ email });
    if (existeDeja) {
      return res.status(400).json({
        statut: 'erreur',
        message: 'Un compte avec cet email existe déjà',
      });
    }

    // Créer le nouvel utilisateur
    const nouvelUtilisateur = await User.create({
      nom,
      prenom,
      email,
      motDePasse,
      telephone,
    });

    envoyerToken(nouvelUtilisateur, 201, res);
  } catch (err) {
    res.status(400).json({
      statut: 'erreur',
      message: err.message,
    });
  }
};

// ─── CONNEXION ─────────────────────────────────────────────────
exports.connexion = async (req, res) => {
  try {
    const { email, motDePasse } = req.body;

    // 1. Vérifier que email et mot de passe sont fournis
    if (!email || !motDePasse) {
      return res.status(400).json({
        statut: 'erreur',
        message: 'Veuillez fournir un email et un mot de passe',
      });
    }

    // 2. Vérifier que l'utilisateur existe et récupérer le mot de passe
    const utilisateur = await User.findOne({ email }).select('+motDePasse');
    if (!utilisateur) {
      return res.status(401).json({
        statut: 'erreur',
        message: 'Email ou mot de passe incorrect',
      });
    }

    // 3. Vérifier le mot de passe
    const motDePasseCorrect = await utilisateur.verifierMotDePasse(
      motDePasse,
      utilisateur.motDePasse
    );
    if (!motDePasseCorrect) {
      return res.status(401).json({
        statut: 'erreur',
        message: 'Email ou mot de passe incorrect',
      });
    }

    // 4. Envoyer le token
    envoyerToken(utilisateur, 200, res);
  } catch (err) {
    res.status(500).json({
      statut: 'erreur',
      message: err.message,
    });
  }
};

// ─── PROFIL CONNECTÉ ───────────────────────────────────────────
exports.monProfil = async (req, res) => {
  try {
    const utilisateur = await User.findById(req.utilisateur.id);
    res.status(200).json({
      statut: 'succès',
      data: { utilisateur },
    });
  } catch (err) {
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};

// ─── DÉCONNEXION ───────────────────────────────────────────────
exports.deconnexion = (req, res) => {
  res.cookie('jwt', 'deconnecte', {
    expires: new Date(Date.now() + 1000),
    httpOnly: true,
  });
  res.status(200).json({ statut: 'succès', message: 'Déconnecté avec succès' });
};
