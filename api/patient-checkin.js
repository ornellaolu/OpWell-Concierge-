const { Resend } = require('resend');
const db = require('../lib/db');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== CHECK-IN RECEIVED ===');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { token, checkInData } = req.body;

    console.log('Token:', token?.substring(0, 10) + '...');
    console.log('CheckInData keys:', Object.keys(checkInData || {}));

    // Validate token
    if (!token) {
      return res.status(400).json({ error: 'Missing authentication token' });
    }

    const patient = await db.getPatientByToken(token);
    if (!patient) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    console.log('Patient found:', patient.name);

    // Check if patient already submitted today
    const todayCheckIn = await db.getPatientCheckInToday(patient.id);
    if (todayCheckIn) {
      return res.status(400).json({ error: 'You have already submitted a check-in today. Please try again tomorrow.' });
    }

    // Save check-in to database
    console.log('Saving check-in to database...');
    let checkIn;
    try {
      checkIn = await db.saveCheckIn(patient.id, {
        firstName: patient.name.split(' ')[0],
        lastName: patient.name.split(' ').slice(1).join(' ') || '',
        phone: patient.phone,
        surgeryType: patient.surgeryType,
        surgeryDate: patient.surgeryDate,
        ...checkInData
      });
      console.log('✅ Check-in saved:', checkIn.id);
    } catch (dbErr) {
      console.error('❌ Database save failed:', {
        message: dbErr.message,
        details: dbErr.details,
        hint: dbErr.hint,
        code: dbErr.code
      });
      throw new Error(`Database error: ${dbErr.message}`);
    }

    // Extract response data for email
    const responses = checkInData.responses || {};
    const pod = Math.floor((new Date() - new Date(patient.surgeryDate)) / (1000 * 60 * 60 * 24));
    const riskLevel = checkInData.riskLevel;
    const qor15 = checkInData.qor15 || {};

    // Build email to Dr. Oluwole
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; color: #2c2c2c;">
        <div style="background: #3b2a1a; padding: 24px 32px;">
          <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">Patient Recovery Check-In Submitted</h2>
        </div>
        <div style="padding: 32px; background: #fdf8f4;">
          <h3 style="color: #3b2a1a; margin-top: 0;">Patient Information</h3>
          <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom: 24px;">
            <tr><td style="padding:8px 0; color:#888; width:140px;">Name</td><td style="padding:8px 0; font-weight:600;">${esc(patient.name)}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(patient.email)}">${esc(patient.email)}</a></td></tr>
            <tr><td style="padding:8px 0; color:#888;">Surgery Type</td><td style="padding:8px 0; font-weight:600;">${esc(patient.surgeryType)}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">Surgery Date</td><td style="padding:8px 0;">${patient.surgeryDate}</td></tr>
            <tr><td style="padding:8px 0; color:#888;">POD</td><td style="padding:8px 0; font-weight:600;">${pod} days post-op</td></tr>
          </table>

          <h3 style="color: #3b2a1a; margin: 24px 0 0;">Check-In Responses</h3>
          <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px; margin: 16px 0;">
            <h4 style="margin-top: 0; color: #2d5a3d; font-size: 0.95rem;">Pain Assessment</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">At Rest:</td><td style="padding:6px 0; font-weight:600;">${responses.painRest || 'N/A'}/10</td></tr>
              <tr><td style="padding:6px 0;">With Activity:</td><td style="padding:6px 0; font-weight:600;">${responses.painActivity || 'N/A'}/10</td></tr>
              <tr><td style="padding:6px 0;">Medication Helping:</td><td style="padding:6px 0; font-weight:600;">${responses.painManaged || 'N/A'}</td></tr>
            </table>

            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">Wound Assessment</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">Drainage:</td><td style="padding:6px 0; font-weight:600;">${responses.drainage || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Incision Opening:</td><td style="padding:6px 0; font-weight:600;">${responses.opening || 'N/A'}</td></tr>
              <tr><td style="padding:6px 0;">Redness/Swelling:</td><td style="padding:6px 0; font-weight:600;">${responses.redness || 'N/A'}</td></tr>
            </table>

            ${qor15 && qor15.total ? `
            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">QoR-15 Score</h4>
            <table style="width:100%; font-size:0.9rem; color:#555;">
              <tr><td style="padding:6px 0;">Total Score:</td><td style="padding:6px 0; font-weight:600;">${qor15.total} / 150</td></tr>
            </table>
            ` : ''}

            ${checkInData.notes ? `
            <h4 style="margin: 16px 0 0; color: #2d5a3d; font-size: 0.95rem;">Additional Notes</h4>
            <p style="margin: 8px 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${esc(checkInData.notes)}</p>
            ` : ''}
          </div>

          ${riskLevel ? `
          <div style="background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
            <p style="margin: 0 0 8px; color: #991b1b; font-weight: 700;">⚠️ RED FLAG SYMPTOMS REPORTED</p>
            <p style="margin: 0; color: #7f1d1d; font-size: 0.9rem;">Risk Level: ${esc(riskLevel)}</p>
          </div>
          ` : ''}

          <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 0.85rem; color: #555;">Check-In ID: ${checkIn.id}<br>Submitted: ${new Date(checkIn.timestamp).toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;

    // Send check-in result email to Dr. Oluwole
    try {
      console.log('📧 Attempting to send check-in email...');
      console.log('API Key configured:', !!process.env.RESEND_API_KEY);
      console.log('To:', 'dr.oluwole@opwellconcierge.com');
      console.log('From:', 'info@opwellconcierge.com');

      const emailResult = await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        replyTo: patient.email,
        subject: `🚨 Patient Check-In Received: ${patient.name} — ${patient.surgeryType} (POD ${Math.floor((new Date() - new Date(patient.surgeryDate)) / (1000 * 60 * 60 * 24))})`,
        html: emailHtml
      });
      console.log('✅ Check-in email sent successfully:', emailResult);
    } catch (emailErr) {
      console.error('❌ FAILED to send check-in email:', {
        error: emailErr.message,
        code: emailErr.code,
        status: emailErr.status,
        details: emailErr.toString()
      });
      // Don't fail the request if email fails - check-in was still saved
    }

    return res.status(200).json({
      success: true,
      checkInId: checkIn.id,
      message: 'Check-in submitted successfully and stored in your records.',
      qor15Score: checkInData.qor15?.total || null
    });

  } catch (err) {
    console.error('❌ Check-in endpoint error:', {
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({
      error: 'An internal error occurred. Please try again.',
      details: err.message
    });
  }
};
