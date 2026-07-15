const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Use SERVICE_ROLE_KEY for server-side API calls
// This bypasses RLS (which is OK since API validates all requests)
// RLS policies serve as defense-in-depth protection
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function createPatient(data) {
  const patientId = generateId();
  const token = generateToken();
  const patient = {
    id: patientId,
    ...data,
    token,
    created_at: new Date().toISOString(),
    last_checkin: null
  };

  // Insert into patients table
  const { error } = await supabase
    .from('patients')
    .insert([{
      id: patientId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      surgery_type: data.surgeryType,
      surgery_date: data.surgeryDate,
      token: token
    }]);

  if (error) throw error;

  return patient;
}

async function getPatientByToken(token) {
  console.log('🔍 Looking up patient with token:', token.substring(0, 20) + '...');

  // Trim whitespace just in case
  const cleanToken = (token || '').trim();

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('token', cleanToken);

  if (error) {
    console.error('❌ Database error:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    console.error('❌ Token not found in database');
    return null;
  }

  if (data.length > 1) {
    console.warn('⚠️ Multiple patients with same token, using first');
  }

  console.log('✅ Patient found:', data[0].name);
  return data[0];
}

async function getPatientById(patientId) {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .single();

  if (error) return null;
  return data;
}

async function saveCheckIn(patientId, checkInData) {
  const checkInId = generateId();
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const qor15Total = checkInData.qor15?.total || checkInData.qor15Score || null;

  // Only insert columns that exist in the checkins table schema
  const insertObj = {
    id: checkInId,
    patient_id: patientId,
    date: date,
    qor15_score: qor15Total,
    notes: checkInData.notes || ''
  };

  console.log('Inserting check-in:', { id: checkInId, patientId, date, qor15_score: qor15Total });

  const { error } = await supabase
    .from('checkins')
    .insert([insertObj]);

  if (error) {
    console.error('❌ Database insert failed:', error.message);
    throw error;
  }

  console.log('✅ Check-in inserted successfully');

  // Update patient lastCheckIn timestamp
  try {
    console.log('Updating patient last_checkin:', { patientId, timestamp });
    const { data: updateData, error: updateError } = await supabase
      .from('patients')
      .update({ last_checkin: timestamp })
      .eq('id', patientId)
      .select();

    if (updateError) {
      console.error('❌ Failed to update patient last_checkin:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details
      });
    } else {
      console.log('✅ Patient last_checkin updated successfully:', { patientId, timestamp, updateData });
    }
  } catch (updateErr) {
    console.error('❌ Exception updating patient last_checkin:', updateErr.message);
  }

  return {
    id: checkInId,
    patientId,
    timestamp,
    date,
    qor15_score: qor15Total,
    notes: checkInData.notes || ''
  };
}

async function getCheckInHistory(patientId) {
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('patient_id', patientId)
    .order('date', { ascending: false });

  if (error) return [];
  return data || [];
}

async function getPatientCheckInToday(patientId) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('checkins')
    .select('*')
    .eq('patient_id', patientId)
    .eq('date', today)
    .single();

  if (error) return null;
  return data;
}

async function getAllPatients() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

async function generateAndSaveToken(patientId) {
  const token = generateToken();
  const { error } = await supabase
    .from('patients')
    .update({ token: token })
    .eq('id', patientId);

  if (error) {
    console.error('Failed to save token:', error);
    return null;
  }
  return token;
}

module.exports = {
  generateId,
  generateToken,
  createPatient,
  getPatientByToken,
  getPatientById,
  saveCheckIn,
  getCheckInHistory,
  getPatientCheckInToday,
  getAllPatients,
  generateAndSaveToken
};
