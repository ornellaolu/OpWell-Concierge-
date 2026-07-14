// Admin API: Get detailed patient data with full check-in history
// Protected endpoint - requires admin authentication in production

const db = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { patientId } = req.query;

    if (!patientId) {
      return res.status(400).json({ error: 'Missing patientId' });
    }

    // Get patient
    const patient = await db.getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Get all check-ins
    const checkIns = await db.getCheckInHistory(patientId);

    // Calculate metrics
    const pod = Math.floor((new Date() - new Date(patient.surgery_date)) / (1000 * 60 * 60 * 24));
    const totalCheckIns = checkIns.length;
    const qor15Scores = checkIns
      .filter(ci => ci.qor15_score)
      .map(ci => ({ date: ci.date, score: ci.qor15_score }))
      .reverse();

    const avgQor15 = qor15Scores.length > 0
      ? Math.round(qor15Scores.reduce((sum, ci) => sum + ci.score, 0) / qor15Scores.length)
      : null;

    // Flag analysis
    const flaggedCheckIns = checkIns.filter(ci => ci.flags && ci.flags.length > 0);

    return res.status(200).json({
      success: true,
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
        surgeryType: patient.surgery_type,
        surgeryDate: patient.surgery_date,
        createdAt: patient.created_at,
        lastCheckIn: patient.last_checkin,
        token: patient.token
      },
      metrics: {
        daysPostOp: pod,
        totalCheckIns,
        averageQor15: avgQor15,
        flaggedCheckIns: flaggedCheckIns.length,
        complianceRate: totalCheckIns > 0 ? Math.round((totalCheckIns / Math.max(pod + 1, 1)) * 100) : 0
      },
      checkInHistory: checkIns.map(ci => ({
        id: ci.id,
        date: ci.date,
        timestamp: ci.timestamp || ci.created_at,
        qor15Score: ci.qor15_score,
        flagsCount: ci.flags ? ci.flags.length : 0,
        flags: ci.flags || [],
        notes: ci.notes || '',
        responses: ci.responses || {}
      })),
      qor15Trends: qor15Scores,
      flaggedCheckIns: flaggedCheckIns.map(ci => ({
        id: ci.id,
        date: ci.date,
        timestamp: ci.timestamp || ci.created_at,
        flags: ci.flags || [],
        notes: ci.notes || ''
      }))
    });

  } catch (err) {
    console.error('Admin patient detail error:', err);
    return res.status(500).json({ error: 'An internal error occurred' });
  }
};
