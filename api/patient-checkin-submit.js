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
    const {
      firstName,
      lastName,
      phone,
      surgeryType,
      surgeryDate,
      responses = {},
      flags = [],
      surgeryFlags = {},
      qor15 = {},
      riskLevel,
      patientEmail,
      notes,
      timestamp
    } = req.body;

    // Extract response fields from nested object
    const {
      painRest = null,
      painActivity = null,
      painManaged = null,
      drainage = null,
      opening = null,
      redness = null,
      nausea = null,
      vomiting = null,
      intake = null,
      anxiety = null,
      mood = null
    } = responses;

    if (!firstName || !lastName || !phone || !surgeryType || !surgeryDate) {
      return res.status(400).json({ error: 'Missing required patient information' });
    }

    const fullName = `${firstName} ${lastName}`;
    const podDays = Math.floor((new Date() - new Date(surgeryDate)) / (1000 * 60 * 60 * 24));

    // Build email to Dr. Oluwole with check-in summary
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #2c2c2c;">
        <div style="background: #3b2a1a; padding: 24px 32px;">
          <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">Patient Recovery Check-In Submitted</h2>
        </div>
        <div style="padding: 32px; background: #fdf8f4;">
          <h3 style="color: #3b2a1a; margin-top: 0;">Patient Information</h3>
          <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom: 24px;">
            <tr><td style="padding:8px 0; color:#888; width:140px;">Name</td><td style="padding:8px 0; font-weight:600;">${esc(fullName)}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phone)}</td></tr>
            ${patientEmail ? `<tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(patientEmail)}">${esc(patientEmail)}</a></td></tr>` : ''}
            <tr><td style="padding:8px 0; color:#888;">Surgery Type</td><td style="padding:8px 0; font-weight:600;">${esc(surgeryType)}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">Surgery Date</td><td style="padding:8px 0;">${surgeryDate}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">POD</td><td style="padding:8px 0; font-weight:600;">${podDays} days post-op</td></tr>
          </table>

          <h3 style="color: #3b2a1a; margin: 24px 0 0;">Check-In Responses</h3>
          <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <h4 style="margin-top: 0; color: #2d5a3d; font-size: 0.95rem;">Pain Assessment</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">At Rest:</td><td style="padding:6px 0; font-weight:600;">${painRest || 'N/A'}/10</td></tr>
              <tr><td style="padding:6px 0;">With Activity:</td><td style="padding:6px 0; font-weight:600;">${painActivity || 'N/A'}/10</td></tr>
              <tr><td style="padding:6px 0;">Medication Helping:</td><td style="padding:6px 0; font-weight:600;">${painManaged || 'N/A'}</td></tr>
            </table>

            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">Wound Assessment</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">Drainage:</td><td style="padding:6px 0; font-weight:600;">${drainage || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Incision Opening:</td><td style="padding:6px 0; font-weight:600;">${opening || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Redness/Swelling:</td><td style="padding:6px 0; font-weight:600;">${redness || 'N/A'}</td></tr>
            </table>

            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">Gastrointestinal & Mental Health</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">Nausea:</td><td style="padding:6px 0; font-weight:600;">${nausea || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Vomiting:</td><td style="padding:6px 0; font-weight:600;">${vomiting || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Appetite/Intake:</td><td style="padding:6px 0; font-weight:600;">${intake || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Anxiety Level:</td><td style="padding:6px 0; font-weight:600;">${anxiety || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Mood:</td><td style="padding:6px 0; font-weight:600;">${mood || 'N/A'}</td></tr>
            </table>

            ${qor15 && qor15.total ? `
            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">QoR-15 Score</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">Total Score:</td><td style="padding:6px 0; font-weight:600;">${qor15.total} / 150</td></tr>
            </table>
            ` : ''}

            ${notes ? `
            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">Additional Notes</h4>
            <p style="margin: 8px 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${esc(notes)}</p>
            ` : ''}
          </div>

          ${(flags && flags.some(f => f)) || riskLevel ? `
          <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
            <p style="margin: 0 0 8px; color: #991b1b; font-weight: 700;">⚠️ RED FLAG SYMPTOMS REPORTED</p>
            <p style="margin: 0; color: #7f1d1d; font-size: 0.9rem;">Patient reported concerning symptoms. Review check-in details and contact patient immediately if needed.${riskLevel ? ` Risk Level: ${riskLevel}` : ''}</p>
          </div>
          ` : ''}

          <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 0.85rem; color: #555;">Submitted: ${timestamp ? new Date(timestamp).toLocaleString() : 'Just now'}</p>
          </div>
        </div>
      </div>
    `;

    // Send email to Dr. Oluwole with check-in summary
    try {
      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        subject: `Recovery Check-In: ${esc(fullName)} — POD ${podDays}`,
        html: emailHtml,
      });
    } catch (emailErr) {
      console.error('Failed to send email to Dr. Oluwole:', emailErr);
      // Continue even if this fails - patient check-in was received
    }

    // Send confirmation to patient if email provided
    if (patientEmail && patientEmail.includes('@')) {
      try {
        await resend.emails.send({
          from: 'OpWell Concierge <info@opwellconcierge.com>',
          to: patientEmail,
          subject: 'Your Recovery Check-In Has Been Received',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
              <div style="background: #3b2a1a; padding: 24px 32px;">
                <h2 style="color: #e8c97a; margin: 0; font-size: 1.1rem;">Check-In Received ✓</h2>
              </div>
              <div style="padding: 32px; background: #fdf8f4;">
                <p style="color: #555; line-height: 1.7;">Hi ${esc(firstName)},</p>
                <p style="color: #555; line-height: 1.7;">Thank you for completing your recovery check-in. Dr. Oluwole has received your response and will review it shortly.</p>
                <div style="background: #f0f7f2; border-left: 4px solid #2d5a3d; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 0.85rem; color: #555;"><strong style="color: #2d5a3d;">If you have urgent concerns</strong>, please call (678) 235-5822 rather than waiting for a response.</p>
                </div>
                <p style="color: #555; line-height: 1.7;">Keep supporting your healing, and we'll be in touch soon.</p>
                <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error('Failed to send confirmation email to patient:', emailErr);
        // Continue even if this fails - patient check-in was received
      }
    }

    return res.status(200).json({ success: true, message: 'Check-in submitted successfully' });

  } catch (err) {
    console.error('Patient check-in submission error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
