const { Resend } = require('resend');

// Keep in sync with BLOG_ACCESS_CODE in index.html
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
    const { email, fname, lname, service, procedure, date, time, feedbackConsent } = req.body;

    if (!email) return res.status(400).json({ error: 'No email provided' });

    const patientName = `${fname || ''} ${lname || ''}`.trim() || 'Patient';
    const serviceList = Array.isArray(service) ? service.join(', ') : (service || 'Consultation');

    // Check if booking includes post-op recovery
    const RECOVERY_SERVICES = ['Post-Operative Care', 'Complete Surgical Care Package', 'Executive Package — Complete Concierge Program'];
    const services = Array.isArray(service) ? service : [service || ''];
    const includesRecovery = services.some(s => RECOVERY_SERVICES.some(rs => s.includes(rs)));

    // Send patient confirmation
    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: email,
      subject: 'Your OpWell Concierge Booking is Confirmed',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Your Booking is Confirmed</h2>
            <p style="color: #555; line-height: 1.7;">Dear ${esc(patientName)},</p>
            <p style="color: #555; line-height: 1.7;">Thank you for booking with OpWell Concierge. Your payment has been received and your appointment is confirmed.</p>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Booking Summary</h3>
              <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(serviceList)}</p>
              ${procedure ? `<p style="margin: 6px 0; color: #555;"><strong>Procedure Type:</strong> ${esc(procedure)}</p>` : ''}
              ${date ? `<p style="margin: 6px 0; color: #555;"><strong>Preferred Date:</strong> ${esc(date)}</p>` : ''}
              ${time ? `<p style="margin: 6px 0; color: #555;"><strong>Preferred Time:</strong> ${esc(time)}</p>` : ''}
            </div>

            <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px 24px; margin: 24px 0; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #2d5a3d;">Your Clinical Library Access Code</p>
              <p style="margin: 0 0 10px; font-size: 2rem; font-weight: 700; letter-spacing: 0.18em; color: #2d5a3d; font-family: monospace;">${BLOG_ACCESS_CODE}</p>
              <p style="margin: 0; font-size: 0.82rem; color: #555; line-height: 1.5;">Use this code on the <strong>OpWell Blog</strong> to unlock patient-only clinical articles on surgery preparation, recovery, and more.</p>
            </div>

            ${includesRecovery ? `
            <div style="background: #fdf8f4; border: 1px solid #e8d9c8; border-left: 4px solid #2d5a3d; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 1rem; font-weight: 700; color: #3b2a1a;">Your Recovery Check-In Tool</p>
              <p style="margin: 0 0 14px; font-size: 0.88rem; color: #555; line-height: 1.6;">As part of your post-operative care, you'll use our mobile recovery check-in tool between follow-up calls. It takes about 3 minutes and helps Dr. Oluwole monitor your healing.</p>
              <p style="margin: 0 0 6px; font-size: 0.82rem; color: #888;">Use your access code <strong style="color: #2d5a3d; font-family: monospace; letter-spacing: 0.1em;">${BLOG_ACCESS_CODE}</strong> to log in.</p>
              <div style="text-align: center; margin-top: 16px;">
                <a href="https://opwellconcierge.com/patient-recovery-checkin.html" style="display: inline-block; padding: 12px 28px; background: #2d5a3d; color: #fff; border-radius: 8px; font-family: Arial, sans-serif; font-size: 0.92rem; font-weight: 600; text-decoration: none;">Open Recovery Check-In →</a>
              </div>
            </div>
            ` : ''}

            <h3 style="color: #3b2a1a; font-size: 1rem;">What Happens Next</h3>
            <ol style="color: #555; line-height: 2;">
              <li>You will receive a separate email from <strong>Charm Health</strong> with your patient portal login to complete your intake forms.</li>
              <li>Your telehealth appointment link will be sent to this email before your consultation.</li>
              <li>If you have any questions before your appointment, reply to this email or call us at <strong>(678) 235-5822</strong>.</li>
            </ol>

            <p style="color: #555; line-height: 1.7;">We look forward to supporting you on your surgical journey.</p>
            <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    // Send doctor notification
    await resend.emails.send({
      from: 'OpWell Bookings <info@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: `New Booking: ${esc(patientName)} — ${esc(serviceList)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 24px 32px;">
            <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">New Patient Booking — OpWell Concierge</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
              <tr><td style="padding:8px 0; color:#888; width:140px;">Patient</td><td style="padding:8px 0; font-weight:600;">${esc(patientName)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0; color:#888;">Service</td><td style="padding:8px 0;">${esc(serviceList)}</td></tr>
              ${procedure ? `<tr><td style="padding:8px 0; color:#888;">Procedure</td><td style="padding:8px 0;">${esc(procedure)}</td></tr>` : ''}
              ${date ? `<tr><td style="padding:8px 0; color:#888;">Preferred Date</td><td style="padding:8px 0; font-weight:600; color:#b85c2b;">${esc(date)}</td></tr>` : ''}
              ${time ? `<tr><td style="padding:8px 0; color:#888;">Preferred Time</td><td style="padding:8px 0; font-weight:600; color:#b85c2b;">${esc(time)}</td></tr>` : ''}
              <tr><td style="padding:8px 0; color:#888;">Feedback Consent</td><td style="padding:8px 0;">${feedbackConsent ? 'Yes ✓' : 'No'}</td></tr>
            </table>
            <div style="margin-top:24px; padding:16px; background:#fff; border:1px solid #e8d9c8; border-radius:8px;">
              <p style="margin:0; font-size:0.9rem; color:#555;">Reply to this email or contact the patient directly to confirm their preferred time slot.</p>
            </div>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
