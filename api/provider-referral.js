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
    const { type } = req.body;

    if (type === 'referral') {
      const { providerName, practice, providerEmail, providerPhone, patientName, patientEmail, patientPhone, service, procedure, notes } = req.body;

      if (!providerName || !practice || !providerEmail || !patientName || !patientEmail || !service) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        replyTo: providerEmail,
        subject: `New Referral: ${esc(patientName)} — ${esc(service)} (from ${esc(providerName)})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 24px 32px;">
              <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Patient Referral — OpWell Concierge</h2>
            </div>
            <div style="padding: 32px; background: #fdf8f4;">
              <div style="margin-bottom: 24px; padding: 16px; background: rgba(45,90,61,0.06); border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #2d5a3d;">Referring Provider</p>
                <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                  <tr><td style="padding:6px 0; color:#888; width:120px;">Name</td><td style="padding:6px 0; font-weight:600;">${esc(providerName)}</td></tr>
                  <tr><td style="padding:6px 0; color:#888;">Practice</td><td style="padding:6px 0;">${esc(practice)}</td></tr>
                  <tr><td style="padding:6px 0; color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${esc(providerEmail)}">${esc(providerEmail)}</a></td></tr>
                  ${providerPhone ? `<tr><td style="padding:6px 0; color:#888;">Phone</td><td style="padding:6px 0;">${esc(providerPhone)}</td></tr>` : ''}
                </table>
              </div>

              <div style="margin-bottom: 24px; padding: 16px; background: rgba(184,92,43,0.06); border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #b85c2b;">Patient Information</p>
                <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                  <tr><td style="padding:6px 0; color:#888; width:120px;">Patient</td><td style="padding:6px 0; font-weight:600;">${esc(patientName)}</td></tr>
                  <tr><td style="padding:6px 0; color:#888;">Email</td><td style="padding:6px 0;"><a href="mailto:${esc(patientEmail)}">${esc(patientEmail)}</a></td></tr>
                  ${patientPhone ? `<tr><td style="padding:6px 0; color:#888;">Phone</td><td style="padding:6px 0;">${esc(patientPhone)}</td></tr>` : ''}
                  <tr><td style="padding:6px 0; color:#888;">Service</td><td style="padding:6px 0; font-weight:600; color:#b85c2b;">${esc(service)}</td></tr>
                  ${procedure ? `<tr><td style="padding:6px 0; color:#888;">Procedure</td><td style="padding:6px 0;">${esc(procedure)}</td></tr>` : ''}
                </table>
              </div>

              ${notes ? `
              <div style="padding: 16px; background: #fff; border: 1px solid #e8d9c8; border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #3b2a1a;">Additional Notes</p>
                <p style="margin: 0; font-size: 0.95rem; color: #333; line-height: 1.7; white-space: pre-wrap;">${esc(notes)}</p>
              </div>
              ` : ''}

              <div style="margin-top: 16px; padding: 12px 16px; background: rgba(45,90,61,0.06); border-radius: 6px;">
                <p style="margin: 0; font-size: 0.85rem; color: #555;">Reply to this email to respond directly to <strong>${esc(providerName)}</strong> at ${esc(providerEmail)}.</p>
              </div>
            </div>
          </div>
        `,
      });

    } else if (type === 'partnership') {
      const { providerName, title, practice, providerEmail, providerPhone, state, specialty, message } = req.body;

      if (!providerName || !title || !practice || !providerEmail || !state || !specialty || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        replyTo: providerEmail,
        subject: `Partnership Inquiry: ${esc(providerName)} — ${esc(practice)} (${esc(specialty)})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 24px 32px;">
              <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">Partnership Inquiry — OpWell Concierge</h2>
            </div>
            <div style="padding: 32px; background: #fdf8f4;">
              <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                <tr><td style="padding:8px 0; color:#888; width:140px;">Name</td><td style="padding:8px 0; font-weight:600;">${esc(providerName)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Title</td><td style="padding:8px 0;">${esc(title)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Practice</td><td style="padding:8px 0;">${esc(practice)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(providerEmail)}">${esc(providerEmail)}</a></td></tr>
                ${providerPhone ? `<tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(providerPhone)}</td></tr>` : ''}
                <tr><td style="padding:8px 0; color:#888;">State</td><td style="padding:8px 0; font-weight:600; color:#b85c2b;">${esc(state)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Specialty</td><td style="padding:8px 0; font-weight:600;">${esc(specialty)}</td></tr>
              </table>

              <div style="margin-top: 24px; padding: 16px; background: #fff; border: 1px solid #e8d9c8; border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #3b2a1a;">Message</p>
                <p style="margin: 0; font-size: 0.95rem; color: #333; line-height: 1.7; white-space: pre-wrap;">${esc(message)}</p>
              </div>

              <div style="margin-top: 16px; padding: 12px 16px; background: rgba(45,90,61,0.06); border-radius: 6px;">
                <p style="margin: 0; font-size: 0.85rem; color: #555;">Reply to this email to respond directly to <strong>${esc(providerName)}</strong> at ${esc(providerEmail)}.</p>
              </div>
            </div>
          </div>
        `,
      });

    } else {
      return res.status(400).json({ error: 'Invalid form type' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Provider referral error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
