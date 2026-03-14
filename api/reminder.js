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
    const { email, patientName, service, date, time, telehealthLink } = req.body;

    if (!email || !patientName) {
      return res.status(400).json({ error: 'Email and patient name are required' });
    }

    await resend.emails.send({
      from: 'OpWell Concierge <info@opwellconcierge.com>',
      to: email,
      subject: `Appointment Reminder \u2014 ${esc(date || 'Upcoming')} at ${esc(time || 'Scheduled Time')}`,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
          </div>

          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Your Appointment Is Coming Up</h2>
            <p style="color: #555; line-height: 1.7;">Dear ${esc(patientName)},</p>
            <p style="color: #555; line-height: 1.7;">This is a friendly reminder about your upcoming telehealth consultation with OpWell Concierge.</p>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Appointment Details</h3>
              ${service ? `<p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(service)}</p>` : ''}
              ${date ? `<p style="margin: 6px 0; color: #555;"><strong>Date:</strong> ${esc(date)}</p>` : ''}
              ${time ? `<p style="margin: 6px 0; color: #555;"><strong>Time:</strong> ${esc(time)}</p>` : ''}
              <p style="margin: 6px 0; color: #555;"><strong>Format:</strong> Telehealth (video call)</p>
            </div>

            ${telehealthLink ? `
            <div style="text-align: center; margin: 28px 0;">
              <a href="${esc(telehealthLink)}" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem;">Join Your Telehealth Session \u2192</a>
            </div>
            ` : ''}

            <div style="background: rgba(184,92,43,0.06); border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
              <h3 style="color: #b85c2b; margin-top: 0; font-size: 1rem;">Before Your Appointment</h3>
              <ul style="color: #555; line-height: 2; padding-left: 20px;">
                <li>Find a quiet, private space with good lighting</li>
                <li>Ensure a stable internet connection</li>
                <li>Have your medication list and medical records nearby</li>
                <li>Prepare any questions you'd like to discuss</li>
                <li>Complete your intake forms if you haven't already</li>
              </ul>
            </div>

            <p style="color: #555; line-height: 1.7;">Need to reschedule? Reply to this email or call us at <strong>(678) 235-5822</strong> as soon as possible.</p>
            <p style="color: #555; line-height: 1.7;">We look forward to seeing you!</p>
            <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
          </div>

          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Reminder email error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
