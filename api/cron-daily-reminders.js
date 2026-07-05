// Vercel Cron: Sends daily recovery check-in reminders to patients
// Schedule: Every day at 8 AM ET (configurable per patient timezone preference)

const { Resend } = require('resend');
const db = require('../lib/db');

const CHECKIN_SCHEDULE = [
  { day: 1, label: '24-Hour Check-In', message: 'It has been 24 hours since your surgery. This is the most important window for monitoring your recovery.' },
  { day: 3, label: '72-Hour Check-In', message: 'You are 3 days post-surgery. Initial swelling should be stabilizing.' },
  { day: 7, label: '1-Week Check-In', message: 'One week into recovery. Time to assess progress and optimize wellness support.' },
  { day: 14, label: '2-Week Check-In', message: 'Two weeks post-surgery. Many patients notice meaningful improvement.' },
  { day: 21, label: '3-Week Check-In', message: 'Three weeks in. Your body is doing important healing work.' },
  { day: 28, label: '4-Week Check-In', message: 'One month post-surgery. Final structured check-in.' }
];

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function sendDailyReminders() {
  const resend = new Resend(process.env.RESEND_API_KEY);
  let sentCount = 0;
  let errorCount = 0;

  try {
    // Get all patients
    const patients = await db.getAllPatients();

    for (const patient of patients) {
      try {
        // Calculate days since surgery
        const surgeryDate = new Date(patient.surgeryDate);
        const today = new Date();
        const daysPostOp = Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24));

        // Find matching check-in for today
        const todayCheckin = CHECKIN_SCHEDULE.find(c => c.day === daysPostOp);
        if (!todayCheckin) continue; // No scheduled check-in for this day

        // Check if already sent today
        const reminderKey = `reminder:${patient.id}:${today.toISOString().split('T')[0]}`;
        const alreadySent = await db.get(reminderKey);
        if (alreadySent) continue; // Already sent today

        // Check if patient already did today's check-in
        const todayCheckIn = await db.getPatientCheckInToday(patient.id);
        if (todayCheckIn) {
          // Mark reminder as sent (skip email since they already checked in)
          await db.set(reminderKey, true);
          continue;
        }

        const checkInUrl = `https://www.opwellconcierge.com/recovery-checkin?token=${patient.token}&day=${todayCheckin.day}`;
        const firstName = patient.name.split(' ')[0];

        // Send reminder email
        await resend.emails.send({
          from: 'OpWell Concierge <info@opwellconcierge.com>',
          to: patient.email,
          subject: `${todayCheckin.label} — How Are You Feeling?`,
          html: `
            <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #2c2c2c;">
              <div style="background: #3b2a1a; padding: 32px 40px; text-align: center;">
                <h1 style="color: #e8c97a; font-size: 1.6rem; margin: 0; letter-spacing: 0.05em;">OpWell Concierge™</h1>
                <p style="color: rgba(232,201,122,0.75); margin: 6px 0 0; font-size: 0.85rem; letter-spacing: 0.08em;">POST-OPERATIVE RECOVERY</p>
              </div>
              <div style="background: #fdf8f4; padding: 40px;">
                <div style="background: #2d5a3d; color: #fff; border-radius: 8px; padding: 16px 20px; text-align: center; margin-bottom: 24px;">
                  <p style="margin: 0; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; opacity: 0.8;">Day ${todayCheckin.day} Post-Op</p>
                  <p style="margin: 6px 0 0; font-size: 1.2rem; font-weight: 700;">${todayCheckin.label}</p>
                </div>

                <p style="color: #555; line-height: 1.7;">Hi ${esc(firstName)},</p>
                <p style="color: #555; line-height: 1.7;">${todayCheckin.message}</p>
                <p style="color: #555; line-height: 1.7;">Your daily check-in takes about <strong>3 minutes</strong> and helps Dr. Oluwole monitor your progress — so we can catch anything early and ensure you're healing well.</p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${checkInUrl}" style="display: inline-block; background: #2d5a3d; color: #fff; padding: 16px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">Start Your Check-In →</a>
                </div>

                <div style="background: #f0f7f2; border: 1px solid #b8d9c4; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                  <p style="margin: 0 0 8px; font-size: 0.85rem; font-weight: 700; color: #2d5a3d;">What We're Monitoring Today:</p>
                  <ul style="margin: 0; padding-left: 20px; color: #555; font-size: 0.9rem;">
                    <li style="margin-bottom: 4px;">Pain levels & medication effectiveness</li>
                    <li style="margin-bottom: 4px;">Wound healing & any drainage</li>
                    <li style="margin-bottom: 4px;">GI function & nausea</li>
                    <li style="margin-bottom: 4px;">Mental health & anxiety</li>
                    <li>Overall recovery quality (QoR-15)</li>
                  </ul>
                </div>

                <div style="background: rgba(200,132,90,0.08); border-left: 4px solid #c8845a; border-radius: 0 8px 8px 0; padding: 16px 20px; margin: 24px 0;">
                  <p style="margin: 0; font-size: 0.85rem; color: #555; line-height: 1.6;"><strong style="color: #3b2a1a;">Medical emergency?</strong> Call 911. For non-urgent questions, call (678) 235-5822.</p>
                </div>

                <p style="color: #555; line-height: 1.7;">Warmly,<br><strong>Dr. Ornella Oluwole</strong><br>OpWell Concierge™</p>
              </div>
              <div style="background: #3b2a1a; padding: 20px 40px; text-align: center;">
                <p style="color: rgba(232,201,122,0.6); font-size: 0.8rem; margin: 0;">OpWell Concierge™ · Telehealth · GA, OH & VA · (678) 235-5822</p>
              </div>
            </div>
          `
        });

        // Mark reminder as sent
        await db.set(reminderKey, true);
        sentCount++;

      } catch (patientErr) {
        console.error(`Error sending reminder to patient ${patient.id}:`, patientErr);
        errorCount++;
      }
    }

    console.log(`✓ Daily reminders sent: ${sentCount} emails, ${errorCount} errors`);
    return { success: true, sent: sentCount, errors: errorCount };

  } catch (err) {
    console.error('Cron job error:', err);
    return { success: false, error: err.message };
  }
}

module.exports = async function handler(req, res) {
  // Verify this is a Vercel Cron request
  const authToken = req.headers['authorization'];
  if (authToken !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await sendDailyReminders();
    return res.status(200).json(result);
  } catch (err) {
    console.error('Cron error:', err);
    return res.status(500).json({ error: 'Cron job failed' });
  }
};
