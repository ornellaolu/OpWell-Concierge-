const db = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Get all patients
    const { data: patients, error: pError } = await supabase
      .from('patients')
      .select('*');

    if (pError) {
      return res.status(500).json({
        error: 'Failed to query patients table',
        details: pError.message
      });
    }

    // Get sample check-ins
    const { data: checkins, error: cError } = await supabase
      .from('checkins')
      .select('*')
      .limit(5);

    return res.status(200).json({
      success: true,
      database: {
        patients: {
          count: patients?.length || 0,
          columns: patients?.[0] ? Object.keys(patients[0]) : [],
          data: patients?.map(p => ({
            id: p.id,
            name: p.name,
            email: p.email,
            token: p.token ? p.token.substring(0, 20) + '...' : 'NULL',
            created_at: p.created_at,
            last_checkin: p.last_checkin
          }))
        },
        checkins: {
          count: checkins?.length || 0,
          columns: checkins?.[0] ? Object.keys(checkins[0]) : [],
          sampleData: checkins?.map(c => ({
            id: c.id,
            patient_id: c.patient_id,
            date: c.date,
            qor15_score: c.qor15_score
          }))
        }
      }
    });

  } catch (err) {
    return res.status(500).json({
      error: 'Debug endpoint error',
      message: err.message
    });
  }
};
