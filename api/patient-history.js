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

    const checkIns = await db.getCheckInHistory(patient.id);

    return res.status(200).json({
      success: true,
      patient: {
        name: patient.name,
        email: patient.email,
        surgeryType: patient.surgeryType,
        surgeryDate: patient.surgeryDate
      },
      checkIns,
      totalCheckIns: checkIns.length
    });

  } catch (err) {
    console.error('Patient history error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
