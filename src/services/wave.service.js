const axios = require('axios');

const waveClient = axios.create({
  baseURL: process.env.WAVE_BASE_URL || 'https://api.wave.com/v1',
  headers: {
    'Authorization': `Bearer ${process.env.WAVE_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ─── CRÉER UNE SESSION DE PAIEMENT ────────────────────────
exports.creerSessionPaiement = async ({ montant, reference, description, urlSucces, urlEchec }) => {
  try {
    const res = await waveClient.post('/checkout/sessions', {
      currency: 'XOF',
      amount: String(montant),
      error_url: urlEchec || `${process.env.FRONTEND_URL}/paiement/echec`,
      success_url: urlSucces || `${process.env.FRONTEND_URL}/paiement/succes`,
      payment_reference: reference,
    });

    return {
      succes: true,
      checkoutId: res.data.id,
      waveUrl: res.data.wave_launch_url,
      statut: res.data.payment_status,
    };
  } catch (err) {
    console.error('Wave API Error:', err.response?.data || err.message);
    return {
      succes: false,
      erreur: err.response?.data?.message || 'Erreur Wave API',
    };
  }
};

// ─── VÉRIFIER LE STATUT D'UNE SESSION ─────────────────────
exports.verifierSession = async (checkoutId) => {
  try {
    const res = await waveClient.get(`/checkout/sessions/${checkoutId}`);
    return {
      succes: true,
      statut: res.data.payment_status, // 'pending' | 'succeeded' | 'failed'
      montant: res.data.amount,
      reference: res.data.payment_reference,
      donnees: res.data,
    };
  } catch (err) {
    return { succes: false, erreur: err.response?.data?.message || 'Erreur vérification' };
  }
};

// ─── REMBOURSER UN PAIEMENT ────────────────────────────────
exports.rembourser = async (checkoutId) => {
  try {
    const res = await waveClient.post(`/checkout/sessions/${checkoutId}/refund`);
    return { succes: true, donnees: res.data };
  } catch (err) {
    return { succes: false, erreur: err.response?.data?.message || 'Erreur remboursement' };
  }
};

// ─── MODE SANDBOX (sans clé API) ──────────────────────────
exports.sandboxPaiement = async ({ montant, reference, numeroPayeur }) => {
  // Simule un paiement Wave en mode test
  await new Promise(r => setTimeout(r, 1500)); // simule délai réseau

  const succes = Math.random() > 0.1; // 90% de succès en sandbox

  return {
    succes,
    checkoutId: `sandbox_${Date.now()}`,
    waveUrl: null,
    statut: succes ? 'succeeded' : 'failed',
    montant,
    reference,
    frais: Math.round(montant * 0.01),
    montantNet: Math.round(montant * 0.99),
    message: succes ? 'Paiement sandbox réussi' : 'Paiement sandbox échoué',
  };
};
