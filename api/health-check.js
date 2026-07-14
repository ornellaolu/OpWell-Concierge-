module.exports = async function handler(req, res) {
  try {
    const db = require('../lib/db');

    // Try to get all patients to test database connection
    const patients = await db.getAllPatients();

    return res.status(200).json({
      success: true,
      status: 'healthy',
      database: 'connected',
      patientsInDatabase: patients ? patients.length : 0,
      timestamp: new Date().toISOString(),
      environment: {
        supabaseConfigured: !!process.env.SUPABASE_URL,
        resendConfigured: !!process.env.RESEND_API_KEY,
        adminKeySet: !!process.env.ADMIN_KEY
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      details: error.toString()
    });
  }
};
