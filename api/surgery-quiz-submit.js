const { Resend } = require('resend');

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('=== SURGERY QUIZ SUBMISSION ===');
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { email, quizData } = req.body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      console.error('❌ Invalid email:', email);
      return res.status(400).json({ error: 'Invalid email address' });
    }

    // Validate quiz data
    if (!quizData || !quizData.flags || quizData.score === undefined) {
      console.error('❌ Invalid quiz data structure');
      return res.status(400).json({ error: 'Invalid quiz data' });
    }

    console.log('Recipient email:', email);
    console.log('Quiz score:', quizData.score);
    console.log('Risk factors count:', quizData.flags.length);

    // Determine risk level based on quiz data
    let riskLevel = 'green';
    if (quizData.disease >= 3 || quizData.surgery >= 3 ||
        (quizData.disease >= 2 && quizData.surgery >= 2) ||
        (quizData.anxiety >= 3 && (quizData.disease >= 2 || quizData.surgery >= 2))) {
      riskLevel = 'red';
    } else if (quizData.anxiety >= 3 || (quizData.anxiety >= 2 && (quizData.disease >= 2 || quizData.surgery >= 2))) {
      riskLevel = 'yellow';
    }

    const riskLabels = {
      red: 'HIGHER RISK',
      yellow: 'MODERATE RISK',
      green: 'LOOKING GOOD'
    };

    // Build risk factors list
    const riskFactorsHtml = quizData.flags.length > 0
      ? quizData.flags.map(f => {
          const dotColor = f.severity === 'red' ? '#ef5350' : f.severity === 'orange' ? '#ff9800' : '#66bb6a';
          return `<tr>
            <td style="padding:8px 0; color:#888; width:20px;">
              <div style="width:8px; height:8px; border-radius:50%; background:${dotColor};"></div>
            </td>
            <td style="padding:8px 0; color:#555;">${escapeHtml(f.text)}</td>
          </tr>`;
        }).join('')
      : '<tr><td colspan="2" style="padding:8px 0; color:#555;">No significant risk factors identified</td></tr>';

    // Build comprehensive email to Dr. Oluwole
    const emailHtml = `
      <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; color: #2c2c2c;">
        <div style="background: #3b2a1a; padding: 24px 32px;">
          <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">🚨 New Lead: Surgery Readiness Quiz</h2>
          <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem;">Patient Score & Risk Assessment</p>
        </div>

        <div style="padding: 32px; background: #fdf8f4;">
          <h3 style="color: #3b2a1a; margin-top: 0;">Patient Information</h3>
          <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom: 24px;">
            <tr><td style="padding:8px 0; color:#888; width:140px;">Email</td><td style="padding:8px 0;"><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
            <tr><td style="padding:8px 0; color:#888;">Submitted</td><td style="padding:8px 0;">${new Date().toLocaleString()}</td></tr>
          </table>

          <h3 style="color: #3b2a1a; margin: 24px 0 0;">Surgery Readiness Score</h3>
          <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 24px; margin: 16px 0; text-align: center;">
            <div style="font-size: 2.5rem; font-weight: 700; color: var(--charcoal); margin-bottom: 8px;">${quizData.score}</div>
            <div style="font-size: 0.85rem; color: #555; margin-bottom: 8px;">Out of 100</div>
            <div style="padding: 8px 16px; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 0.9rem;
              ${riskLevel === 'red' ? 'background: #fce4ec; color: #c62828;' : ''}
              ${riskLevel === 'yellow' ? 'background: #fff3e0; color: #e65100;' : ''}
              ${riskLevel === 'green' ? 'background: #e8f5e9; color: #2e7d32;' : ''}
            ">
              ${riskLabels[riskLevel]}
            </div>
          </div>

          <h3 style="color: #3b2a1a; margin: 24px 0 0;">Risk Assessment</h3>
          <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 16px 20px; margin: 16px 0;">
            <table style="width:100%; border-collapse:collapse; font-size:0.9rem;">
              ${riskFactorsHtml}
            </table>
          </div>

          <h3 style="color: #3b2a1a; margin: 24px 0 0;">Next Steps</h3>
          <div style="background: #f0f7f2; border-left: 4px solid #2d5a3d; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 16px 0;">
            <p style="margin: 0; color: #555; line-height: 1.6;">
              ${riskLevel === 'red'
                ? '✅ <strong>High Priority:</strong> Schedule consultation to review pre-surgery preparation.'
                : riskLevel === 'yellow'
                ? '✅ <strong>Moderate Priority:</strong> Consider consultation to address identified risk areas.'
                : '✅ Patient medically ready for surgery. Follow-up consultation recommended for peace of mind.'}
            </p>
          </div>

          <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
            <p style="margin: 0; font-size: 0.85rem; color: #555;">
              <strong>Lead Source:</strong> Surgery Readiness Quiz<br/>
              <strong>Timestamp:</strong> ${new Date().toISOString()}<br/>
              <strong>Action:</strong> Reach out to ${escapeHtml(email)} to schedule consultation
            </p>
          </div>
        </div>

        <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
          <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth</p>
        </div>
      </div>
    `;

    // Send email to Dr. Oluwole
    console.log('📧 Sending quiz results email to Dr. Oluwole...');
    const emailResult = await resend.emails.send({
      from: 'OpWell Quizzes <onboarding@resend.dev>',
      to: 'dr.oluwole@opwellconcierge.com',
      replyTo: email,
      subject: '🚨 New Lead: Surgery Readiness Quiz Completed',
      html: emailHtml
    });

    console.log('✅ Quiz email sent successfully:', {
      messageId: emailResult.id,
      to: 'dr.oluwole@opwellconcierge.com',
      replyTo: email
    });

    return res.status(200).json({
      success: true,
      message: 'Your surgery readiness report has been submitted and sent to our team.',
      email: email
    });

  } catch (err) {
    console.error('❌ Quiz submission error:', {
      message: err.message,
      stack: err.stack
    });
    return res.status(500).json({
      success: false,
      error: 'An error occurred while processing your quiz. Please try again or contact support.',
      details: err.message
    });
  }
};
