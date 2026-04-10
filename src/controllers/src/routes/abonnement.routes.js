const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/abonnement.controller');
const { proteger } = require('../middlewares/auth.middleware');

router.get('/plans', ctrl.listePlans); // public
router.use(proteger);
router.get('/mon-abonnement', ctrl.monAbonnement);
router.post('/souscrire', ctrl.souscrire);
router.post('/annuler', ctrl.annuler);
router.get('/historique', ctrl.historique);

module.exports = router;
