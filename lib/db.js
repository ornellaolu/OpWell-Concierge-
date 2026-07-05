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
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .eq('token', token)
    .single();

  if (error) {
    console.error('getPatientByToken error:', error.message);
    return null;
  }
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
  const date = new Date().toISOString().split('T')[0];

  const { error } = await supabase
    .from('checkins')
    .insert([{
      id: checkInId,
      patient_id: patientId,
      date: date,
      pain_level: checkInData.painLevel,
      qor15_score: checkInData.qor15Score,
      notes: checkInData.notes
    }]);

  if (error) throw error;

  // Update patient lastCheckIn
  await supabase
    .from('patients')
    .update({ last_checkin: new Date().toISOString() })
    .eq('id', patientId);

  return { id: checkInId, patientId, ...checkInData, date };
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

module.exports = {
  generateId,
  generateToken,
  createPatient,
  getPatientByToken,
  getPatientById,
  saveCheckIn,
  getCheckInHistory,
  getPatientCheckInToday,
  getAllPatients
};
