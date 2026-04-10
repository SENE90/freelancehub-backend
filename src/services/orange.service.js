const axios = require('axios');

// ─── OBTENIR UN TOKEN ORANGE MONEY ────────────────────────
const getToken = async () => {
  const credentials = Buffer.from(
    `${process.env.ORANGE_CLIENT_ID}:${process.env.ORANGE_CLIENT_SECRET}`
  ).toString('base64');

  const res = await axios.post(
    'https://api.orange.com/oauth/v3/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return res.data.access_token;
};

// ─── INITIALISER UN PAIEMENT ──────────────────────────────
exports.initierPaiement = async ({ montant, numeroPayeur, reference, description }) => {
  try {
    const token = await getToken();

    const res = await axios.post(
      `${process.env.ORANGE_BASE_URL}/webpayment`,
      {
        merchant_key: process.env.ORANGE_MERCHANT_KEY,
        currency: 'OUV',
        order_id: reference,
        amount: montant,
        return_url: `${process.env.FRONTEND_URL}/paiement/succes`,
        cancel_url: `${process.env.FRONTEND_URL}/paiement/echec`,
        notif_url: `${process.env.BACKEND_URL}/api/paiements/webhook/orange`,
        lang: 'fr',
      },
      {
        headers: { 'Authorization': `Bearer ${token}` },
      }
    );

    return {
      succes: true,
      payToken: res.data.pay_token,
      paymentUrl: res.data.payment_url,
      statut: 'pending',
    };
  } catch (err) {
    console.error('Orange Money Error:', err.response?.data || err.message);
    return { succes: false, erreur: err.response?.data?.message || 'Erreur Orange Money' };
  }
};

// ─── VÉRIFIER STATUT ──────────────────────────────────────
exports.verifierPaiement = async (payToken) => {
  try {
    const token = await getToken();

    const res = await axios.get(
      `${process.env.ORANGE_BASE_URL}/webpayment/${payToken}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    return {
      succes: true,
      statut: res.data.status, // 'SUCCESS' | 'FAILED' | 'PENDING'
      montant: res.data.amount,
      donnees: res.data,
    };
  } catch (err) {
    return { succes: false, erreur: err.response?.data?.message || 'Erreur vérification' };
  }
};

// ─── MODE SANDBOX ─────────────────────────────────────────
exports.sandboxPaiement = async ({ montant, reference }) => {
  await new Promise(r => setTimeout(r, 1500));
  const succes = Math.random() > 0.1;

  return {
    succes,
    payToken: `om_sandbox_${Date.now()}`,
    paymentUrl: null,
    statut: succes ? 'SUCCESS' : 'FAILED',
    montant,
    frais: Math.round(montant * 0.015),
    montantNet: Math.round(montant * 0.985),
    message: succes ? 'Paiement Orange Money sandbox réussi' : 'Échec sandbox',
  };
};
