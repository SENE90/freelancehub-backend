const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/projects.controller');
const { proteger } = require('../middlewares/auth.middleware');

// Toutes les routes projets sont protégées
router.use(proteger);

router.get('/stats', ctrl.statsProjects);
router.get('/', ctrl.mesProjets);
router.get('/:id', ctrl.unProjet);
router.post('/', ctrl.creerProjet);
router.patch('/:id', ctrl.modifierProjet);
router.delete('/:id', ctrl.supprimerProjet);

module.exports = router;
