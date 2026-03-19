const { Resend } = require('resend');

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

/* ── Scoring (server-side, mirrors physician tool) ── */

function scorePain(r) {
  if (r.painRest === null && r.painActivity === null) return null;
  const rest = r.painRest !== null ? r.painRest : 0;
  const act  = r.painActivity !== null ? r.painActivity : 0;
  let raw = 100 - (rest * 10 * 0.6 + act * 7 * 0.4) / 10;
  const mod = { yes: 0, somewhat: -10, no: -25 };
  if (r.painManaged) raw += (mod[r.painManaged] || 0);
  return clamp(Math.round(raw), 0, 100);
}

function scoreWound(r) {
  const p = {
    drainage: { none:0, 'minimal-clear':5, moderate:20, heavy:35, bloody:40, foul:50 },
    opening:  { no:0, slight:15, significant:35 },
    redness:  { none:0, mild:10, spreading:30 }
  };
  let penalty = 0, count = 0;
  for (const k of Object.keys(p)) {
    if (r[k] != null) { count++; penalty += (p[k][r[k]] || 0); }
  }
  return count === 0 ? null : clamp(Math.round(100 - penalty), 0, 100);
}

function scoreGI(r) {
  const p = {
    nausea:   { none:0, mild:8, moderate:20, severe:35 },
    vomiting: { none:0, once:15, multiple:35 },
    intake:   { normal:0, reduced:10, minimal:25, none:45 }
  };
  let penalty = 0, count = 0;
  for (const k of Object.keys(p)) {
    if (r[k] != null) { count++; penalty += (p[k][r[k]] || 0); }
  }
  return count === 0 ? null : clamp(Math.round(100 - penalty), 0, 100);
}

function scoreMental(r) {
  const p = {
    anxiety: { none:0, mild:10, moderate:25, severe:45 },
    mood:    { positive:0, neutral:5, low:25, 'very-low':45 }
  };
  let penalty = 0, count = 0;
  for (const k of Object.keys(p)) {
    if (r[k] != null) { count++; penalty += (p[k][r[k]] || 0); }
  }
  return count === 0 ? null : clamp(Math.round(100 - (penalty / Math.max(count, 1))), 0, 100);
}

function scoreRedFlags(flags, surgeryFlags) {
  let flagCount = (flags || []).filter(Boolean).length;
  let surgEmergency = false;
  for (const key of Object.keys(surgeryFlags || {})) {
    (surgeryFlags[key] || []).forEach((f, i) => {
      if (f) {
        flagCount++;
        if ((key === 'bbl' && i === 1) || (key === 'bariatric' && i === 0)) surgEmergency = true;
      }
    });
  }
  if (flags[8] || flags[9] || flags[10] || surgEmergency) return 0;
  if (flagCount >= 4) return 10;
  if (flagCount === 3) return 25;
  if (flagCount === 2) return 40;
  if (flagCount === 1) return 60;
  return 100;
}

function calculateComposite(responses, flags, surgeryFlags) {
  const weights = { pain: 0.15, wound: 0.20, gi: 0.15, mental: 0.15, redflags: 0.35 };
  const scores = {
    pain: scorePain(responses),
    wound: scoreWound(responses),
    gi: scoreGI(responses),
    mental: scoreMental(responses),
    redflags: scoreRedFlags(flags, surgeryFlags)
  };
  let totalWeight = 0, weightedSum = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v !== null) { totalWeight += weights[k]; weightedSum += v * weights[k]; }
  }
  if (totalWeight === 0) return { composite: null, scores, risk: null };
  let composite = Math.round(weightedSum / totalWeight);
  if (flags[8] || flags[9]) composite = Math.min(composite, 25);
  const risk = classifyRisk(composite);
  return { composite, scores, risk };
}

function classifyRisk(score) {
  if (score === null) return null;
  if (score >= 80) return { level: 'low', label: 'Low Risk', color: '#16A34A' };
  if (score >= 60) return { level: 'moderate', label: 'Moderate', color: '#CA8A04' };
  if (score >= 40) return { level: 'high', label: 'Needs Attention', color: '#D97706' };
  return { level: 'critical', label: 'Urgent', color: '#DC2626' };
}

/* ── Label Maps ── */

const FLAG_LABELS = [
  'Wound drainage, opening, or increasing redness',
  'No bowel movement >24 hours',
  'Increasing/worsening pain',
  'Vomiting',
  'Abdominal swelling/bloating',
  'Dark/no urine output',
  'Fever >101.5°F',
  'Unable to eat or drink >24 hours',
  'Shortness of breath / difficulty breathing',
  'Chest pain',
  'Unilateral leg swelling or calf pain (DVT risk)',
  'New confusion or altered mental status'
];

const SURG_FLAG_LABELS = {
  bbl: ['Leg swelling / calf pain (DVT/PE)', 'Buttock pain with tachycardia (fat embolism)', 'Asymmetric swelling at surgical site'],
  bariatric: ['Left shoulder pain with tachycardia (anastomotic leak)', 'Dumping syndrome symptoms', 'Blood sugar instability'],
  cesarean: ['Heavy lochia (>1 pad/hour)', 'PPD screen concern', 'Foul-smelling vaginal discharge']
};

const SURGERY_LABELS = {
  'major-abdominal': 'Major Abdominal', bariatric: 'Bariatric', cancer: 'Cancer Surgery',
  thoracic: 'Thoracic', vascular: 'Vascular', 'cosmetic-bbl': 'BBL', 'cosmetic-tummy': 'Tummy Tuck',
  'cosmetic-other': 'Cosmetic (Other)', 'joint-replacement': 'Joint Replacement',
  hysterectomy: 'Hysterectomy', cesarean: 'C-Section', 'moderate-other': 'Moderate (Other)',
  laparoscopic: 'Laparoscopic', outpatient: 'Outpatient', 'low-risk-other': 'Low-Risk (Other)'
};

const RESPONSE_LABELS = {
  painManaged: { yes: 'Yes', somewhat: 'Somewhat', no: 'No' },
  drainage: { none: 'None', 'minimal-clear': 'Minimal / clear', moderate: 'Moderate', heavy: 'Heavy', bloody: 'Bloody', foul: 'Foul-smelling' },
  opening: { no: 'No', slight: 'Slight separation', significant: 'Significant opening' },
  redness: { none: 'None', mild: 'Mild (edges)', spreading: 'Spreading beyond wound' },
  nausea: { none: 'None', mild: 'Mild', moderate: 'Moderate', severe: 'Severe' },
  vomiting: { none: 'None', once: 'Once', multiple: 'Multiple episodes' },
  intake: { normal: 'Normal', reduced: 'Reduced', minimal: 'Minimal (sips)', none: 'None (NPO)' },
  anxiety: { none: 'Calm', mild: 'Mild', moderate: 'Moderate', severe: 'Severe' },
  mood: { positive: 'Positive', neutral: 'Neutral', low: 'Low', 'very-low': 'Very low' }
};

function label(field, val) {
  if (val === null || val === undefined) return '—';
  return (RESPONSE_LABELS[field] && RESPONSE_LABELS[field][val]) || val;
}

/* ── Email Builders ── */

function scoreColor(score) {
  if (score === null) return '#888';
  if (score >= 80) return '#16A34A';
  if (score >= 60) return '#CA8A04';
  if (score >= 40) return '#D97706';
  return '#DC2626';
}

function scoreBar(lbl, score) {
  const c = scoreColor(score);
  const w = score !== null ? score : 0;
  return `<tr>
    <td style="padding:5px 8px; font-size:0.88rem; color:#555; width:80px;">${lbl}</td>
    <td style="padding:5px 8px;">
      <div style="background:#eee; border-radius:6px; height:14px; width:100%; position:relative;">
        <div style="background:${c}; border-radius:6px; height:14px; width:${w}%;"></div>
      </div>
    </td>
    <td style="padding:5px 8px; font-size:0.88rem; font-weight:600; color:${c}; width:50px; text-align:right;">${score !== null ? score : '—'}</td>
  </tr>`;
}

function buildDoctorEmail(d) {
  const r = d.responses;
  const triggeredFlags = [];
  (d.flags || []).forEach((f, i) => { if (f) triggeredFlags.push(FLAG_LABELS[i] || `Flag ${i+1}`); });
  for (const key of Object.keys(d.surgeryFlags || {})) {
    (d.surgeryFlags[key] || []).forEach((f, i) => {
      if (f && SURG_FLAG_LABELS[key]) triggeredFlags.push(`[${key.toUpperCase()}] ${SURG_FLAG_LABELS[key][i]}`);
    });
  }

  const riskBg = d.risk ? d.risk.color : '#888';
  const riskLabel = d.risk ? d.risk.label : 'Incomplete';
  const surgLabel = SURGERY_LABELS[d.surgeryType] || d.surgeryType || '—';
  const ts = d.timestamp ? new Date(d.timestamp).toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'medium', timeStyle: 'short' }) : '—';

  let redBanner = '';
  if (d.hasEmergencyFlags) {
    redBanner = `<div style="background:#DC2626; color:#fff; padding:14px 24px; font-size:1rem; font-weight:700; text-align:center;">⚠️ EMERGENCY RED FLAG — IMMEDIATE REVIEW REQUIRED</div>`;
  } else if (d.hasRedFlags) {
    redBanner = `<div style="background:#D97706; color:#fff; padding:12px 24px; font-size:0.95rem; font-weight:700; text-align:center;">⚠ PRIORITY — Red Flags Reported</div>`;
  }

  return `<div style="font-family:Arial,sans-serif; max-width:600px; margin:0 auto; color:#2c2c2c;">
  <div style="background:#3b2a1a; padding:24px 32px;">
    <h2 style="color:#e8c97a; margin:0; font-size:1.2rem;">Patient Recovery Check-In — OpWell Concierge</h2>
  </div>
  ${redBanner}
  <div style="padding:32px; background:#fdf8f4;">
    <table style="width:100%; border-collapse:collapse; font-size:0.95rem; margin-bottom:20px;">
      <tr><td style="padding:6px 0; color:#888; width:120px;">Patient</td><td style="padding:6px 0; font-weight:600;">${esc(d.patientName)}</td></tr>
      <tr><td style="padding:6px 0; color:#888;">Phone</td><td style="padding:6px 0; font-weight:600;"><a href="tel:${esc(d.phone || '')}" style="color:#2d5a3d; text-decoration:none;">${esc(d.phone || '—')}</a></td></tr>
      <tr><td style="padding:6px 0; color:#888;">Surgery</td><td style="padding:6px 0;">${esc(surgLabel)}</td></tr>
      <tr><td style="padding:6px 0; color:#888;">POD</td><td style="padding:6px 0; font-weight:600;">Day ${d.pod}</td></tr>
      <tr><td style="padding:6px 0; color:#888;">Submitted</td><td style="padding:6px 0;">${ts}</td></tr>
      ${d.patientEmail ? `<tr><td style="padding:6px 0; color:#888;">Patient Email</td><td style="padding:6px 0;"><a href="mailto:${esc(d.patientEmail)}">${esc(d.patientEmail)}</a></td></tr>` : ''}
    </table>

    <div style="text-align:center; margin:20px 0;">
      <div style="display:inline-block; background:${riskBg}; color:#fff; border-radius:10px; padding:16px 28px;">
        <div style="font-size:2rem; font-weight:700;">${d.composite !== null ? d.composite : '—'}<span style="font-size:1rem;">/100</span></div>
        <div style="font-size:0.85rem; margin-top:4px;">${esc(riskLabel)}</div>
      </div>
    </div>

    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      ${scoreBar('Pain', d.scores.pain)}
      ${scoreBar('Wound', d.scores.wound)}
      ${scoreBar('GI', d.scores.gi)}
      ${scoreBar('Mental', d.scores.mental)}
      ${scoreBar('Flags', d.scores.redflags)}
    </table>

    ${triggeredFlags.length > 0 ? `
    <div style="background:#FEE2E2; border:1px solid #FECACA; border-radius:8px; padding:16px; margin:20px 0;">
      <h3 style="color:#DC2626; margin:0 0 8px; font-size:0.95rem;">Red Flags Reported</h3>
      <ul style="margin:0; padding-left:20px; color:#991B1B; font-size:0.9rem; line-height:1.8;">
        ${triggeredFlags.map(f => `<li>${esc(f)}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div style="background:#fff; border:1px solid #e8d9c8; border-radius:8px; padding:20px; margin:20px 0;">
      <h3 style="color:#3b2a1a; margin:0 0 12px; font-size:0.95rem;">Detailed Responses</h3>
      <table style="width:100%; border-collapse:collapse; font-size:0.88rem;">
        <tr style="border-bottom:1px solid #eee;"><td style="padding:6px 0; color:#888;" colspan="2"><strong>Pain</strong></td></tr>
        <tr><td style="padding:4px 0; color:#888; width:160px;">Pain at rest</td><td style="padding:4px 0;">${r.painRest !== null ? r.painRest + '/10' : '—'}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Pain with activity</td><td style="padding:4px 0;">${r.painActivity !== null ? r.painActivity + '/10' : '—'}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Medication helping?</td><td style="padding:4px 0;">${label('painManaged', r.painManaged)}</td></tr>

        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0 6px; color:#888;" colspan="2"><strong>Wound</strong></td></tr>
        <tr><td style="padding:4px 0; color:#888;">Drainage</td><td style="padding:4px 0;">${label('drainage', r.drainage)}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Opening</td><td style="padding:4px 0;">${label('opening', r.opening)}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Redness</td><td style="padding:4px 0;">${label('redness', r.redness)}</td></tr>

        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0 6px; color:#888;" colspan="2"><strong>Stomach / GI</strong></td></tr>
        <tr><td style="padding:4px 0; color:#888;">Nausea</td><td style="padding:4px 0;">${label('nausea', r.nausea)}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Vomiting</td><td style="padding:4px 0;">${label('vomiting', r.vomiting)}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Oral intake</td><td style="padding:4px 0;">${label('intake', r.intake)}</td></tr>

        <tr style="border-bottom:1px solid #eee;"><td style="padding:10px 0 6px; color:#888;" colspan="2"><strong>Emotional</strong></td></tr>
        <tr><td style="padding:4px 0; color:#888;">Anxiety</td><td style="padding:4px 0;">${label('anxiety', r.anxiety)}</td></tr>
        <tr><td style="padding:4px 0; color:#888;">Mood</td><td style="padding:4px 0;">${label('mood', r.mood)}</td></tr>
      </table>
    </div>

    ${d.notes ? `
    <div style="background:#FEF9C3; border:1px solid #FDE68A; border-radius:8px; padding:16px; margin:20px 0;">
      <h3 style="color:#92400E; margin:0 0 6px; font-size:0.9rem;">Patient Notes</h3>
      <p style="margin:0; color:#78350F; font-size:0.9rem; line-height:1.6; white-space:pre-wrap;">${esc(d.notes)}</p>
    </div>` : ''}
  </div>
  <div style="background:#3b2a1a; padding:16px 32px; text-align:center;">
    <p style="color:rgba(232,201,122,0.6); font-size:0.78rem; margin:0;">OpWell Concierge™ · Patient Self-Check-In · (678) 235-5822</p>
  </div>
</div>`;
}

function buildPatientEmail(d) {
  const riskMsg = {
    low: "You're recovering well! Keep following your care plan.",
    moderate: "Recovery is progressing. Dr. Oluwole will review your check-in.",
    high: "Some areas need attention. Dr. Oluwole has been notified and will follow up.",
    critical: "Dr. Oluwole has been alerted and will follow up with you soon."
  };
  const msg = d.risk ? (riskMsg[d.risk.level] || '') : '';
  const riskColor = d.risk ? d.risk.color : '#888';
  const riskLabel = d.risk ? d.risk.label : 'Submitted';

  return `<div style="font-family:Georgia,serif; max-width:600px; margin:0 auto; color:#2c2c2c;">
  <div style="background:#3b2a1a; padding:28px 36px; text-align:center;">
    <h1 style="color:#e8c97a; font-size:1.4rem; margin:0; letter-spacing:0.05em;">OpWell Concierge™</h1>
    <p style="color:rgba(232,201,122,0.7); margin:6px 0 0; font-size:0.82rem; letter-spacing:0.08em;">YOUR RECOVERY CHECK-IN SUMMARY</p>
  </div>
  <div style="background:#fdf8f4; padding:36px;">
    <p style="color:#555; line-height:1.7;">Hi ${esc(d.firstName)},</p>
    <p style="color:#555; line-height:1.7;">Thank you for completing your recovery check-in. Here's a summary of what you reported.</p>

    <div style="text-align:center; margin:24px 0;">
      <div style="display:inline-block; background:${riskColor}; color:#fff; border-radius:10px; padding:14px 24px;">
        <div style="font-size:1.6rem; font-weight:700;">${d.composite !== null ? d.composite : '—'}<span style="font-size:0.9rem;">/100</span></div>
        <div style="font-size:0.82rem; margin-top:2px;">${esc(riskLabel)}</div>
      </div>
    </div>

    <p style="color:#555; line-height:1.7; text-align:center;">${msg}</p>

    ${d.hasRedFlags ? `
    <div style="background:#FEE2E2; border:1px solid #FECACA; border-radius:8px; padding:16px; margin:20px 0;">
      <p style="margin:0; color:#991B1B; font-size:0.9rem; line-height:1.6;"><strong>Important:</strong> You reported some warning signs. Dr. Oluwole will review these as a priority. If your symptoms worsen, call <strong>(678) 235-5822</strong> or call <strong>911</strong> if it's an emergency.</p>
    </div>` : ''}

    <div style="background:#f0f7f2; border:1px solid #b8d9c4; border-radius:8px; padding:20px; margin:24px 0;">
      <h3 style="color:#2d5a3d; margin:0 0 10px; font-size:0.95rem;">Next Steps</h3>
      <ul style="margin:0; padding-left:18px; color:#555; font-size:0.9rem; line-height:2;">
        <li>Dr. Oluwole will review your check-in</li>
        <li>Continue taking medications as prescribed</li>
        <li>Complete your next check-in when scheduled</li>
      </ul>
    </div>

    <p style="color:#555; line-height:1.7;">Questions? Call <strong>(678) 235-5822</strong>.</p>
    <p style="color:#555; line-height:1.7;">Warmly,<br><strong>OpWell Concierge™</strong></p>
  </div>
  <div style="background:#3b2a1a; padding:16px 32px; text-align:center;">
    <p style="color:rgba(232,201,122,0.6); font-size:0.78rem; margin:0;">OpWell Concierge™ · Telehealth · GA, OH & VA · (678) 235-5822</p>
  </div>
</div>`;
}

/* ── Handler ── */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { firstName, lastName, phone, surgeryType, surgeryDate, pod, responses, flags, surgeryFlags, patientEmail, notes, timestamp } = req.body;

    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'Patient name is required' });
    }

    // Server-side scoring (never trust client)
    const { composite, scores, risk } = calculateComposite(responses || {}, flags || [], surgeryFlags || {});

    const patientName = `${firstName} ${lastName}`.trim();
    const hasRedFlags = (flags || []).some(Boolean) || Object.values(surgeryFlags || {}).some(arr => (arr || []).some(Boolean));
    const hasEmergencyFlags = (flags && (flags[8] || flags[9] || flags[10])) ||
      (surgeryFlags && surgeryFlags.bbl && surgeryFlags.bbl[1]) ||
      (surgeryFlags && surgeryFlags.bariatric && surgeryFlags.bariatric[0]);

    // Subject line with urgency
    let subject = `Patient Check-In: ${patientName} — POD ${pod || '?'}`;
    if (hasEmergencyFlags) {
      subject = `⚠️ RED FLAG ALERT: ${patientName} — POD ${pod || '?'} — IMMEDIATE REVIEW`;
    } else if (hasRedFlags) {
      subject = `⚠ PRIORITY: ${patientName} — POD ${pod || '?'} — Red Flags Reported`;
    } else if (risk && (risk.level === 'high' || risk.level === 'critical')) {
      subject = `ATTENTION: ${patientName} — POD ${pod || '?'} — ${risk.label}`;
    }

    // Doctor email (ALWAYS)
    await resend.emails.send({
      from: 'OpWell Recovery <info@opwellconcierge.com>',
      to: 'dr.oluwole@opwellconcierge.com',
      subject,
      html: buildDoctorEmail({ patientName, phone, surgeryType, pod, responses: responses || {}, flags: flags || [], surgeryFlags: surgeryFlags || {}, scores, composite, risk, notes, timestamp, patientEmail, hasRedFlags, hasEmergencyFlags })
    });

    // Patient copy (OPTIONAL)
    if (patientEmail) {
      await resend.emails.send({
        from: 'OpWell Concierge <info@opwellconcierge.com>',
        to: patientEmail,
        subject: 'Your OpWell Recovery Check-In Summary',
        html: buildPatientEmail({ firstName, composite, risk, hasRedFlags })
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Recovery check-in error:', err);
    return res.status(500).json({ error: 'An internal error occurred. Please try again.' });
  }
};
