// In-memory database for Phase 1
// Phase 2 will migrate to Vercel KV for production persistence
const kv = new Map();

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function generateToken() {
  return require('crypto').randomBytes(32).toString('hex');
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
  kv.set(`patient:${patientId}`, patient);
  kv.set(`token:${token}`, patientId);
  return patient;
}

async function getPatientByToken(token) {
  const patientId = kv.get(`token:${token}`);
  if (!patientId) return null;
  return kv.get(`patient:${patientId}`);
}

async function getPatientById(patientId) {
  return kv.get(`patient:${patientId}`);
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
  kv.set(`checkin:${patientId}:${date}`, checkIn);

  // Update patient lastCheckIn
  const patient = await getPatientById(patientId);
  if (patient) {
    patient.lastCheckIn = checkIn.timestamp;
    kv.set(`patient:${patientId}`, patient);
  }

  return checkIn;
}

async function getCheckInHistory(patientId) {
  const patient = await getPatientById(patientId);
  if (!patient) return [];

  const checkIns = [];
  for (const [key, value] of kv.entries()) {
    if (key.startsWith(`checkin:${patientId}:`)) {
      checkIns.push(value);
    }
  }

  return checkIns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function getPatientCheckInToday(patientId) {
  const date = new Date().toISOString().split('T')[0];
  return kv.get(`checkin:${patientId}:${date}`) || null;
}

async function getAllPatients() {
  const patients = [];
  for (const [key, value] of kv.entries()) {
    if (key.startsWith('patient:')) {
      patients.push(value);
    }
  }
  return patients;
}

async function set(key, value) {
  kv.set(key, value);
  return value;
}

async function get(key) {
  return kv.get(key);
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
