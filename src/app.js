const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes     = require('./routes/auth.routes');
const projectsRoutes = require('./routes/projects.routes');
const invoicesRoutes = require('./routes/invoices.routes');
const paymentsRoutes = require('./routes/payments.routes');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth',      authRoutes);
app.use('/api/projets',   projectsRoutes);
app.use('/api/factures',  invoicesRoutes);
app.use('/api/paiements', paymentsRoutes);

app.get('/api/sante', (req, res) => {
  res.json({ statut: 'ok', message: 'FreelanceHub API opérationnelle', version: '1.0.0', sandbox: !process.env.WAVE_API_KEY });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ statut: 'erreur', message: 'Erreur interne du serveur' });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connecté à MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 Serveur sur http://localhost:${PORT}`);
      console.log(`💳 Mode paiement : ${!process.env.WAVE_API_KEY ? 'SANDBOX' : 'PRODUCTION'}`);
      console.log('📦 Routes : /api/auth | /api/projets | /api/factures | /api/paiements');
    });
  })
  .catch((err) => { console.error('❌ Erreur MongoDB :', err.message); process.exit(1); });

module.exports = app;
