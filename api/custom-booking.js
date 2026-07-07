const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, email, phone, preferredTime1, preferredTime2 } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !preferredTime1) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Send confirmation email to patient
    await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: email,
      subject: 'Your Custom Consultation Request — Pending Confirmation',
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
            <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
            <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">PERIOPERATIVE CARE</p>
          </div>
          <div style="background: #fdf8f4; padding: 40px;">
            <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Thank You for Your Custom Request</h2>
            <p style="color: #555; line-height: 1.7;">Hi ${esc(name)},</p>

            <p style="color: #555; line-height: 1.7;">We've received your custom consultation request and appreciate your flexibility. Dr. Oluwole is reviewing your preferred times and will confirm your appointment within 1 business day.</p>

            <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <h3 style="margin-top: 0; color: #2d5a3d; font-size: 1rem;">Your Request Details</h3>
              <table style="width: 100%; font-size: 0.9rem; color: #555; border-collapse: collapse;">
                <tr><td style="padding: 6px 0; font-weight: 600;">Preferred Time 1:</td><td style="padding: 6px 0;">${esc(preferredTime1)}</td></tr>
                ${preferredTime2 ? `<tr><td style="padding: 6px 0; font-weight: 600;">Preferred Time 2:</td><td style="padding: 6px 0;">${esc(preferredTime2)}</td></tr>` : ''}
                <tr><td style="padding: 6px 0; font-weight: 600;">Contact:</td><td style="padding: 6px 0;">${esc(phone)}</td></tr>
              </table>
            </div>

            <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.9rem; color: #555; line-height: 1.6;">
                <strong style="color: #3b2a1a;">Next Steps:</strong><br>
                Dr. Oluwole will review your request and send you a confirmation email with your scheduled appointment time and a secure link to complete your clinical intake and payment authorization.
              </p>
            </div>

            <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555;">
                <strong>Questions?</strong> Call us at <strong>(678) 235-5822</strong><br>
                <strong>Submitted:</strong> ${new Date().toLocaleString()}
              </p>
            </div>

            <p style="color: #555; line-height: 1.7; margin-bottom: 0;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
          </div>
          <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
            <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth · GA, OH & VA · (678) 235-5822</p>
          </div>
        </div>
      `
    });

    // Send "Pending Confirmation" alert to Dr. Oluwole
    await resend.emails.send({
      from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject: `⏳ PENDING CONFIRMATION: Custom Booking Request from ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #2c2c2c;">
          <div style="background: #c8845a; padding: 24px 32px;">
            <h2 style="color: white; margin: 0; font-size: 1.2rem;">⏳ PENDING CONFIRMATION ALERT</h2>
          </div>
          <div style="padding: 32px; background: #fdf8f4;">
            <h3 style="color: #3b2a1a; margin-top: 0;">Custom Consultation Request Received</h3>
            <p style="color: #555; line-height: 1.6;">A patient has submitted a custom consultation request with non-standard appointment times. Please review and confirm availability:</p>

            <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin: 24px 0; background: white; border: 1px solid #e8d9c8; border-radius: 8px;">
              <tr style="background: rgba(45,90,61,0.05); border-bottom: 1px solid #e8d9c8;">
                <td style="padding:12px 16px; font-weight:600; color:#3b2a1a;">Name</td>
                <td style="padding:12px 16px;">${esc(name)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e8d9c8;">
                <td style="padding:12px 16px; font-weight:600; color:#3b2a1a;">Email</td>
                <td style="padding:12px 16px;"><a href="mailto:${esc(email)}">${esc(email)}</a></td>
              </tr>
              <tr style="border-bottom: 1px solid #e8d9c8;">
                <td style="padding:12px 16px; font-weight:600; color:#3b2a1a;">Phone</td>
                <td style="padding:12px 16px;">${esc(phone)}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e8d9c8;">
                <td style="padding:12px 16px; font-weight:600; color:#3b2a1a;">Preferred Time 1</td>
                <td style="padding:12px 16px;">${esc(preferredTime1)}</td>
              </tr>
              ${preferredTime2 ? `<tr style="border-bottom: 1px solid #e8d9c8;">
                <td style="padding:12px 16px; font-weight:600; color:#3b2a1a;">Preferred Time 2</td>
                <td style="padding:12px 16px;">${esc(preferredTime2)}</td>
              </tr>` : ''}
            </table>

            <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
              <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 0.9rem;">ACTION REQUIRED</p>
              <p style="margin: 6px 0 0; color: #7f1d1d; font-size: 0.85rem; line-height: 1.6;">
                Please review this request and confirm availability. Reply to this email or contact the patient directly at ${esc(phone)} to confirm the appointment time.
              </p>
            </div>

            <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 0.85rem; color: #555;">Received: ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </div>
      `
    });

    return res.status(200).json({
      success: true,
      message: 'Custom booking request submitted successfully'
    });

  } catch (err) {
    console.error('Custom booking error:', err.message);
    return res.status(500).json({
      error: 'Failed to process custom booking request. Please try again or call (678) 235-5822.',
      details: err.message
    });
  }
};
