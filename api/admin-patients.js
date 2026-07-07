const db = require('../lib/db');

// Admin key for verification
const ADMIN_KEY = process.env.ADMIN_KEY || 'opwell';

module.exports = async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { action, patientId } = req.query;

    if (action === 'list-all') {
      // Get all patients
      console.log('📋 Fetching all patients...');
      const patients = await db.getAllPatients();

      // Enhance with check-in counts
      const enhancedPatients = await Promise.all(
        patients.map(async (patient) => {
          const checkins = await db.getCheckInHistory(patient.id);
          const qorScores = checkins
            .filter(c => c.qor15_score)
            .map(c => c.qor15_score);

          return {
            ...patient,
            totalCheckIns: checkins.length,
            lastCheckIn: patient.last_checkin,
            qorScores: qorScores,
            avgQoR15: qorScores.length > 0
              ? (qorScores.reduce((a, b) => a + b, 0) / qorScores.length).toFixed(1)
              : null
          };
        })
      );

      console.log(`✅ Retrieved ${enhancedPatients.length} patients`);
      return res.status(200).json({
        success: true,
        count: enhancedPatients.length,
        patients: enhancedPatients
      });

    } else if (action === 'patient-detail' && patientId) {
      // Get single patient with all check-ins
      console.log('📋 Fetching patient:', patientId);
      const patient = await db.getPatientById(patientId);
      if (!patient) {
        return res.status(404).json({ error: 'Patient not found' });
      }

      const checkins = await db.getCheckInHistory(patientId);

      // Calculate metrics
      const qorScores = checkins.filter(c => c.qor15_score).map(c => c.qor15_score);
      const avgQoR = qorScores.length > 0
        ? (qorScores.reduce((a, b) => a + b, 0) / qorScores.length).toFixed(1)
        : null;

      const postOpDays = checkins.map(c => {
        const surgeryDate = new Date(patient.surgery_date);
        const checkInDate = new Date(c.date);
        return Math.floor((checkInDate - surgeryDate) / (1000 * 60 * 60 * 24));
      });

      console.log(`✅ Retrieved ${checkins.length} check-ins for ${patient.name}`);
      return res.status(200).json({
        success: true,
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          surgeryType: patient.surgery_type,
          surgeryDate: patient.surgery_date,
          enrolledAt: patient.created_at
        },
        metrics: {
          totalCheckIns: checkins.length,
          avgQoR15: avgQoR,
          qorScores: qorScores,
          postOpDaysWithData: postOpDays
        },
        checkins: checkins.map(c => ({
          id: c.id,
          date: c.date,
          qor15Score: c.qor15_score,
          notes: c.notes,
          timestamp: c.timestamp
        }))
      });

    } else if (action === 'metrics') {
      // Get aggregate metrics across all patients
      console.log('📊 Calculating aggregate metrics...');
      const patients = await db.getAllPatients();

      let totalCheckIns = 0;
      let qorScoresAll = [];

      for (const patient of patients) {
        const checkins = await db.getCheckInHistory(patient.id);
        totalCheckIns += checkins.length;
        qorScoresAll.push(...checkins.filter(c => c.qor15_score).map(c => c.qor15_score));
      }

      const avgQoRGlobal = qorScoresAll.length > 0
        ? (qorScoresAll.reduce((a, b) => a + b, 0) / qorScoresAll.length).toFixed(1)
        : null;

      console.log(`✅ Metrics: ${patients.length} patients, ${totalCheckIns} check-ins`);
      return res.status(200).json({
        success: true,
        metrics: {
          totalPatients: patients.length,
          totalCheckIns: totalCheckIns,
          avgCheckInsPerPatient: (totalCheckIns / (patients.length || 1)).toFixed(1),
          avgQoR15Global: avgQoRGlobal,
          dataPoints: qorScoresAll.length
        }
      });

    } else {
      return res.status(400).json({
        error: 'Invalid action. Use: list-all, patient-detail?patientId=X, or metrics'
      });
    }

  } catch (error) {
    console.error('❌ Admin patients error:', error);
    return res.status(500).json({
      error: 'An internal error occurred',
      details: error.message
    });
  }
};
