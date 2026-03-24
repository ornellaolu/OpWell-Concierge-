const PRICES = {
  'Pre-Surgical Consultation':                             49000,
  'Post-Operative Care':                                   49000,
  'Complete Surgical Care Package':                        85000,
  'Executive Package — Complete Concierge Program':       135000,
  'Labor & Delivery Consultation — New Patient':            40000,
  'Mental Wellness — 3-Session Package':                   60000,
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
    const {
      service,
      gifterName, gifterEmail, gifterPhone,
      recipientName, recipientEmail, recipientPhone,
      giftMessage
    } = req.body;

    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    if (!service) return res.status(400).json({ error: 'No service selected' });
    if (!gifterEmail || !isValidEmail(gifterEmail)) return res.status(400).json({ error: 'Valid gifter email required' });
    if (!recipientEmail || !isValidEmail(recipientEmail)) return res.status(400).json({ error: 'Valid recipient email required' });

    const amount = PRICES[service];
    if (!amount) return res.status(400).json({ error: `Unknown service: ${service}` });

    const refOrigin = req.headers.referer ? new URL(req.headers.referer).origin : null;
    const origin = ALLOWED_ORIGINS.includes(refOrigin) ? refOrigin : ALLOWED_ORIGINS[0];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Gift: ${service}`,
            description: `OpWell Concierge™ Gift for ${recipientName || 'Recipient'}`,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}?gift_paid=1`,
      cancel_url: `${origin}?gift_cancelled=1`,
      customer_email: gifterEmail,
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
      metadata: {
        is_gift: 'true',
        service,
        gifter_name: gifterName || '',
        gifter_email: gifterEmail || '',
        gifter_phone: gifterPhone || '',
        recipient_name: recipientName || '',
        recipient_email: recipientEmail || '',
        recipient_phone: recipientPhone || '',
        gift_message: giftMessage || '',
      },
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Gift checkout error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
