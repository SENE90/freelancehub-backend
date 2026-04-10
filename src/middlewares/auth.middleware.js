const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protéger les routes — vérifie le token JWT
exports.proteger = async (req, res, next) => {
  try {
    let token;

    // 1. Récupérer le token depuis le header Authorization ou le cookie
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({
        statut: 'erreur',
        message: 'Vous devez être connecté pour accéder à cette ressource',
      });
    }

    // 2. Vérifier la validité du token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. Vérifier que l'utilisateur existe toujours
    const utilisateurActuel = await User.findById(decoded.id);
    if (!utilisateurActuel) {
      return res.status(401).json({
        statut: 'erreur',
        message: "L'utilisateur associé à ce token n'existe plus",
      });
    }

    // 4. Attacher l'utilisateur à la requête
    req.utilisateur = utilisateurActuel;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ statut: 'erreur', message: 'Token invalide' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ statut: 'erreur', message: 'Token expiré, reconnectez-vous' });
    }
    res.status(500).json({ statut: 'erreur', message: err.message });
  }
};
