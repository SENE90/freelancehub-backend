const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { proteger } = require('../middlewares/auth.middleware');

// Routes publiques
router.post('/inscription', authController.inscription);
router.post('/connexion', authController.connexion);
router.get('/deconnexion', authController.deconnexion);

// Routes protégées (token requis)
router.get('/mon-profil', proteger, authController.monProfil);

module.exports = router;
