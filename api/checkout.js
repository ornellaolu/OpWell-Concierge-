const PRICES = {
  'Pre-Surgical Consultation':                             49000,
  'Post-Operative Care':                                   49000,
  'Complete Surgical Care Package':                        85000,
  'Executive Package — Complete Concierge Program':       135000,
  'Labor & Delivery Consultation — New Patient':            40000,
  'Labor & Delivery Consultation — Return Patient':        25000,
  'Mental Wellness — Single Session':                      25000,
  'Mental Wellness — Bundle Add-On':                       21500,
  'Mental Wellness — 3-Session Package':                   60000,
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const { items, email, patientName } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ error: 'No services selected' });
    }

    const lineItems = items.map(name => {
      const amount = PRICES[name];
      if (!amount) throw new Error(`Unknown service: ${name}`);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name,
            description: 'OpWell Concierge™ — Anesthesiologist-led telehealth consultation',
          },
          unit_amount: amount,
        },
        quantity: 1,
      };
    });

    const origin = req.headers.referer
      ? new URL(req.headers.referer).origin
      : (process.env.BASE_URL || 'https://opwellconcierge.com');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}?paid=1`,
      cancel_url:  `${origin}?cancelled=1`,
      customer_email: email || undefined,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: { patient_name: patientName || '' },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message });
  }
};
