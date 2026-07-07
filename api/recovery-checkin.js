const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Admin key for verification
const ADMIN_KEY = process.env.ADMIN_KEY || 'opwell';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { action } = req.body;

  try {
    if (action === 'get-schedule') {
      // Generate recovery check-in schedule based on surgery date
      const { email, phone, patientName: name, procedure, surgeryDate } = req.body;

      if (!name || !procedure || !surgeryDate || !email) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Standard recovery check-in schedule (POD = Post-Op Day)
      const schedule = [
        { dayOffset: 1, label: 'Day 1 Post-Op', textMessage: `Hi ${name}, quick check: How are you feeling after your ${procedure}? Reply with pain level 1-10.` },
        { dayOffset: 3, label: 'Day 3 Post-Op', textMessage: `Hi ${name}, checking in on your recovery from your ${procedure}. Any concerns today?` },
        { dayOffset: 5, label: 'Day 5 Post-Op', textMessage: `${name}, how's your ${procedure} recovery going? Any drainage, redness, or fever?` },
        { dayOffset: 7, label: 'Day 7 Post-Op (1 Week)', textMessage: `One week post-op! ${name}, please share how you're feeling with your ${procedure} recovery.` },
        { dayOffset: 14, label: 'Day 14 Post-Op (2 Weeks)', textMessage: `${name}, mid-recovery check: How's your ${procedure} healing? Any issues to report?` },
        { dayOffset: 21, label: 'Day 21 Post-Op (3 Weeks)', textMessage: `${name}, three weeks out from your ${procedure}. How's your energy and pain level?` },
        { dayOffset: 30, label: 'Day 30 Post-Op (1 Month)', textMessage: `${name}, one month post-op from your ${procedure}. Ready for recovery phase 2?` },
      ];

      // Add formatted dates
      const surgDate = new Date(surgeryDate);
      const scheduleWithDates = schedule.map(item => {
        const checkDate = new Date(surgDate);
        checkDate.setDate(checkDate.getDate() + item.dayOffset);
        return {
          ...item,
          sendDate: checkDate.toISOString().split('T')[0],
          sendDateFormatted: checkDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
        };
      });

      return res.status(200).json({
        success: true,
        patient: name,
        procedure,
        surgeryDate,
        schedule: scheduleWithDates
      });

    } else if (action === 'schedule-all') {
      // Schedule all check-ins for a patient
      const { email, phone, patientName, procedure, surgeryDate } = req.body;

      if (!email || !patientName || !procedure || !surgeryDate) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      // Send notification to Dr. Oluwole
      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: 'dr.oluwole@opwellconcierge.com',
        replyTo: email,
        subject: `Recovery Check-In Schedule Created: ${patientName} — ${procedure}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: #3b2a1a; padding: 24px 32px;">
              <h2 style="color: #e8c97a; margin: 0; font-size: 1.2rem;">Recovery Check-In Schedule Created</h2>
            </div>
            <div style="padding: 32px; background: #fdf8f4;">
              <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom: 24px;">
                <tr><td style="padding:8px 0; color:#888; width:140px;">Patient Name</td><td style="padding:8px 0; font-weight:600;">${esc(patientName)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Email</td><td style="padding:8px 0;"><a href="mailto:${esc(email)}">${esc(email)}</a></td></tr>
                <tr><td style="padding:8px 0; color:#888;">Phone</td><td style="padding:8px 0;">${esc(phone || 'N/A')}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Procedure</td><td style="padding:8px 0; font-weight:600;">${esc(procedure)}</td></tr>
                <tr><td style="padding:8px 0; color:#888;">Surgery Date</td><td style="padding:8px 0;">${surgeryDate}</td></tr>
              </table>
              <p style="color: #555; font-size: 0.9rem;">Recovery check-ins have been scheduled for this patient. They will receive daily reminders based on their post-op timeline.</p>
            </div>
          </div>
        `
      });

      // Send welcome email to patient with instructions
      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: email,
        subject: `Your Recovery Check-In Plan is Ready — ${patientName}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: linear-gradient(135deg, #2d5a3d 0%, #3a6b4a 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #fff; font-size: 1.4rem; margin: 0; letter-spacing: -0.5px;">OpWell Concierge™</h1>
              <p style="color: rgba(255,255,255,0.8); font-size: 0.85rem; margin: 8px 0 0; letter-spacing: 0.08em; text-transform: uppercase;">Recovery Monitoring</p>
            </div>
            <div style="padding: 40px; background: #fdf8f4;">
              <h2 style="color: #2d5a3d; font-size: 1.3rem; margin-top: 0;">Your Recovery Check-In Plan</h2>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Dear ${esc(patientName)},</p>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Dr. Oluwole has set up personalized recovery check-ins for your ${esc(procedure)} surgery. You'll receive check-in reminders at key milestones during your recovery (Day 1, 3, 5, 7, 14, 21, and 30 post-op).</p>

              <div style="background: rgba(45,90,61,0.06); border-left: 4px solid #2d5a3d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.9rem; color: #555;"><strong>What to expect:</strong></p>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #555; font-size: 0.9rem;">
                  <li>Daily check-in reminders at pre-scheduled times</li>
                  <li>Questions about pain, wound healing, and overall recovery</li>
                  <li>QoR-15 recovery quality assessments</li>
                  <li>Direct communication with Dr. Oluwole's team</li>
                </ul>
              </div>

              <div style="background: #fff; border: 1px solid #e8d9c8; border-radius: 8px; padding: 16px 20px; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.85rem; color: #888;"><strong>Questions?</strong><br>Reply to this email or call (678) 235-5822 anytime.</p>
              </div>

              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;"><strong>Your recovery team is here to support you.</strong><br><strong>Warmly,</strong><br><strong style="color: #2d5a3d;">Dr. Ornella Oluwole</strong></p>
            </div>
            <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
              <p style="color: rgba(232, 201, 122, 0.6); font-size: 0.75rem; margin: 0;">OpWell Concierge™ · Post-Operative Care · GA, OH & VA</p>
            </div>
          </div>
        `
      });

      return res.status(200).json({
        success: true,
        message: 'Recovery check-in schedule created successfully',
        patient: patientName,
        procedure,
        scheduledDays: 7
      });

    } else if (action === 'send-single') {
      // Send a single check-in reminder
      const { email, patientName, procedure, dayOffset, reminderText } = req.body;

      if (!email || !patientName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: email,
        subject: `Recovery Check-In Reminder — Day ${dayOffset || '?'} Post-Op`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
            <div style="background: linear-gradient(135deg, #2d5a3d 0%, #3a6b4a 100%); padding: 32px 40px; text-align: center;">
              <h1 style="color: #fff; font-size: 1.4rem; margin: 0;">OpWell Concierge™</h1>
            </div>
            <div style="padding: 40px; background: #fdf8f4;">
              <h2 style="color: #2d5a3d; font-size: 1.3rem; margin-top: 0;">Recovery Check-In Reminder</h2>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">Hi ${esc(patientName)},</p>
              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;">${reminderText || 'Time for your recovery check-in! Your feedback helps Dr. Oluwole monitor your healing and catch any issues early.'}</p>

              <div style="background: rgba(45,90,61,0.06); border-left: 4px solid #2d5a3d; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0;">
                <p style="margin: 0; font-size: 0.9rem; color: #555;"><strong>Please reply to this email with:</strong></p>
                <ul style="margin: 8px 0 0; padding-left: 20px; color: #555; font-size: 0.9rem;">
                  <li>Pain level (1-10)</li>
                  <li>Wound condition (any drainage, redness, opening)</li>
                  <li>Any concerning symptoms or questions</li>
                  <li>Your energy level and overall mood</li>
                </ul>
              </div>

              <p style="color: #555; line-height: 1.8; font-size: 0.95rem;"><strong>Your feedback matters.</strong> Reply today to stay on track with your recovery.<br><br>Warmly,<br><strong style="color: #2d5a3d;">Dr. Ornella Oluwole & Team</strong></p>
            </div>
          </div>
        `
      });

      return res.status(200).json({
        success: true,
        message: 'Check-in reminder sent successfully'
      });

    } else {
      return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('Recovery check-in error:', error);
    return res.status(500).json({
      error: 'An internal error occurred',
      details: error.message
    });
  }
};
