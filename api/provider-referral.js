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

    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    if (type === 'referral') {
      const { providerName, practice, providerEmail, providerPhone, patientName, patientEmail, patientPhone, service, procedure, notes } = req.body;

      if (!providerName || !practice || !providerEmail || !patientName || !patientEmail || !service) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!isValidEmail(providerEmail) || !isValidEmail(patientEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      await resend.emails.send({
        from: 'OpWell Concierge <info@mail.opwellconcierge.com>',
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

      // Auto-send thank-you to referring provider
      await resend.emails.send({
        from: 'OpWell Concierge <info@mail.opwellconcierge.com>',
        to: providerEmail,
        subject: `Thank You for Your Referral — OpWell Concierge`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
              <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge\u2122</h1>
              <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">ANESTHESIOLOGIST-LED TELEHEALTH</p>
            </div>

            <div style="background: #fdf8f4; padding: 40px;">
              <h2 style="color: #3b2a1a; font-size: 1.3rem; margin-top: 0;">Thank You for Your Referral</h2>
              <p style="color: #555; line-height: 1.7;">Dear ${esc(providerName)},</p>
              <p style="color: #555; line-height: 1.7;">Thank you for referring <strong>${esc(patientName)}</strong> to OpWell Concierge. We truly value your trust in our practice and are committed to providing exceptional care.</p>

              <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #3b2a1a; margin-top: 0; font-size: 1rem;">Referral Summary</h3>
                <p style="margin: 6px 0; color: #555;"><strong>Patient:</strong> ${esc(patientName)}</p>
                <p style="margin: 6px 0; color: #555;"><strong>Service:</strong> ${esc(service)}</p>
                ${procedure ? `<p style="margin: 6px 0; color: #555;"><strong>Procedure:</strong> ${esc(procedure)}</p>` : ''}
              </div>

              <p style="color: #555; line-height: 1.7;">We will reach out to your patient promptly and keep you informed of their care journey. If you have any questions, please don\u2019t hesitate to contact us.</p>

              <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                <h3 style="color: #2d5a3d; margin-top: 0; font-size: 1rem;">Partner with OpWell</h3>
                <p style="color: #555; font-size: 0.9rem; line-height: 1.6;">Interested in a formal partnership? Visit our <a href="https://opwellconcierge.com?page=providers" style="color: #b85c2b; font-weight: 600;">Provider Portal</a> to learn more about our referral program.</p>
              </div>

              <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge\u2122</p>
            </div>

            <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge\u2122 \u00b7 Telehealth \u00b7 GA, OH & VA \u00b7 (678) 235-5822</p>
            </div>
          </div>
        `,
      });

    } else if (type === 'partnership') {
      const { providerName, title, practice, providerEmail, providerPhone, state, specialty, message } = req.body;

      if (!providerName || !title || !practice || !providerEmail || !state || !specialty || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!isValidEmail(providerEmail)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Send notification to Dr. Oluwole
      try {
        console.log('📧 Sending partnership inquiry to dr.oluwole...');
        await resend.emails.send({
          from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
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
        console.log('✅ Partnership inquiry sent to Dr. Oluwole');
      } catch (inquiryErr) {
        console.error('⚠️ Failed to send partnership inquiry:', inquiryErr.message);
      }

      // Send confirmation to provider
      try {
        console.log('📧 Sending confirmation to provider...');
        await resend.emails.send({
          from: 'OpWell Concierge <dr.oluwole@opwellconcierge.com>',
          to: providerEmail,
          subject: 'Partnership Inquiry Received — OpWell Concierge',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
              <div style="background: linear-gradient(135deg, #2d5a3d 0%, #3a6b4a 100%); padding: 32px 40px; text-align: center;">
                <h1 style="color: #fff; font-size: 1.4rem; margin: 0; letter-spacing: -0.5px;">OpWell Concierge™</h1>
                <p style="color: rgba(255,255,255,0.8); font-size: 0.85rem; margin: 8px 0 0; letter-spacing: 0.08em; text-transform: uppercase;">Strategic Partnerships</p>
              </div>
              <div style="padding: 40px; background: #fdf8f4;">
                <h2 style="color: #2d5a3d; font-size: 1.3rem; margin-top: 0;">Thank You for Your Interest</h2>
                <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Dear ${esc(providerName)},</p>
                <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">We've received your partnership inquiry and appreciate your interest in collaborating with OpWell Concierge. Dr. Oluwole personally reviews all partnership opportunities.</p>

                <div style="background: rgba(45,90,61,0.06); border-left: 4px solid #2d5a3d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                  <p style="margin: 0; font-size: 0.9rem; color: #555;"><strong>Next steps:</strong></p>
                  <ul style="margin: 8px 0 0; padding-left: 20px; color: #555; font-size: 0.9rem;">
                    <li>Dr. Oluwole will review your inquiry within 2 business days</li>
                    <li>We'll reach out to discuss how OpWell can support your practice</li>
                    <li>Explore institutional integration opportunities</li>
                  </ul>
                </div>

                <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">We look forward to exploring how we can work together to improve patient outcomes.<br><br><strong>Warmly,</strong><br><strong style="color: #2d5a3d;">Dr. Ornella Oluwole</strong><br>Founder, OpWell Concierge</p>
              </div>
              <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
                <p style="color: rgba(232, 201, 122, 0.6); font-size: 0.75rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telemedicine · GA, OH & VA · (678) 235-5822</p>
              </div>
            </div>
          `
        });
        console.log('✅ Confirmation sent to provider');
      } catch (confirmErr) {
        console.error('⚠️ Failed to send provider confirmation:', confirmErr.message);
      }

    } else if (type === 'retainer-application') {
      const { fullName, email, phone, contactMethod, procedureDate, goals } = req.body;

      if (!fullName || !email || !contactMethod || !goals) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (!isValidEmail(email)) {
        return res.status(400).json({ error: 'Invalid email format' });
      }

      // Send notification email to Dr. Oluwole
      await resend.emails.send({
        from: 'OpWell Concierge <info@mail.opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        replyTo: email,
        subject: `Private Retainer Application: ${esc(fullName)}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 24px 32px;">
              <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">Private Retainer Application — OpWell Concierge</h2>
            </div>
            <div style="padding: 32px; background: #fdf8f4;">
              <table style="width:100%; border-collapse:collapse; font-size:0.95rem;">
                <tr><td style="padding:8px 0; color:#888; width:140px;">Full Name</td><td style="padding:8px 0; font-weight:600;">${esc(fullName)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
                <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phone)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Contact Method</td><td style="padding:8px 0;">${esc(contactMethod)}</td></tr>
                ${procedureDate ? `<tr><td style="padding:8px 0; color:#888;">Upcoming Procedure & Date</td><td style="padding:8px 0;">${esc(procedureDate)}</td></tr>` : ''}
              </table>

              <div style="margin-top: 24px; padding: 16px; background: #fff; border: 1px solid #e8d9c8; border-radius: 8px;">
                <p style="margin: 0 0 8px; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #3b2a1a;">Primary Goals for Care Partnership</p>
                <p style="margin: 0; font-size: 0.95rem; color: #333; line-height: 1.7; white-space: pre-wrap;">${esc(goals)}</p>
              </div>

              <div style="margin-top: 16px; padding: 12px 16px; background: rgba(45,90,61,0.06); border-radius: 6px;">
                <p style="margin: 0; font-size: 0.85rem; color: #555;">Dr. Oluwole will review this application and respond personally within 24 hours.</p>
              </div>
            </div>
          </div>
        `,
      });

      // Send confirmation email to applicant
      await resend.emails.send({
        from: 'OpWell Concierge <info@mail.opwellconcierge.com>',
        to: email,
        subject: 'Your Private Retainer Application — Received & Under Review',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: linear-gradient(135deg, #2d5a3d 0%, #3a6b4a 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #fff; font-size: 1.4rem; margin: 0; letter-spacing: -0.5px;">OpWell Concierge™</h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 0.85rem; margin: 8px 0 0; letter-spacing: 0.08em; text-transform: uppercase;">Private Retainer Program</p>
            </div>
            <div style="padding: 40px; background: #fdf8f4;">
              <h2 style="color: #2d5a3d; font-size: 1.3rem; margin-top: 0;">Application Received</h2>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Hi ${esc(fullName)},</p>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Thank you for submitting your private retainer application to OpWell Concierge. We've received your information and are reviewing your request.</p>

              <div style="background: rgba(45,90,61,0.06); border-left: 4px solid #2d5a3d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.9rem; color: #555;"><strong>What happens next:</strong></p>
                <ol style="margin: 8px 0 0; padding-left: 20px; color: #555; font-size: 0.9rem;">
                  <li>Dr. Oluwole personally reviews your application</li>
                  <li>She'll reach out within 24 hours to discuss your goals</li>
                  <li>Together, you'll design a customized care partnership</li>
                </ol>
              </div>

              <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.85rem; color: #888;"><strong>Questions in the meantime?</strong><br>Call (678) 235-5822 or reply to this email.</p>
              </div>

              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">We look forward to partnering with you.</p>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;"><strong>Warmly,</strong><br><strong style="color: #2d5a3d;">Dr. Ornella Oluwole</strong><br>Board-Certified Anesthesiologist</p>
            </div>
            <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(232, 201, 122, 0.6); font-size: 0.75rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth · GA, OH & VA<br>(678) 235-5822 · dr.oluwole@opwellconcierge.com</p>
            </div>
          </div>
        `,
      });

      console.log('✅ Retainer application received from', email, '— emails sent to applicant and Dr. Oluwole');

    } else {
      return res.status(400).json({ error: 'Invalid form type' });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Provider referral error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
