const db = require('../lib/db');
const PDFDocument = require('pdfkit');

// QoR-15 Domain Grouping
const QOR15_DOMAINS = {
  'Physical Comfort': [
    'breathe_easily',
    'enjoy_food',
    'feeling_rested',
    'good_sleep'
  ],
  'Physical Independence': [
    'personal_hygiene',
    'return_usual_activities'
  ],
  'Psychological Support': [
    'support_from_doctors_nurses',
    'communication_family'
  ],
  'Emotional State': [
    'comfortable_in_control',
    'general_wellbeing',
    'feeling_anxious',
    'feeling_depressed'
  ],
  'Pain': [
    'moderate_pain',
    'severe_pain',
    'nausea_vomiting'
  ]
};

// Parse QoR-15 responses from check-in data
function parseQoR15Responses(checkIn) {
  if (!checkIn.responses) return null;

  const responses = checkIn.responses;
  const domains = {};

  Object.entries(QOR15_DOMAINS).forEach(([domain, questions]) => {
    const scores = questions.map(q => parseInt(responses[q]) || 0).filter(s => s > 0);
    domains[domain] = {
      score: scores.reduce((a, b) => a + b, 0),
      maxScore: questions.length * 10,
      questions: questions.length,
      details: questions.map(q => ({
        question: q,
        score: parseInt(responses[q]) || 0
      }))
    };
  });

  return domains;
}

// Calculate recovery trajectory and metrics
function calculateRecoveryMetrics(checkIns) {
  if (!checkIns || checkIns.length === 0) return null;

  const sortedCheckIns = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));

  const metrics = {
    totalCheckIns: checkIns.length,
    firstCheckInDate: sortedCheckIns[0].date,
    lastCheckInDate: sortedCheckIns[sortedCheckIns.length - 1].date,
    qorScores: sortedCheckIns.map(ci => ({
      date: ci.date,
      score: ci.qor15_score || 0,
      domains: parseQoR15Responses(ci)
    })),
    averageQoR15: Math.round(
      sortedCheckIns.reduce((sum, ci) => sum + (ci.qor15_score || 0), 0) / sortedCheckIns.length
    ),
    trend: calculateTrend(sortedCheckIns),
    clinicalAlerts: detectClinicalAlerts(sortedCheckIns)
  };

  return metrics;
}

// Detect clinically significant declines
function detectClinicalAlerts(checkIns) {
  const alerts = [];
  const sortedCheckIns = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));

  for (let i = 1; i < sortedCheckIns.length; i++) {
    const current = sortedCheckIns[i].qor15_score || 0;
    const previous = sortedCheckIns[i - 1].qor15_score || 0;
    const decline = previous - current;

    // Alert if score drops by more than 10 points
    if (decline > 10) {
      alerts.push({
        type: 'SIGNIFICANT_DECLINE',
        severity: 'HIGH',
        message: `Clinically significant decline detected: ${decline} points between ${sortedCheckIns[i - 1].date} and ${sortedCheckIns[i].date}`,
        previousScore: previous,
        currentScore: current,
        decline: decline,
        date: sortedCheckIns[i].date,
        action: 'INTERVENTION_RECOMMENDED'
      });
    }

    // Alert if score falls below 90
    if (current < 90) {
      alerts.push({
        type: 'LOW_SCORE',
        severity: 'MEDIUM',
        message: `Patient QoR-15 score below 90 (${current}) on ${sortedCheckIns[i].date}`,
        score: current,
        date: sortedCheckIns[i].date,
        action: 'CLINICAL_REVIEW_RECOMMENDED'
      });
    }
  }

  return alerts;
}

// Calculate improvement trend
function calculateTrend(checkIns) {
  if (checkIns.length < 2) return 'INSUFFICIENT_DATA';

  const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstScore = sorted[0].qor15_score || 0;
  const lastScore = sorted[sorted.length - 1].qor15_score || 0;
  const improvement = lastScore - firstScore;

  if (improvement > 10) return 'IMPROVING';
  if (improvement < -10) return 'DECLINING';
  return 'STABLE';
}

module.exports = async function handler(req, res) {
  const { patientId, action } = req.query;

  if (!patientId) {
    return res.status(400).json({ error: 'Missing patientId' });
  }

  try {
    const patient = await db.getPatientById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const checkIns = await db.getCheckInHistory(patientId);
    const metrics = calculateRecoveryMetrics(checkIns);

    if (action === 'generate-pdf') {
      // Generate PDF report
      const pdf = await generateSurgeonReport(patient, metrics, checkIns);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Recovery_Report_${patient.id}.pdf"`);
      res.send(pdf);
    } else {
      // Return metrics as JSON
      return res.status(200).json({
        success: true,
        patient: {
          id: patient.id,
          name: patient.name,
          email: patient.email,
          phone: patient.phone,
          surgeryType: patient.surgery_type,
          surgeryDate: patient.surgery_date
        },
        metrics
      });
    }

  } catch (error) {
    console.error('Recovery report error:', error);
    return res.status(500).json({
      error: 'An internal error occurred',
      details: error.message
    });
  }
};

// Generate PDF Report for EMR Export
async function generateSurgeonReport(patient, metrics, checkIns) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(24).fillColor('#2D5A3D').text('OpWell Concierge™', { align: 'center' });
    doc.fontSize(12).fillColor('#2c2c2c').text('Recovery Monitoring Report', { align: 'center' });
    doc.fontSize(9).fillColor('#888888').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(0.5);

    // Patient Info
    doc.fontSize(11).fillColor('#2D5A3D').text('PATIENT INFORMATION', { underline: true });
    doc.fontSize(10).fillColor('#2c2c2c');
    doc.text(`Name: ${patient.name}`);
    doc.text(`Surgery: ${patient.surgery_type} on ${patient.surgery_date}`);
    doc.text(`Phone: ${patient.phone}`);
    doc.moveDown(0.5);

    // Recovery Trajectory Summary
    doc.fontSize(11).fillColor('#2D5A3D').text('RECOVERY TRAJECTORY', { underline: true });
    if (metrics && metrics.qorScores && metrics.qorScores.length > 0) {
      const firstScore = metrics.qorScores[0].score;
      const lastScore = metrics.qorScores[metrics.qorScores.length - 1].score;
      const improvement = lastScore - firstScore;

      doc.fontSize(10).fillColor('#2c2c2c');
      doc.text(`Total Check-Ins: ${metrics.totalCheckIns}`);
      doc.text(`Initial QoR-15: ${firstScore}`);
      doc.text(`Latest QoR-15: ${lastScore}`);
      doc.text(`Overall Change: ${improvement > 0 ? '+' : ''}${improvement} points`);
      doc.text(`Trend: ${metrics.trend}`);
    }
    doc.moveDown(0.5);

    // Domain Scores (if available)
    if (metrics && metrics.qorScores && metrics.qorScores.length > 0 && metrics.qorScores[metrics.qorScores.length - 1].domains) {
      doc.fontSize(11).fillColor('#2D5A3D').text('LATEST DOMAIN ASSESSMENT', { underline: true });
      const latestDomains = metrics.qorScores[metrics.qorScores.length - 1].domains;

      doc.fontSize(9).fillColor('#2c2c2c');
      Object.entries(latestDomains).forEach(([domain, data]) => {
        const percentage = Math.round((data.score / data.maxScore) * 100);
        doc.text(`${domain}: ${data.score}/${data.maxScore} (${percentage}%)`);
      });
    }
    doc.moveDown(0.5);

    // Clinical Alerts
    if (metrics && metrics.clinicalAlerts && metrics.clinicalAlerts.length > 0) {
      doc.fontSize(11).fillColor('#C92A2A').text('⚠️  CLINICAL ALERTS', { underline: true });
      doc.fontSize(9).fillColor('#2c2c2c');
      metrics.clinicalAlerts.forEach(alert => {
        doc.text(`• ${alert.type}: ${alert.message}`);
      });
    } else if (metrics) {
      doc.fontSize(10).fillColor('#2D5A3D').text('✓ No clinical alerts');
    }
    doc.moveDown(0.5);

    // Check-In Timeline
    doc.fontSize(11).fillColor('#2D5A3D').text('CHECK-IN TIMELINE', { underline: true });
    doc.fontSize(8).fillColor('#2c2c2c');

    const sorted = [...checkIns].sort((a, b) => new Date(a.date) - new Date(b.date));
    sorted.slice(-7).forEach(ci => { // Show last 7 check-ins
      const score = ci.qor15_score || 'N/A';
      doc.text(`${ci.date}: QoR-15 = ${score}`);
    });

    // Footer
    doc.fontSize(8).fillColor('#888888').text(
      'This report is intended for EMR integration and clinical review. For questions, contact Dr. Ornella Oluwole at dr.oluwole@opwellconcierge.com',
      { align: 'center' }
    );

    doc.end();
  });
}
