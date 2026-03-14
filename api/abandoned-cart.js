const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { action } = req.body;

    if (action === 'capture') {
      // Called from frontend when user completes Step 1 (enters email)
      // Store in Resend contacts with 'pending' tag for later follow-up
      const { email, fname, lname, service } = req.body;

      if (!email) return res.status(400).json({ error: 'Email required' });

      const audienceId = process.env.RESEND_AUDIENCE_ID;
      if (audienceId) {
        try {
          await resend.contacts.create({
            audienceId,
            email,
            firstName: fname || '',
            lastName: lname || '',
            unsubscribed: false,
          });
        } catch (e) {
          // Contact may already exist, that's fine
        }
      }

      return res.status(200).json({ success: true });

    } else if (action === 'recover') {
      // Called manually or via cron to send recovery email
      const { email, fname, service } = req.body;

      if (!email) return res.status(400).json({ error: 'Email required' });

      const name = fname || 'there';
      const serviceText = service ? ` for <strong>${esc(service)}</strong>` : '';

      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: email,
        subject: 'Complete Your OpWell Booking',
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
              <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
              <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
            </div>

            <div style="background: #fdf8f4; padding: 40px;">
              <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">You\u2019re Almost There</h2>
              <p style="color: #555; line-height: 1.7;">Hi ${esc(name)},</p>
              <p style="color: #555; line-height: 1.7;">We noticed you started booking a consultation${serviceText} but didn\u2019t complete your booking. We\u2019d love to help you take the next step in your medical journey.</p>

              <div style="text-align: center; margin: 32px 0;">
                <a href="https://opwellconcierge.com?page=schedule" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem;">Complete Your Booking \u2192</a>
              </div>

              <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                <h3 style="color: #2d5a3d; margin-top: 0; font-size: 1rem;">Why OpWell?</h3>
                <ul style="color: #555; line-height: 2; padding-left: 20px;">
                  <li>Board-certified anesthesiologist-led consultations</li>
                  <li>Personalized surgical preparation protocols</li>
                  <li>Convenient telehealth from the comfort of home</li>
                  <li>HSA/FSA eligible</li>
                </ul>
              </div>

              <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px 24px; margin: 24px 0; text-align: center;">
                <p style="margin: 0 0 8px; font-size: 0.9rem; color: #555;">Use code <strong style="color: #2d5a3d; font-size: 1.1rem; letter-spacing: 0.08em;">WELCOME25</strong> for 25% off your first consultation.</p>
              </div>

              <p style="color: #555; line-height: 1.7;">Have questions? Reply to this email or call us at <strong>(678) 235-5822</strong>.</p>
              <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
            </div>

            <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
            </div>
          </div>
        `,
      });

      return res.status(200).json({ success: true });

    } else {
      return res.status(400).json({ error: 'Invalid action. Use "capture" or "recover".' });
    }
  } catch (err) {
    console.error('Abandoned cart error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
