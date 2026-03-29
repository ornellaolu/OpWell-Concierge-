const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const CHECKIN_SCHEDULE = {
  'day-1':  { label: '24-Hour Check-In', dayNum: 1, message: 'It\'s been 24 hours since your surgery. This is the most important window for monitoring your recovery.' },
  'day-3':  { label: '72-Hour Check-In', dayNum: 3, message: 'You\'re 3 days post-surgery. By now, initial swelling and discomfort should be stabilizing.' },
  'week-1': { label: '1-Week Check-In', dayNum: 7, message: 'You\'re one week into your recovery. This is a great time to assess your progress across all recovery domains.' },
  'week-2': { label: '2-Week Check-In', dayNum: 14, message: 'Two weeks post-surgery. Many patients notice meaningful improvement around this time.' },
  'week-3': { label: '3-Week Check-In', dayNum: 21, message: 'Three weeks in. Your body is doing important healing work — let\'s make sure everything is on track.' },
  'week-4': { label: '4-Week / Final Check-In', dayNum: 28, message: 'You\'re approaching one month post-surgery. This check-in helps us make sure your recovery is progressing well as we wrap up your 30-day monitoring.' },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.headers['x-admin-key'] !== process.env.ADMIN_NOTIFY_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, patientName, interval, procedure } = req.body;

    if (!email || !patientName) {
      return res.status(400).json({ error: 'Email and patient name are required' });
    }

    const checkin = CHECKIN_SCHEDULE[interval];
    if (!checkin) {
      return res.status(400).json({ error: `Invalid interval. Use: ${Object.keys(CHECKIN_SCHEDULE).join(', ')}` });
    }

    const firstName = patientName.split(' ')[0] || 'there';
    const procedureText = procedure ? ` after your ${esc(procedure)}` : '';

    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: email,
      subject: `${checkin.label} — How Are You Feeling${procedureText}?`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">POST-OPERATIVE RECOVERY</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <div style="background: #2d5a3d; color: #fff; border-radius: 8px; padding: 16px 20px; text-align: center; margin-bottom: 24px;">
              <p style="margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8;">Recovery Day ${checkin.dayNum}</p>
              <p style="margin: 6px 0 0; font-size: 1.2rem; font-weight: 700;">${checkin.label}</p>
            </div>

            <p style="color: #555; line-height: 1.7;">Hi ${esc(firstName)},</p>
            <p style="color: #555; line-height: 1.7;">${checkin.message}</p>
            <p style="color: #555; line-height: 1.7;">Your recovery check-in takes about <strong>3 minutes</strong> and helps Dr. Oluwole monitor your progress across 7 clinical domains — so we can catch anything early and make sure you're healing well.</p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="https://www.opwellconcierge.com/patient-recovery-checkin.html" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem; letter-spacing: 0.03em;">Start Your Check-In \u2192</a>
            </div>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 0.85rem; font-weight: 700; color: #3b2a1a;">What we're monitoring:</p>
              <table style="width: 100%; font-size: 0.85rem; color: #555;">
                <tr><td style="padding: 4px 0;">Pain levels</td><td style="padding: 4px 0;">Wound healing</td></tr>
                <tr><td style="padding: 4px 0;">GI function</td><td style="padding: 4px 0;">Mobility</td></tr>
                <tr><td style="padding: 4px 0;">Mental health</td><td style="padding: 4px 0;">Red flag symptoms</td></tr>
                <tr><td style="padding: 4px 0;" colspan="2">Vital signs (when applicable)</td></tr>
              </table>
            </div>

            <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">Need to talk to Dr. Oluwole?</strong> If anything feels wrong or you have urgent concerns, don't wait for your check-in. Call <strong>(678) 235-5822</strong> or reply to this email.</p>
            </div>

            <p style="color: #555; line-height: 1.7;">We're here for you throughout your recovery.</p>
            <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true, interval, dayNum: checkin.dayNum });
  } catch (err) {
    console.error('Recovery check-in email error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
