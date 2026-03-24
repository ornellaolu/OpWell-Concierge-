const { Resend } = require('resend');

const BLOG_ACCESS_CODE = 'OPWELL2026';

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const {
      service,
      gifterName, gifterEmail,
      recipientName, recipientEmail,
      giftMessage
    } = req.body;

    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    if (!gifterEmail || !isValidEmail(gifterEmail) || !recipientEmail || !isValidEmail(recipientEmail)) {
      return res.status(400).json({ error: 'Valid gifter and recipient emails are required' });
    }

    const serviceName = service || 'OpWell Consultation';
    const safeGifterName = gifterName || 'Someone special';
    const safeRecipientName = recipientName || 'Friend';

    // 1. Send gift card email to RECIPIENT
    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: recipientEmail,
      subject: `You've received an OpWell Concierge gift from ${esc(safeGifterName)}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">A GIFT OF CARE</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">You've Been Gifted Expert Care</h2>
            <p style="color: #555; line-height: 1.7;">Dear ${esc(safeRecipientName)},</p>
            <p style="color: #555; line-height: 1.7;"><strong>${esc(safeGifterName)}</strong> has gifted you a consultation with OpWell Concierge — a board-certified anesthesiologist-led telehealth practice that helps patients prepare for surgery and recover with confidence.</p>

            ${giftMessage ? `
            <div style="background: #fff; border-left: 4px solid #e8c97a; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
              <p style="margin: 0 0 4px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #888;">Personal Message</p>
              <p style="margin: 0; color: #555; font-style: italic; line-height: 1.7;">"${esc(giftMessage)}"</p>
              <p style="margin: 8px 0 0; font-size: 0.85rem; color: #888;">— ${esc(safeGifterName)}</p>
            </div>
            ` : ''}

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Your Gift</h3>
              <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(serviceName)}</p>
              <p style="margin: 6px 0; color: #555;"><strong>Status:</strong> Fully Paid ✓</p>
            </div>

            <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px 24px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #2d5a3d;">Your Clinical Library Access Code</p>
              <p style="margin: 0 0 10px; font-size: 2rem; font-weight: 700; letter-spacing: 0.18em; color: #2d5a3d; font-family: monospace;">${BLOG_ACCESS_CODE}</p>
              <p style="margin: 0; font-size: 0.82rem; color: #555; line-height: 1.5;">Use this code on the <strong>OpWell Blog</strong> to unlock patient-only clinical articles.</p>
            </div>

            <h3 style="color: #3b2a1a; font-size: 1rem;">How to Book Your Appointment</h3>
            <ol style="color: #555; line-height: 2;">
              <li>Visit <a href="https://opwellconcierge.com" style="color: #2d5a3d; font-weight: 600;">opwellconcierge.com</a> and click <strong>Get Started</strong>.</li>
              <li>Create your patient profile through <strong>Charm Health</strong> (our secure patient portal).</li>
              <li>Select a date and time that works for your schedule.</li>
              <li>Your consultation is already paid for — no payment needed at booking.</li>
            </ol>

            <p style="color: #555; line-height: 1.7;">If you have any questions, call us at <strong>(678) 235-5822</strong> or reply to this email.</p>
            <p style="color: #555; line-height: 1.7;">We look forward to supporting you on your journey.</p>
            <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    // 2. Send receipt/confirmation to GIFTER
    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: gifterEmail,
      subject: `Your OpWell gift for ${esc(safeRecipientName)} has been sent`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">GIFT CONFIRMATION</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Your Gift Has Been Sent</h2>
            <p style="color: #555; line-height: 1.7;">Dear ${esc(safeGifterName)},</p>
            <p style="color: #555; line-height: 1.7;">Thank you for giving the gift of expert care. Your recipient has been notified and will receive instructions to book their appointment.</p>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Gift Receipt</h3>
              <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(serviceName)}</p>
              <p style="margin: 6px 0; color: #555;"><strong>Gifted To:</strong> ${esc(safeRecipientName)} (${esc(recipientEmail)})</p>
              <p style="margin: 6px 0; color: #555;"><strong>Status:</strong> Payment Received ✓</p>
            </div>

            <p style="color: #555; line-height: 1.7;"><strong>${esc(safeRecipientName)}</strong> will book their own appointment at a time that works for them. You've given them something truly meaningful — expert medical support when they need it most.</p>

            <p style="color: #555; line-height: 1.7;">If you have any questions, call us at <strong>(678) 235-5822</strong> or reply to this email.</p>
            <p style="color: #555; line-height: 1.7;">With gratitude,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    // 3. Notify Dr. Oluwole
    await resend.emails.send({
      from: 'OpWell Gifts <info@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: `New Gift Purchase: ${esc(serviceName)} — for ${esc(safeRecipientName)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 24px 32px;">
            <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Gift Purchase — OpWell Concierge</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
              <tr><td style="padding:8px 0; color:#888; width:140px;">Gift Service</td><td style="padding:8px 0; font-weight:600;">${esc(serviceName)}</td></tr>
              <tr><td colspan="2" style="padding:12px 0 4px; font-weight:700; color:#3b2a1a;">Purchased By</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Name</td><td style="padding:8px 0;">${esc(safeGifterName)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(gifterEmail)}">${esc(gifterEmail)}</a></td></tr>
              <tr><td colspan="2" style="padding:12px 0 4px; font-weight:700; color:#3b2a1a;">Recipient</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Name</td><td style="padding:8px 0;">${esc(safeRecipientName)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(recipientEmail)}">${esc(recipientEmail)}</a></td></tr>
            </table>
            <div style="margin-top:24px; padding:16px; background:#fff; border:1px solid #e8d9c8; border-radius:8px;">
              <p style="margin:0; font-size:0.9rem; color:#555;">Recipient has been emailed with booking instructions. They will create a Charm Health profile and book like any other patient.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Gift email error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
