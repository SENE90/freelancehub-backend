const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payments.controller');
const { proteger } = require('../middlewares/auth.middleware');

// Webhooks — pas de protection JWT (appelés par Wave/Orange)
router.post('/webhook/wave', ctrl.webhookWave);
router.post('/webhook/orange', ctrl.webhookOrange);

// Routes protégées
router.use(proteger);
router.post('/initier', ctrl.initierPaiement);
router.get('/mes-transactions', ctrl.mesTransactions);
router.get('/:id', ctrl.verifierPaiement);

module.exports = router;
