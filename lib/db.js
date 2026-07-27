const { Pool } = require('pg');
const crypto = require('crypto');

// Create connection pool for Neon PostgreSQL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: { rejectUnauthorized: false }
});

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createPatient(data) {
  const patientId = generateId();
  const token = generateToken();

  const query = `
    INSERT INTO patients (id, name, email, phone, surgery_type, surgery_date, token)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;

  const values = [
    patientId,
    data.name,
    data.email,
    data.phone,
    data.surgeryType,
    data.surgeryDate,
    token
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Error creating patient:', error.message);
    throw error;
  }
}

async function getPatientByToken(token) {
  console.log('🔍 Looking up patient with token:', token.substring(0, 20) + '...');

  const cleanToken = (token || '').trim();

  const query = `
    SELECT * FROM patients WHERE token = $1;
  `;

  try {
    const result = await pool.query(query, [cleanToken]);

    if (!result.rows || result.rows.length === 0) {
      console.error('❌ Token not found in database');
      return null;
    }

    if (result.rows.length > 1) {
      console.warn('⚠️ Multiple patients with same token, using first');
    }

    console.log('✅ Patient found:', result.rows[0].name);
    return result.rows[0];
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return null;
  }
}

async function getPatientById(patientId) {
  const query = `
    SELECT * FROM patients WHERE id = $1;
  `;

  try {
    const result = await pool.query(query, [patientId]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting patient by ID:', error.message);
    return null;
  }
}

async function getPatientByEmail(email) {
  const query = `
    SELECT * FROM patients WHERE email = $1 LIMIT 1;
  `;

  try {
    const result = await pool.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error getting patient by email:', error.message);
    return null;
  }
}

async function saveCheckIn(patientId, checkInData) {
  const checkInId = generateId();

  const query = `
    INSERT INTO checkins (id, patient_id, date, pain_level, qor15_score, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;

  const values = [
    checkInId,
    patientId,
    new Date().toISOString().split('T')[0],
    checkInData.responses?.painRest || null,
    checkInData.qor15?.total || null,
    checkInData.notes || ''
  ];

  try {
    const result = await pool.query(query, values);

    // Update patient's last_checkin timestamp
    const updateQuery = `
      UPDATE patients SET last_checkin = NOW() WHERE id = $1;
    `;
    await pool.query(updateQuery, [patientId]);

    console.log('✅ Check-in saved successfully:', {
      checkInId: result.rows[0].id,
      patientId: patientId,
      date: result.rows[0].date
    });

    return result.rows[0];
  } catch (error) {
    console.error('❌ Error saving check-in:', error.message);
    throw error;
  }
}

async function getPatientCheckInToday(patientId) {
  const today = new Date().toISOString().split('T')[0];

  const query = `
    SELECT * FROM checkins
    WHERE patient_id = $1 AND date = $2
    LIMIT 1;
  `;

  try {
    const result = await pool.query(query, [patientId, today]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('❌ Error checking today\'s check-in:', error.message);
    return null;
  }
}

async function getAllPatients() {
  const query = `
    SELECT * FROM patients
    ORDER BY created_at DESC;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all patients:', error.message);
    return [];
  }
}

async function getAllCheckIns() {
  const query = `
    SELECT c.*, p.name, p.email, p.surgery_type, p.surgery_date
    FROM checkins c
    LEFT JOIN patients p ON c.patient_id = p.id
    ORDER BY c.created_at DESC;
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting all check-ins:', error.message);
    return [];
  }
}

async function getCheckInsByPatient(patientId) {
  const query = `
    SELECT * FROM checkins
    WHERE patient_id = $1
    ORDER BY date DESC;
  `;

  try {
    const result = await pool.query(query, [patientId]);
    return result.rows;
  } catch (error) {
    console.error('❌ Error getting check-ins for patient:', error.message);
    return [];
  }
}

// Alias for backward compatibility
const getCheckInHistory = getCheckInsByPatient;

// Export all functions
module.exports = {
  createPatient,
  getPatientByToken,
  getPatientById,
  getPatientByEmail,
  saveCheckIn,
  getPatientCheckInToday,
  getAllPatients,
  getAllCheckIns,
  getCheckInsByPatient,
  getCheckInHistory
};
