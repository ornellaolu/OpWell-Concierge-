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
    const { fname, lname, email, phone, state, message } = req.body;

    if (!fname || !lname || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const patientName = `${fname} ${lname}`.trim();
    const stateLabel = state || 'Not specified';
    const phoneLabel = phone || 'Not provided';

    // Send notification to OpWell
    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      replyTo: email,
      subject: `New Contact Request: ${esc(patientName)} — ${esc(stateLabel)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 24px 32px;">
            <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Contact Request — OpWell Concierge</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
              <tr><td style="padding:8px 0; color:#888; width:140px;">Name</td><td style="padding:8px 0; font-weight:600;">${esc(patientName)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phoneLabel)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">State</td><td style="padding:8px 0; font-weight:600; color:#b85c2b;">${esc(stateLabel)}</td></tr>
            </table>
            <div style="margin-top:24px; padding:16px; background:#fff; border:1px solid #e8d9c8; border-radius:8px;">
              <p style="margin:0 0 8px; font-size:0.8rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#3b2a1a;">Message</p>
              <p style="margin:0; font-size:0.95rem; color:#333; line-height:1.7; white-space:pre-wrap;">${esc(message)}</p>
            </div>
            <div style="margin-top:16px; padding:12px 16px; background:rgba(45,90,61,0.06); border-radius:6px;">
              <p style="margin:0; font-size:0.85rem; color:#555;">Reply directly to this email to respond to the patient at <strong>${esc(email)}</strong>.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
