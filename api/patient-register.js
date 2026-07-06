const { Resend } = require('resend');
const db = require('../lib/db');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { name, email, phone, surgeryType, surgeryDate } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !surgeryType || !surgeryDate) {
      return res.status(400).json({ error: 'Missing required fields: name, email, phone, surgeryType, surgeryDate' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Create patient record
    const patient = await db.createPatient({
      name,
      email,
      phone,
      surgeryType,
      surgeryDate
    });

    // Calculate first check-in day (24 hours post-op)
    const surgeryDateObj = new Date(surgeryDate);
    const firstCheckInDate = new Date(surgeryDateObj);
    firstCheckInDate.setDate(firstCheckInDate.getDate() + 1);

    const checkInUrl = `https://www.opwellconcierge.com/recovery-checkin?token=${patient.token}&day=1`;
    const firstName = name.split(' ')[0];

    // Send welcome email with first check-in link
    await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: email,
      subject: 'Your OpWell Recovery Monitoring Program Begins',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">POST-OPERATIVE RECOVERY</p>
          </div>
          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Welcome to Your Recovery Monitoring</h2>
            <p style="color: #555; line-height: 1.7;">Hi ${esc(firstName)},</p>
            <p style="color: #555; line-height: 1.7;">Thank you for choosing OpWell Concierge for your post-operative care. Dr. Oluwole is committed to monitoring your recovery closely and ensuring you heal safely.</p>

            <div style="background: #2d5a3d; color: #fff; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.9; text-align: center;">Your Access Code</p>
              <p style="margin: 0 0 16px; text-align: center; font-family: monospace; background: rgba(0,0,0,0.2); padding: 12px; border-radius: 6px; font-size: 1.2rem; font-weight: 700; letter-spacing: 0.05em; word-break: break-all;">${patient.token}</p>
              <p style="margin: 0 0 16px; font-size: 0.9rem; opacity: 0.9; text-align: center;"><strong>Your First Check-In</strong><br>24 Hours After Surgery</p>
              <p style="margin: 0 0 20px; font-size: 0.85rem; opacity: 0.9; text-align: center;">Scheduled for ${firstCheckInDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              <div style="text-align: center;">
                <a href="${checkInUrl}" style="display: inline-block; background: #C8845A; color: #fff; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 1rem;">Start Your First Check-In</a>
              </div>
              <p style="margin: 12px 0 0; font-size: 0.85rem; opacity: 0.8; text-align: center;">Or enter your access code on our website</p>
            </div>

            <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #2d5a3d; font-size: 1rem;">What to Expect</h3>
              <ul style="margin: 0; padding-left: 20px; color: #555; line-height: 1.8;">
                <li><strong>Takes 3 minutes</strong> — Simple questions about your recovery</li>
                <li><strong>Daily check-ins</strong> — We'll send reminders on Days 1, 3, 7, 14, 21, and 28</li>
                <li><strong>Real-time monitoring</strong> — Dr. Oluwole reviews your responses immediately</li>
                <li><strong>Red flag alerts</strong> — We notify you and Dr. Oluwole of any concerning symptoms</li>
              </ul>
            </div>

            <p style="color: #555; line-height: 1.7;"><strong>Important:</strong> If you experience any medical emergency (severe pain, difficulty breathing, signs of infection), please call 911 or contact your surgeon immediately. Do not wait for a check-in reminder.</p>

            <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">Questions?</strong> Call (678) 235-5822 or reply to this email.</p>
            </div>

            <p style="color: #555; line-height: 1.7; margin-bottom: 0;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>
          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `
    });

    // Send confirmation to Dr. Oluwole
    await resend.emails.send({
      from: 'OpWell Admin <onboarding@resend.dev>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: `New Patient Enrolled: ${esc(name)} — ${esc(surgeryType)}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 24px 32px;">
            <h2 style="color: #e8c97a; margin: 0; font-size: 1.1rem;">New Patient Enrolled in Recovery Program</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
              <tr><td style="padding:8px 0; color:#888; width:140px;">Patient Name</td><td style="padding:8px 0; font-weight:600;">${esc(name)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
              <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phone)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Surgery Type</td><td style="padding:8px 0; font-weight:600;">${esc(surgeryType)}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Surgery Date</td><td style="padding:8px 0; font-weight:600;">${surgeryDate}</td></tr>
              <tr><td style="padding:8px 0; color:#888;">Patient ID</td><td style="padding:8px 0; font-family: monospace;">${patient.id}</td></tr>
            </table>
            <p style="color: #555; margin-top: 16px; font-size: 0.9rem;">Patient will receive their first 24-hour check-in reminder on ${firstCheckInDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}.</p>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      patientId: patient.id,
      message: 'Patient registered successfully. First check-in email sent.'
    });

  } catch (err) {
    console.error('Patient registration error:', err.message, err.stack);
    const errorMsg = err.message || 'An internal error occurred. Please try again.';
    return res.status(500).json({ error: errorMsg, details: err.message });
  }
};
