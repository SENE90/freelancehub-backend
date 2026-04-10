const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/invoices.controller');
const { proteger } = require('../middlewares/auth.middleware');

router.use(proteger);

router.get('/stats', ctrl.statsFactures);
router.get('/', ctrl.mesFactures);
router.get('/:id', ctrl.uneFacture);
router.get('/:id/pdf', ctrl.telechargerPDF);
router.post('/', ctrl.creerFacture);
router.patch('/:id', ctrl.modifierFacture);
router.patch('/:id/payer', ctrl.marquerPayee);
router.delete('/:id', ctrl.supprimerFacture);

module.exports = router;
