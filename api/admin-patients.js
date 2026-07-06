// Admin API: Get all patients and their check-in summary
// Protected endpoint - requires admin authentication in production

const db = require('../lib/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In production, verify admin API key from headers
    // For now, allow all requests (you should add auth in production)
    const adminKey = req.headers['x-admin-key'];
    // Uncomment in production:
    // if (adminKey !== process.env.ADMIN_API_KEY) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    const patients = await db.getAllPatients();

    const patientList = await Promise.all(patients.map(async (p) => {
      const checkIns = await db.getCheckInHistory(p.id);
      const qor15Scores = checkIns
        .filter(c => c.qor15_score)
        .map(c => parseInt(c.qor15_score));
      const avgQor15 = qor15Scores.length > 0
        ? Math.round(qor15Scores.reduce((a, b) => a + b, 0) / qor15Scores.length)
        : null;

      // If token is missing, generate one and save it
      let token = p.token;
      if (!token) {
        console.warn('⚠️ Patient has no token, generating one:', p.id);
        token = await db.generateAndSaveToken(p.id);
        if (token) {
          console.log('✅ Token generated and saved for patient:', p.id);
        }
      }

      return {
        id: p.id,
        name: p.name,
        email: p.email,
        phone: p.phone,
        token: token,
        surgeryType: p.surgery_type || p.surgeryType,
        surgeryDate: p.surgery_date || p.surgeryDate,
        lastCheckIn: p.last_checkin || p.lastCheckIn,
        createdAt: p.created_at || p.createdAt,
        checkInsCount: checkIns.length,
        latestQor15: checkIns.length > 0 ? checkIns[0].qor15_score : null,
        avgQor15: avgQor15
      };
    }));

    const avgQor15Overall = patientList
      .filter(p => p.avgQor15)
      .reduce((sum, p) => sum + p.avgQor15, 0) / (patientList.filter(p => p.avgQor15).length || 1);

    return res.status(200).json({
      success: true,
      patients: patientList,
      total: patientList.length,
      avgQor15Overall: Math.round(avgQor15Overall),
      totalCheckIns: patientList.reduce((sum, p) => sum + p.checkInsCount, 0)
    });

  } catch (err) {
    console.error('Admin patients error:', err);
    return res.status(500).json({ error: 'An internal error occurred' });
  }
};
