const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fname, lname, email, phone, state, message } = req.body;

    // Validate required fields
    if (!fname || !lname || !email || !state || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send contact email to Dr. Oluwole
    await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: `New Contact Form Submission: ${fname} ${lname}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 24px 32px;">
            <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Contact Form Submission</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <h3 style="color: #3b2a1a; margin-top: 0;">Visitor Information</h3>
            <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom: 24px;">
              <tr><td style="padding:8px 0; color:#888; width:140px;">Name</td><td style="padding:8px 0; font-weight:600;">${esc(fname)} ${esc(lname)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phone || 'Not provided')}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">State</td><td style="padding:8px 0;">${esc(state)}</td></tr>
            </table>

            <h3 style="color: #3b2a1a; margin: 24px 0 0;">Message</h3>
            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px; margin: 16px 0;">
              <p style="margin: 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${esc(message)}</p>
            </div>

            <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555;">
                <strong>Reply to:</strong> <a href="mailto:${esc(email)}">${esc(email)}</a><br>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      `
    });

    // Send confirmation email to visitor
    await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: email,
      subject: 'We Received Your Message — OpWell Concierge',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">PERIOPERATIVE CARE</p>
          </div>
          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Thank You for Contacting OpWell</h2>
            <p style="color: #555; line-height: 1.7;">Hi ${esc(fname)},</p>
            <p style="color: #555; line-height: 1.7;">We received your message and appreciate you reaching out. Dr. Oluwole and the OpWell team typically respond to inquiries within 1-2 business days.</p>

            <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #2d5a3d; font-size: 1rem;">What Happens Next</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
                <li>Dr. Oluwole's team will review your message</li>
                <li>You'll receive a personalized response via email</li>
                <li>For urgent matters, call <strong>(678) 235-5822</strong></li>
              </ul>
            </div>

            <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">Ready to book?</strong> Visit our scheduling page to book your consultation directly.</p>
            </div>

            <p style="color: #555; line-height: 1.7; margin-bottom: 0;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>
          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'Contact form submitted successfully'
    });

  } catch (err) {
    console.error('Contact form error:', err.message);
    return res.status(500).json({
      error: 'Failed to process contact form. Please try again or call (678) 235-5822.',
      details: err.message
    });
  }
};
