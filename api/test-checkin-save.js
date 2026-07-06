const db = require('../lib/db');

module.exports = async function handler(req, res) {
  try {
    // Test save a check-in for the first patient
    const testPatientId = 'r20spzowb'; // Your patient ID

    const testCheckIn = await db.saveCheckIn(testPatientId, {
      firstName: 'Test',
      lastName: 'Patient',
      phone: '123-456-7890',
      surgeryType: 'Test',
      surgeryDate: '2026-07-03',
      responses: {
        painRest: 5,
        painActivity: 7
      },
      qor15: { total: 95 },
      notes: 'Test check-in'
    });

    return res.status(200).json({
      success: true,
      message: 'Test check-in saved successfully',
      checkInId: testCheckIn.id
    });

  } catch (err) {
    console.error('Test check-in error:', err);
    return res.status(500).json({
      error: 'Failed to save test check-in',
      message: err.message,
      stack: err.stack
    });
  }
};
