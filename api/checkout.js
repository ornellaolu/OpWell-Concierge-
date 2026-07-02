const PRICES = {
  // Tier 1: Blueprint
  'The Interactive Surgical Prep Blueprint':              9900,
  'Surgery Prep Masterclass':                              9900,
  'Surgical Anxiety Digital Module':                       4900,

  // Tier 2: Comprehensive Care
  'Comprehensive Perioperative Care':                    85000,
  'Complete Surgical Care Package':                      85000,
  'Mind-Body Bundle':                                   100000,

  // Tier 3: Retainer (application-only, not directly purchasable)
  'Private Physician Retainer':                             0,

  // Add-ons
  'Mental Wellness Consultation':                        15000,
  'Clinical Supplement & Tissue Recovery Protocol':      14900,
  'Vitamin Supplementation Add-On':                      14900,

  // Legacy (for backward compatibility)
  'Labor & Delivery Consultation — New Patient':         40000,
  'Labor & Delivery Consultation — Return Patient':      25000,
};

const ALLOWED_ORIGINS = [
  'https://opwellconcierge.com',
  'https://www.opwellconcierge.com',
  'https://op-well-concierge.vercel.app',
];

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

    // Handle Private Physician Retainer (application-only, no charge)
    if (items.some(n => n === 'Private Physician Retainer')) {
      const refOrigin = req.headers.referer ? new URL(req.headers.referer).origin : null;
      const origin = ALLOWED_ORIGINS.includes(refOrigin) ? refOrigin : ALLOWED_ORIGINS[0];
      return res.status(200).json({
        url: `${origin}/contact?service=retainer`,
        retainerApplication: true,
      });
    }

    const lineItems = items.map(name => {
      const amount = PRICES[name];
      if (!amount && amount !== 0) throw new Error(`Unknown service: ${name}`);
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

    const refOrigin = req.headers.referer ? new URL(req.headers.referer).origin : null;
    const origin = ALLOWED_ORIGINS.includes(refOrigin) ? refOrigin : ALLOWED_ORIGINS[0];

    // Disable promo codes for Mind-Body Bundle and Tier 1 masterclass combos
    const disallowPromoCodes = items.some(n =>
      n === 'Mind-Body Bundle' ||
      n === 'Private Physician Retainer' ||
      (items.length > 1 && items.some(i => i === 'Surgery Prep Masterclass'))
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${origin}?paid=1`,
      cancel_url:  `${origin}?cancelled=1`,
      customer_email: email || undefined,
      allow_promotion_codes: !disallowPromoCodes,
      billing_address_collection: 'auto',
      metadata: {
        patient_name: patientName || '',
        patient_email: email || '',
        services: items.join(', '),
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
