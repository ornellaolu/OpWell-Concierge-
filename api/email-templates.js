function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function bookingConfirmationEmail(patientName, services, amountPaid, accessCode, calendarLink) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OpWell Concierge Booking Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; background: #fdf8f4; }
    .header { background: linear-gradient(135deg, #2d5a3d 0%, #3a6b4a 100%); padding: 40px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }
    .header p { margin: 8px 0 0; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255,255,255,0.8); }
    .content { padding: 40px 32px; }
    .greeting { font-size: 16px; color: #555; line-height: 1.8; margin-bottom: 24px; }
    .greeting strong { color: #2d5a3d; }
    .section { margin-bottom: 32px; }
    .section-title { font-size: 14px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: #2d5a3d; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
    .section-content { background: #fff; border-left: 4px solid #c8845a; padding: 20px 24px; border-radius: 0 8px 8px 0; }
    .summary-item { margin: 10px 0; font-size: 15px; color: #555; }
    .summary-item strong { color: #2d5a3d; }
    .cta-button { display: inline-block; background: #2d5a3d; color: #fff; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 15px; margin: 12px 0; }
    .cta-button:hover { background: #1f3f28; }
    .document-list { list-style: none; padding: 0; margin: 0; }
    .document-list li { padding: 10px 0; font-size: 15px; color: #555; border-bottom: 1px solid #e8d9c8; }
    .document-list li:last-child { border-bottom: none; }
    .highlight-box { background: linear-gradient(135deg, rgba(45, 90, 61, 0.06) 0%, rgba(200, 132, 90, 0.04) 100%); border-left: 4px solid #2d5a3d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .highlight-box p { margin: 0; font-size: 14px; color: #555; line-height: 1.6; }
    .code-box { background: #2d5a3d; color: #fff; padding: 20px; border-radius: 8px; text-align: center; margin: 16px 0; }
    .code-box .label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; margin-bottom: 8px; }
    .code-box .code { font-size: 24px; font-weight: 700; letter-spacing: 0.15em; font-family: 'Courier New', monospace; }
    .steps { counter-reset: step-counter; }
    .step { display: flex; gap: 16px; margin-bottom: 16px; }
    .step-number { min-width: 32px; width: 32px; height: 32px; background: #c8845a; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
    .step-content { flex: 1; }
    .step-content p { margin: 0; font-size: 15px; color: #555; line-height: 1.6; }
    .footer { background: #3b2a1a; padding: 24px 32px; text-align: center; }
    .footer p { margin: 6px 0; font-size: 13px; color: rgba(232, 201, 122, 0.7); line-height: 1.6; }
    .footer a { color: rgba(232, 201, 122, 0.9); text-decoration: none; font-weight: 600; }
    @media (max-width: 600px) {
      .header { padding: 32px 16px; }
      .header h1 { font-size: 24px; }
      .content { padding: 24px 16px; }
      .section-content { padding: 16px; }
      .cta-button { width: 100%; text-align: center; box-sizing: border-box; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>OpWell Concierge™</h1>
      <p>Anesthesiologist-Led Telehealth</p>
    </div>

    <div class="content">
      <h2 style="font-size: 24px; margin-top: 0; color: #2d5a3d; line-height: 1.3;">Your Booking is Confirmed</h2>

      <div class="greeting">
        Dear <strong>${escapeHtml(patientName)}</strong>,<br><br>
        Thank you for booking with OpWell Concierge. Your payment has been successfully processed and your comprehensive care package is secured.
      </div>

      <!-- Booking Summary -->
      <div class="section">
        <div class="section-title">📋 Booking Summary</div>
        <div class="section-content">
          <div class="summary-item"><strong>Service:</strong> ${escapeHtml(services)}</div>
          <div class="summary-item"><strong>Amount Paid:</strong> $${amountPaid}</div>
          <div class="summary-item"><strong>Status:</strong> <span style="color: #2d5a3d; font-weight: 600;">✓ Paid & Confirmed</span></div>
        </div>
      </div>

      <!-- Step 1: Schedule -->
      <div class="section">
        <div class="section-title">🗓️ Step 1: Schedule Your Consultation</div>
        <div class="section-content">
          <p style="margin: 0 0 12px; font-size: 15px; color: #555;">Click the link below to access our live calendar and select a telehealth appointment time that works best for your schedule:</p>
          <a href="${escapeHtml(calendarLink)}" class="cta-button" style="display: inline-block;">➡️ Schedule Your Consultation</a>
          <div class="highlight-box">
            <p><strong>🔒 Secure & HIPAA-Compliant:</strong> OpWell Concierge utilizes secure, HIPAA-compliant Google Meet video integration. Your unique, private virtual room link will be automatically generated and emailed to you the moment your appointment time is selected.</p>
          </div>
        </div>
      </div>

      <!-- Masterclass Included -->
      <div class="section">
        <div class="section-title">🎁 Surgery Prep Masterclass Included</div>
        <div class="section-content">
          <p style="margin: 0 0 12px; font-size: 15px; color: #555;">As part of your comprehensive care package, you have complimentary, full access to our <strong>Surgery Prep Masterclass</strong>—a 22-module, evidence-based guide tailored to prepare your mind and body for your upcoming procedure.</p>
          <div class="code-box">
            <div class="label">Your Exclusive Access Code</div>
            <div class="code">${escapeHtml(accessCode)}</div>
          </div>
          <p style="text-align: center; font-size: 14px; color: #888; margin: 12px 0 0;">Access at <strong>opwellconcierge.com/masterclass</strong></p>
        </div>
      </div>

      <!-- Step 2: Pre-Appointment Documents -->
      <div class="section">
        <div class="section-title">📄 Step 2: Pre-Appointment Documents</div>
        <div class="section-content">
          <p style="margin: 0 0 12px; font-size: 15px; color: #555;">To ensure Dr. Oluwole can thoroughly review your clinical history ahead of time, please download and complete these essential forms prior to your consultation:</p>
          <ul class="document-list">
            <li>✓ <strong>Medical History Form</strong> — Comprehensive medical background and current medications</li>
            <li>✓ <strong>Pre-Op Checklist</strong> — Pre-operative instructions and surgical preparation guidelines</li>
            <li>✓ <strong>Medication Review</strong> — Detailed list of all current prescriptions, OTC drugs, and supplements</li>
            <li>✓ <strong>Surgical Consent</strong> — Medical consent and practice acknowledgment forms</li>
          </ul>
          <div class="highlight-box" style="margin-top: 16px;">
            <p><strong>💡 Next Step:</strong> Direct secure links to download and digitally sign these documents will be emailed to you separately within 24 hours.</p>
          </div>
        </div>
      </div>

      <!-- Next Steps -->
      <div class="section">
        <div class="section-title">✅ Your Next Steps</div>
        <div class="section-content">
          <div class="steps">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content"><p><strong>Book Your Time:</strong> Use the scheduling link above to pick your consultation time slot.</p></div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content"><p><strong>Complete Your Forms:</strong> Fill out the digital medical documents as soon as they arrive in your inbox.</p></div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content"><p><strong>Join Your Session:</strong> Click your secure Google Meet link (sent automatically after booking) at your scheduled time.</p></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Clinical Library -->
      <div class="section" style="background: rgba(45, 90, 61, 0.04); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 15px; color: #555;"><strong>📚 Explore Our Free Clinical Library:</strong> We invite you to explore the <a href="https://www.opwellconcierge.com/blog" style="color: #2d5a3d; text-decoration: none; font-weight: 600;">OpWell Clinical Blog</a>, where we regularly publish free, peer-reviewed articles covering surgery preparation, anesthesia insights, and optimized recovery protocols.</p>
      </div>

      <!-- Support -->
      <div class="highlight-box">
        <p><strong>Questions?</strong> Reply directly to this email or call our office at <strong>(678) 235-5822</strong>. We're here to support you every step of the way.</p>
      </div>

      <p style="margin-top: 32px; margin-bottom: 0; font-size: 15px; color: #555; line-height: 1.8;">We look forward to partnering with you on your health and surgical journey.<br><br><strong>Warmly,</strong><br><strong style="color: #2d5a3d;">Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
    </div>

    <div class="footer">
      <p><strong>OpWell Concierge™</strong></p>
      <p>Anesthesiologist-Led Telehealth · Serving GA, OH & VA</p>
      <p>(678) 235-5822 · <a href="mailto:info@opwellconcierge.com">info@opwellconcierge.com</a></p>
      <p style="margin-top: 12px; border-top: 1px solid rgba(232, 201, 122, 0.2); padding-top: 12px; font-size: 11px;">This email contains confidential healthcare information. If you received this in error, please delete it immediately.</p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { bookingConfirmationEmail };
