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
      from: 'OpWell <noreply@mail.opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      replyTo: email,
      subject: '🚨 New Lead: Surgery Readiness Quiz Completed',
      html: emailHtml
    });

    console.log('✅ Quiz email sent to Dr. Oluwole:', {
      messageId: emailResult.id,
      to: 'dr.oluwole@opwellconcierge.com'
    });

    // Also send personalized report to the patient
    console.log('📧 Sending personalized report to patient...');
    const patientEmailHtml = `
      <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; color: #2c2c2c;">
        <div style="background: linear-gradient(135deg,#1a3a25,#2d5a3d); padding: 32px 24px;">
          <h1 style="color: #e8c97a; margin: 0; font-size: 1.8rem; font-family: 'Playfair Display', serif;">Your Surgery Readiness Report</h1>
          <p style="color: rgba(232,201,122,0.75); margin: 8px 0 0; font-size: 0.9rem;">From OpWell Concierge™ · Board-Certified Anesthesiologist</p>
        </div>

        <div style="padding: 32px; background: #fdf8f4;">
          <p style="color: #555; line-height: 1.7; margin-bottom: 24px;">Hi there,</p>

          <p style="color: #555; line-height: 1.7; margin-bottom: 16px;">Thank you for completing the Surgery Readiness Quiz. Here's your personalized report based on your answers:</p>

          <!-- SCORE SECTION -->
          <div style="background: #fff; border: 3px solid #2d5a3d; border-radius: 12px; padding: 28px; margin: 24px 0; text-align: center;">
            <div style="font-size: 0.8rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #2d5a3d; margin-bottom: 12px;">Your Surgery Readiness Score</div>
            <div style="font-size: 3.5rem; font-weight: 700; color: #2d5a3d; margin-bottom: 8px;">${quizData.score}</div>
            <div style="font-size: 0.95rem; color: #555; margin-bottom: 16px;">out of 100</div>
            <div style="padding: 10px 20px; border-radius: 8px; display: inline-block; font-weight: 700; font-size: 1rem;
              ${riskLevel === 'red' ? 'background: #fce4ec; color: #c62828;' : ''}
              ${riskLevel === 'yellow' ? 'background: #fff3e0; color: #e65100;' : ''}
              ${riskLevel === 'green' ? 'background: #e8f5e9; color: #2e7d32;' : ''}
            ">
              ${riskLabels[riskLevel]}
            </div>
          </div>

          <!-- WHAT THIS MEANS -->
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #3b2a1a; margin: 28px 0 12px;">What This Means</h2>
          <div style="background: ${riskLevel === 'red' ? '#fce4ec' : riskLevel === 'yellow' ? '#fff3e0' : '#e8f5e9'}; border-left: 4px solid ${riskLevel === 'red' ? '#c62828' : riskLevel === 'yellow' ? '#e65100' : '#2e7d32'}; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0; line-height: 1.7; color: #333;">
              ${riskLevel === 'red'
                ? '<strong>Your answers indicate factors that should be reviewed by a physician before your procedure.</strong> A pre-surgery consultation can help you go into surgery safer and more confident. We recommend discussing your health history, medications, and any concerns with a qualified anesthesiologist.'
                : riskLevel === 'yellow'
                ? '<strong>You have a few factors that could benefit from professional review.</strong> Addressing them before your procedure can make a real difference in your outcome and peace of mind. A consultation with our team can help optimize your preparation.'
                : '<strong>Your pre-surgery readiness looks solid!</strong> You\'re medically ready for your procedure. However, many patients find that having a physician in their corner during recovery makes a significant difference. We\'re here to support your entire journey.'}
            </p>
          </div>

          <!-- RISK FACTORS IDENTIFIED -->
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #3b2a1a; margin: 28px 0 12px;">Factors We Identified</h2>
          <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            ${quizData.flags.length > 0
              ? `<table style="width:100%; border-collapse:collapse;">
                  ${quizData.flags.map(f => {
                    const dotColor = f.severity === 'red' ? '#ef5350' : f.severity === 'orange' ? '#ff9800' : '#66bb6a';
                    return `<tr>
                      <td style="padding:10px 0; border-bottom:1px solid #f0f0f0;">
                        <div style="width:10px; height:10px; border-radius:50%; background:${dotColor}; display:inline-block; margin-right:12px; vertical-align:middle;"></div>
                        <span style="color:#555;">${escapeHtml(f.text)}</span>
                      </td>
                    </tr>`;
                  }).join('')}
                </table>`
              : '<p style="margin: 0; color: #666;">No significant risk factors identified. Great job with your pre-surgery preparation!</p>'}
          </div>

          <!-- NEXT STEPS -->
          <h2 style="font-family: 'Playfair Display', serif; font-size: 1.3rem; color: #3b2a1a; margin: 28px 0 12px;">What to Do Next</h2>
          <div style="background: #f0f7f2; border-left: 4px solid #2d5a3d; border-radius: 0 8px 8px 0; padding: 20px; margin-bottom: 24px;">
            <p style="margin: 0; line-height: 1.8; color: #333;">
              ${riskLevel === 'red'
                ? '✅ <strong>Schedule a Pre-Surgery Consultation</strong><br/>Dr. Oluwole will review your complete health picture and build a personalized preparation plan. This can make a significant difference in your surgical outcome.'
                : riskLevel === 'yellow'
                ? '✅ <strong>Consider a Consultation</strong><br/>A 50-minute conversation with our team can address the factors identified above and give you confidence going into surgery.'
                : '✅ <strong>Explore Your Options</strong><br/>Even though your readiness looks good, many patients benefit from our pre-surgery consultation or post-op recovery monitoring programs.'}
            </p>
          </div>

          <!-- CTA BUTTONS -->
          <div style="text-align: center; margin: 32px 0;">
            <table style="margin: 0 auto; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px;">
                  <a href="https://www.opwellconcierge.com/schedule" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.95rem; transition: background 0.2s;">
                    Book a Consultation →
                  </a>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px;">
                  <a href="https://www.opwellconcierge.com/recovery" style="display: inline-block; background: transparent; color: #2d5a3d; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.95rem; border: 2px solid #2d5a3d;">
                    Learn About Recovery →
                  </a>
                </td>
              </tr>
            </table>
          </div>

          <!-- SUPPORT INFO -->
          <div style="background: rgba(45,90,61,0.06); border-radius: 8px; padding: 20px; margin-top: 24px; text-align: center;">
            <p style="margin: 0 0 8px; color: #555; font-size: 0.95rem;"><strong>Questions?</strong></p>
            <p style="margin: 0; color: #666; font-size: 0.9rem;">
              Call us at <a href="tel:6782355822" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">(678) 235-5822</a><br/>
              Email: <a href="mailto:info@opwellconcierge.com" style="color: #2d5a3d; font-weight: 600; text-decoration: none;">info@opwellconcierge.com</a>
            </p>
          </div>

          <p style="color: #888; line-height: 1.7; margin-top: 32px; font-size: 0.9rem;">
            Warmly,<br/>
            <strong>Dr. Ornella Oluwole</strong><br/>
            Board-Certified Anesthesiologist<br/>
            OpWell Concierge™
          </p>
        </div>

        <div style="background: #3b2a1a; padding: 20px 24px; text-align: center;">
          <p style="color: rgba(232,201,122,0.7); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Anesthesiologist-Led Telehealth · GA, OH & VA · (678) 235-5822</p>
        </div>
      </div>
    `;

    // Send patient email with better error handling
    let patientEmailSent = false;
    try {
      console.log('Attempting to send to:', email);
      const patientEmailResult = await resend.emails.send({
        from: 'Dr. Ornella Oluwole <dr.oluwole@mail.opwellconcierge.com>',
        to: email,
        subject: 'Your Surgery Readiness Report - Score: ' + quizData.score + '/100',
        html: patientEmailHtml
      });

      console.log('Patient email result (full):', JSON.stringify(patientEmailResult));
      console.log('Result ID:', patientEmailResult?.id);
      console.log('Result error:', patientEmailResult?.error);

      if (patientEmailResult?.error) {
        console.error('❌ Resend returned error:', patientEmailResult.error);
        throw new Error('Resend error: ' + patientEmailResult.error);
      }

      if (patientEmailResult?.id) {
        console.log('✅ Patient email sent with ID:', patientEmailResult.id);
        patientEmailSent = true;
      } else {
        console.warn('⚠️ Patient email response missing ID:', patientEmailResult);
        patientEmailSent = true; // Still count as sent if no error
      }
    } catch (patientEmailErr) {
      console.error('❌ FAILED to send patient email:', {
        message: patientEmailErr.message,
        to: email,
        stack: patientEmailErr.stack
      });
      // Continue anyway - Dr. Oluwole still got the lead
    }

    return res.status(200).json({
      success: true,
      message: 'Your surgery readiness report has been sent! Check your email for your personalized score and recommendations.',
      email: email,
      score: quizData.score
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
