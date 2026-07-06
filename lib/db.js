const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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

  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    console.error('❌ Token lookup failed:', {
      message: error.message,
      code: error.code,
      searchedToken: token.substring(0, 20) + '...'
    });

    // Try to fetch all patients to see what tokens exist
    const { data: allPatients } = await supabase
      .from('patients')
      .select('id, name, token')
      .limit(5);

    console.log('📋 Existing patients (first 5):',
      allPatients?.map(p => ({
        id: p.id,
        name: p.name,
        hasToken: !!p.token,
        tokenStart: p.token?.substring(0, 20)
      }))
    );

    return null;
  }

  console.log('✅ Patient found:', data.name);
  return data;
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

  // Prepare insert object with only supported columns
  const insertObj = {
    id: checkInId,
    patient_id: patientId,
    date: date,
    qor15_score: qor15Total,
    notes: checkInData.notes || ''
  };

  // Try to add optional fields if they exist in schema
  if (checkInData.timestamp) insertObj.timestamp = checkInData.timestamp;
  if (checkInData.created_at) insertObj.created_at = checkInData.created_at;
  if (checkInData.responses) insertObj.responses = checkInData.responses;
  if (checkInData.flags) insertObj.flags = checkInData.flags;

  const { error } = await supabase
    .from('checkins')
    .insert([insertObj]);

  if (error) {
    console.error('saveCheckIn database error:', error);
    throw error;
  }

  // Update patient lastCheckIn
  await supabase
    .from('patients')
    .update({ last_checkin: timestamp })
    .eq('id', patientId);

  return {
    id: checkInId,
    patientId,
    timestamp,
    date,
    qor15_score: qor15Total,
    notes: checkInData.notes || '',
    responses: checkInData.responses,
    flags: checkInData.flags,
    ...checkInData
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
