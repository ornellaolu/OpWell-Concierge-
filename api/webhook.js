const { Resend } = require('resend');

const BLOG_ACCESS_CODE = 'OPWELL2026';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Stripe sends raw body — Vercel needs this config
module.exports.config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const resend = new Resend(process.env.RESEND_API_KEY);

    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;

      // Handle gift purchases
      if (session.metadata.is_gift === 'true') {
        const { service, gifter_name, gifter_email, recipient_name, recipient_email, gift_message } = session.metadata;
        // Import and call gift confirmation handler
        const giftHandler = require('./send-gift-confirmation');
        const fakeReq = {
          method: 'POST',
          body: {
            service,
            gifterName: gifter_name,
            gifterEmail: gifter_email,
            recipientName: recipient_name,
            recipientEmail: recipient_email,
            giftMessage: gift_message
          }
        };
        const fakeRes = { status: () => ({ json: () => {} }) };
        await giftHandler(fakeReq, fakeRes);
        return res.status(200).json({ received: true });
      }

      const email = session.customer_email || session.metadata.patient_email || '';
      const patientName = session.metadata.patient_name || 'Patient';
      const services = session.metadata.services || 'Consultation';
      const amountPaid = (session.amount_total / 100).toFixed(2);

      // Handle Masterclass purchases
      if (services.includes('Surgery Prep Masterclass')) {
        const now = Date.now();
        const expiry = now + (90 * 24 * 60 * 60 * 1000); // 90 days
        const accessCode = 'MC-' + Buffer.from(JSON.stringify({ e: email, x: expiry, t: now })).toString('base64url');

        if (email) {
          await resend.emails.send({
            from: 'OpWell Concierge <info@opwellconcierge.com>',
            to: email,
            subject: 'Your Surgery Prep Masterclass Is Ready',
            html: `
              <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
                <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
                  <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
                  <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">SURGERY PREP MASTERCLASS</p>
                </div>
                <div style="background: #fdf8f4; padding: 40px;">
                  <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Your Masterclass Is Ready!</h2>
                  <p style="color: #555; line-height: 1.7;">Thank you for purchasing the Surgery Prep Masterclass. You now have access to the complete evidence-based guide to preparing for surgery.</p>

                  <div style="background: #2d5a3d; color: #fff; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                    <p style="margin: 0 0 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8;">Your Access Code</p>
                    <p style="margin: 0 0 12px; font-size: 1.1rem; font-weight: 700; letter-spacing: 0.05em; word-break: break-all;">${accessCode}</p>
                    <p style="margin: 0; font-size: 0.78rem; opacity: 0.7;">Valid for 90 days from purchase</p>
                  </div>

                  <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                    <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">How to Access</h3>
                    <ol style="color: #555; line-height: 2; padding-left: 1.25rem;">
                      <li>Go to <a href="https://www.opwellconcierge.com/masterclass" style="color: #2d5a3d; font-weight: 600;">opwellconcierge.com/masterclass</a></li>
                      <li>Enter your access code above</li>
                      <li>Select your surgery type for personalized content</li>
                    </ol>
                  </div>

                  <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
                    <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">Lifetime PDF Access:</strong> <a href="https://www.opwellconcierge.com/OpWell-Surgery-Prep-Masterclass.pdf" style="color: #2d5a3d; font-weight: 600;">Download your PDF here (42 pages)</a> \u2014 this link never expires. Save it, print it, keep it forever.</p>
                  </div>

                  <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 16px 20px; margin: 24px 0; text-align: center;">
                    <p style="margin: 0 0 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #2d5a3d;">Your Clinical Library Access Code</p>
                    <p style="margin: 0 0 6px; font-size: 1.6rem; font-weight: 700; letter-spacing: 0.18em; color: #2d5a3d; font-family: monospace;">${BLOG_ACCESS_CODE}</p>
                    <p style="margin: 0; font-size: 0.78rem; color: #555;">Unlock patient-only blog articles at opwellconcierge.com/blog</p>
                  </div>

                  <p style="color: #555; line-height: 1.7;">If you have questions, reply to this email or call <strong>(678) 235-5822</strong>.</p>
                  <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
                </div>
                <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
                  <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
                </div>
              </div>
            `,
          });

          // Also notify Dr. Oluwole
          await resend.emails.send({
            from: 'OpWell Bookings <info@opwellconcierge.com>',
            to: 'dr.oluwole@opwellconcierge.com',
            subject: `Masterclass Purchase: ${esc(email)} \u2014 $${amountPaid}`,
            html: `<div style="font-family:Arial,sans-serif;padding:24px;"><h2>New Masterclass Purchase</h2><p>Email: ${esc(email)}</p><p>Amount: $${amountPaid}</p><p>Access Code: ${accessCode}</p></div>`,
          });
        }
        return res.status(200).json({ received: true });
      }

      // Auto-save patient to Resend audience for blog notifications
      if (email && process.env.RESEND_AUDIENCE_ID) {
        const sLower = services.toLowerCase();
        let category = 'surgical';
        if (sLower.includes('labor') || sLower.includes('delivery')) category = 'labor';
        else if (sLower.includes('mental') || sLower.includes('wellness')) category = 'mental';
        else if (sLower.includes('executive')) category = 'executive';

        const nameParts = patientName.split(' ');
        try {
          await resend.contacts.create({
            audienceId: process.env.RESEND_AUDIENCE_ID,
            email: email,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            unsubscribed: false,
          });
        } catch (contactErr) {
          console.error('Failed to save contact:', contactErr);
        }
      }

      // Determine masterclass inclusion tier
      const sLowerCheck = services.toLowerCase();
      const includesMasterclassFree = sLowerCheck.includes('complete surgical care') || sLowerCheck.includes('executive package');
      const isConsultation = !includesMasterclassFree && (
        sLowerCheck.includes('consultation') || sLowerCheck.includes('post-operative') ||
        sLowerCheck.includes('labor') || sLowerCheck.includes('delivery')
      );

      // Generate masterclass access code for package patients
      let masterclassCode = '';
      let masterclassSection = '';
      if (includesMasterclassFree && email) {
        const now = Date.now();
        const expiry = now + (90 * 24 * 60 * 60 * 1000);
        masterclassCode = 'MC-' + Buffer.from(JSON.stringify({ e: email, x: expiry, t: now })).toString('base64url');
        masterclassSection = `
                <div style="background: #2d5a3d; color: #fff; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8;">INCLUDED WITH YOUR PACKAGE</p>
                  <p style="margin: 0 0 8px; font-size: 1.1rem; font-weight: 700;">Surgery Prep Masterclass \u2014 FREE ($99 value)</p>
                  <p style="margin: 0 0 4px; font-size: 0.75rem; opacity: 0.8;">Your Access Code:</p>
                  <p style="margin: 0 0 12px; font-size: 1rem; font-weight: 700; letter-spacing: 0.05em; word-break: break-all;">${masterclassCode}</p>
                  <p style="margin: 0; font-size: 0.78rem; opacity: 0.7;">Go to <a href="https://www.opwellconcierge.com/masterclass" style="color: #e8c97a; font-weight: 600;">opwellconcierge.com/masterclass</a> and enter your code</p>
                </div>
                <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 0 0 24px;">
                  <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">PDF Download:</strong> <a href="https://www.opwellconcierge.com/OpWell-Surgery-Prep-Masterclass.pdf" style="color: #2d5a3d; font-weight: 600;">Download your PDF here</a> \u2014 this link never expires.</p>
                </div>`;
      } else if (isConsultation) {
        masterclassSection = `
                <div style="background: linear-gradient(135deg, #f0f7f2 0%, #e8f0eb 100%); border: 2px solid #b8d9c4; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0 0 4px; font-size: 0.7rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #2d5a3d;">PATIENT EXCLUSIVE</p>
                  <p style="margin: 0 0 8px; font-size: 1.05rem; font-weight: 700; color: #3b2a1a;">Surgery Prep Masterclass \u2014 50% Off</p>
                  <p style="margin: 0 0 12px; font-size: 0.88rem; color: #555; line-height: 1.5;">22-module evidence-based guide to prepare your mind and body for surgery. Personalized to your procedure.</p>
                  <p style="margin: 0 0 4px; font-size: 0.8rem; color: #888;"><s>$99</s></p>
                  <p style="margin: 0 0 12px; font-size: 1.4rem; font-weight: 700; color: #2d5a3d;">$49</p>
                  <p style="margin: 0 0 4px; font-size: 0.75rem; font-weight: 700; color: #2d5a3d;">Use code: MASTERCLASS50</p>
                  <a href="https://www.opwellconcierge.com/#products" style="display: inline-block; margin-top: 12px; background: #2d5a3d; color: #fff; padding: 10px 24px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; text-decoration: none;">Get the Masterclass \u2192</a>
                </div>`;
      }

      if (email) {
        // Send patient confirmation
        await resend.emails.send({
          from: 'OpWell Concierge <info@opwellconcierge.com>',
          to: email,
          subject: 'Your OpWell Concierge Booking is Confirmed',
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
              <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
                <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
                <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
              </div>

              <div style="background: #fdf8f4; padding: 40px;">
                <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Your Booking is Confirmed</h2>
                <p style="color: #555; line-height: 1.7;">Dear ${esc(patientName)},</p>
                <p style="color: #555; line-height: 1.7;">Thank you for booking with OpWell Concierge. Your payment has been received and your appointment is confirmed.</p>

                <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                  <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Booking Summary</h3>
                  <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(services)}</p>
                  <p style="margin: 6px 0; color: #555;"><strong>Amount Paid:</strong> $${amountPaid}</p>
                </div>

                ${masterclassSection}

                <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px 24px; margin: 24px 0; text-align: center;">
                  <p style="margin: 0 0 6px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #2d5a3d;">Your Clinical Library Access Code</p>
                  <p style="margin: 0 0 10px; font-size: 2rem; font-weight: 700; letter-spacing: 0.18em; color: #2d5a3d; font-family: monospace;">${BLOG_ACCESS_CODE}</p>
                  <p style="margin: 0; font-size: 0.82rem; color: #555; line-height: 1.5;">Use this code on the <strong>OpWell Blog</strong> to unlock patient-only clinical articles on surgery preparation, recovery, and more.</p>
                </div>

                <h3 style="color: #3b2a1a; font-size: 1rem;">What Happens Next</h3>
                <ol style="color: #555; line-height: 2;">
                  <li>Our team will contact you within 24 hours to set up your intake forms and schedule your telehealth consultation.</li>
                  <li>Your telehealth appointment link will be sent to this email before your consultation.</li>
                  <li>If you have any questions, reply to this email or call us at <strong>(678) 235-5822</strong>.</li>
                </ol>

                <p style="color: #555; line-height: 1.7;">We look forward to supporting you on your medical journey.</p>
                <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
              </div>

              <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
                <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
              </div>
            </div>
          `,
        });
      }

      // Always send doctor notification
      await resend.emails.send({
        from: 'OpWell Bookings <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        subject: `New Payment: ${esc(patientName)} \u2014 $${amountPaid} \u2014 ${esc(services)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 24px 32px;">
              <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Payment Received \u2014 OpWell Concierge</h2>
            </div>
            <div style="padding: 32px; background: #fdf8f4;">
              <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                <tr><td style="padding:8px 0; color:#888; width:140px;">Patient</td><td style="padding:8px 0; font-weight:600;">${esc(patientName)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
                <tr><td style="padding:8px 0; color:#888;">Service</td><td style="padding:8px 0;">${esc(services)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Amount Paid</td><td style="padding:8px 0; font-weight:600; color:#2d5a3d;">$${amountPaid}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Stripe Session</td><td style="padding:8px 0; font-size:0.8rem; color:#888;">${session.id}</td></tr>
                ${masterclassCode ? `<tr><td style="padding:8px 0; color:#888;">Masterclass</td><td style="padding:8px 0; color:#2d5a3d; font-weight:600;">FREE access code sent</td></tr>` : ''}
                ${isConsultation ? `<tr><td style="padding:8px 0; color:#888;">Masterclass</td><td style="padding:8px 0; color:#b85c2b;">50% off code (MASTERCLASS50) included in email</td></tr>` : ''}
              </table>
              <div style="margin-top:24px; padding:16px; background:#fff; border:1px solid #e8d9c8; border-radius:8px;">
                <p style="margin:0; font-size:0.9rem; color:#555;"><strong>Action needed:</strong> Create this patient in Charm Health and schedule their consultation.</p>
              </div>
            </div>
          </div>
        `,
      });
    }

      // Send patient receipt/invoice
      if (email) {
        const serviceItems = services.split(', ');
        const lineItemsHtml = serviceItems.map(s => {
          return `<tr><td style="padding:8px 0; color:#333; border-bottom:1px solid #eee;">${esc(s)}</td><td style="padding:8px 0; text-align:right; color:#333; border-bottom:1px solid #eee;">Included</td></tr>`;
        }).join('');

        await resend.emails.send({
          from: 'OpWell Concierge <info@opwellconcierge.com>',
          to: email,
          subject: `Your OpWell Receipt \u2014 $${amountPaid}`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
              <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
                <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
                <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
              </div>

              <div style="background: #fdf8f4; padding: 40px;">
                <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Payment Receipt</h2>

                <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                  <table style="width:100%; border-collapse:collapse; font-size:0.9rem; margin-bottom: 16px;">
                    <tr><td style="padding:6px 0; color:#888;">Patient</td><td style="padding:6px 0; text-align:right;">${esc(patientName)}</td></tr>
                    <tr><td style="padding:6px 0; color:#888;">Date</td><td style="padding:6px 0; text-align:right;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
                    <tr><td style="padding:6px 0; color:#888;">Transaction ID</td><td style="padding:6px 0; text-align:right; font-size:0.8rem;">${session.payment_intent || session.id}</td></tr>
                  </table>

                  <div style="border-top: 2px solid #e8d9c8; padding-top: 16px;">
                    <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
                      <tr><td style="padding:8px 0; font-weight:700; color:#3b2a1a; border-bottom:2px solid #3b2a1a;">Service</td><td style="padding:8px 0; font-weight:700; color:#3b2a1a; text-align:right; border-bottom:2px solid #3b2a1a;">Details</td></tr>
                      ${lineItemsHtml}
                    </table>
                  </div>

                  <div style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #3b2a1a;">
                    <table style="width:100%; font-size:1rem;">
                      <tr><td style="font-weight:700; color:#3b2a1a;">Total Paid</td><td style="font-weight:700; color:#2d5a3d; text-align:right; font-size:1.2rem;">$${amountPaid}</td></tr>
                    </table>
                  </div>
                </div>

                <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong>HSA/FSA Eligible:</strong> This receipt may be used for Health Savings Account (HSA) or Flexible Spending Account (FSA) reimbursement. Please consult your plan administrator.</p>
                </div>

                <div style="font-size: 0.85rem; color: #888; line-height: 1.6; margin-top: 24px;">
                  <p style="margin: 0;"><strong>OpWell Concierge\u2122</strong></p>
                  <p style="margin: 4px 0;">Dr. Ornella Oluwole, MD</p>
                  <p style="margin: 4px 0;">Telehealth \u2014 GA, OH & VA</p>
                  <p style="margin: 4px 0;">(678) 235-5822 \u00b7 info@opwellconcierge.com</p>
                </div>
              </div>

              <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
                <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
              </div>
            </div>
          `,
        });
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: 'An internal error occurred.' });
  }
};
