// Vercel KV (Redis) Database
const crypto = require('crypto');
const { kv } = require('@vercel/kv');

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
    createdAt: new Date().toISOString(),
    lastCheckIn: null
  };

  // Store patient record
  await kv.set(`patient:${patientId}`, JSON.stringify(patient), { ex: 7776000 }); // 90 days TTL
  // Store token → patient ID mapping
  await kv.set(`token:${token}`, patientId, { ex: 604800 }); // 7 days TTL

  return patient;
}

async function getPatientByToken(token) {
  const patientId = await kv.get(`token:${token}`);
  if (!patientId) return null;
  const patientData = await kv.get(`patient:${patientId}`);
  return patientData ? JSON.parse(patientData) : null;
}

async function getPatientById(patientId) {
  const patientData = await kv.get(`patient:${patientId}`);
  return patientData ? JSON.parse(patientData) : null;
}

async function saveCheckIn(patientId, checkInData) {
  const checkInId = generateId();
  const date = new Date().toISOString().split('T')[0];
  const checkIn = {
    id: checkInId,
    patientId,
    ...checkInData,
    date,
    timestamp: new Date().toISOString()
  };

  // Store check-in
  await kv.set(`checkin:${patientId}:${date}`, JSON.stringify(checkIn), { ex: 7776000 });

  // Update patient lastCheckIn
  const patient = await getPatientById(patientId);
  if (patient) {
    patient.lastCheckIn = checkIn.timestamp;
    await kv.set(`patient:${patientId}`, JSON.stringify(patient), { ex: 7776000 });
  }

  return checkIn;
}

async function getCheckInHistory(patientId) {
  // In Vercel KV, we need to scan for keys matching the pattern
  // For now, we'll try to get all checkin keys - this is a limitation of KV
  // A better approach would be to store a list of checkin dates on the patient record

  const patient = await getPatientById(patientId);
  if (!patient) return [];

  // For MVP, we'll store checkins in an array on the patient record
  // This is a simplification but works for now
  const checkIns = [];

  // Try to get the last 90 days of checkins
  for (let i = 0; i < 90; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const checkInData = await kv.get(`checkin:${patientId}:${dateStr}`);
    if (checkInData) {
      checkIns.push(JSON.parse(checkInData));
    }
  }

  return checkIns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function getPatientCheckInToday(patientId) {
  const date = new Date().toISOString().split('T')[0];
  const checkInData = await kv.get(`checkin:${patientId}:${date}`);
  return checkInData ? JSON.parse(checkInData) : null;
}

async function getAllPatients() {
  // Vercel KV doesn't have a good way to list all keys
  // This is a limitation - for production, you'd use a different approach
  // For now, return empty array (admin would need patient ID to look up)
  console.log('getAllPatients not fully implemented with Vercel KV');
  return [];
}

async function set(key, value) {
  await kv.set(key, JSON.stringify(value), { ex: 604800 }); // 7 days TTL
  return value;
}

async function get(key) {
  const data = await kv.get(key);
  return data ? JSON.parse(data) : null;
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
  set,
  get
};
