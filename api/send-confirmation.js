const { Resend } = require('resend');

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

    await resend.emails.send({
      from: 'OpWell Concierge <onboarding@resend.dev>',
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
            <p style="color: #555; line-height: 1.7;">Dear ${patientName},</p>
            <p style="color: #555; line-height: 1.7;">Thank you for booking with OpWell Concierge. Your payment has been received and your appointment is confirmed.</p>

            <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Booking Summary</h3>
              <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${serviceList}</p>
              ${procedure ? `<p style="margin: 6px 0; color: #555;"><strong>Procedure Type:</strong> ${procedure}</p>` : ''}
              ${date ? `<p style="margin: 6px 0; color: #555;"><strong>Preferred Date:</strong> ${date}</p>` : ''}
              ${time ? `<p style="margin: 6px 0; color: #555;"><strong>Preferred Time:</strong> ${time}</p>` : ''}
            </div>

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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
};
