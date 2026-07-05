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

    const patientList = patients.map(p => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      surgeryType: p.surgery_type || p.surgeryType,
      surgeryDate: p.surgery_date || p.surgeryDate,
      lastCheckIn: p.last_checkin || p.lastCheckIn,
      createdAt: p.created_at || p.createdAt
    }));

    return res.status(200).json({
      success: true,
      patients: patientList,
      total: patientList.length
    });

  } catch (err) {
    console.error('Admin patients error:', err);
    return res.status(500).json({ error: 'An internal error occurred' });
  }
};
