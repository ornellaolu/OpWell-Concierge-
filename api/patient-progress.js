const db = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Missing authentication token' });
    }

    const patient = await db.getPatientByToken(token);
    if (!patient) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Get check-in history
    const checkIns = await db.getCheckInHistory(patient.id);

    // Get today's check-in status
    const todayCheckIn = await db.getPatientCheckInToday(patient.id);

    // Calculate post-op day
    const surgeryDate = new Date(patient.surgery_date || patient.surgeryDate);
    const today = new Date();
    const pod = Math.floor((today - surgeryDate) / (1000 * 60 * 60 * 24));

    return res.status(200).json({
      success: true,
      patient: {
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        surgeryType: patient.surgery_type || patient.surgeryType,
        surgeryDate: patient.surgery_date || patient.surgeryDate,
        createdAt: patient.created_at || patient.createdAt
      },
      recovery: {
        postOpDay: pod,
        totalCheckIns: checkIns.length,
        lastCheckIn: patient.last_checkin,
        canCheckInToday: !todayCheckIn
      },
      checkInHistory: checkIns.map(c => ({
        id: c.id,
        date: c.date,
        qor15Score: c.qor15_score,
        notes: c.notes
      }))
    });

  } catch (err) {
    console.error('Patient progress error:', err);
    return res.status(500).json({ error: 'An internal error occurred' });
  }
};
