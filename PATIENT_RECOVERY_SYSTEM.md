# OpWell Patient Recovery Monitoring System

## Phase 1: Complete ✅

### What's Built

**Frontend - Integrated into index.html**
- ✅ Recovery check-in page (`/recovery-checkin` route, live on website)
- ✅ Token-based authentication (reads token from URL query param)
- ✅ 8-step multi-page form:
  1. Welcome/intro
  2. Pain assessment (0-10 sliders)
  3. Wound assessment (drainage, opening, redness)
  4. GI & nausea symptoms
  5. Mental health (anxiety, mood)
  6. QoR-15 recovery metrics (validated 15-question assessment)
  7. Optional notes
  8. Thank you / confirmation
- ✅ Patient dashboard showing:
  - Surgery info (type, date, days since surgery)
  - Check-in history
  - Button to start new check-in

**Backend APIs**
- ✅ `/api/patient-register.js` - Enroll new patient, send first check-in email
- ✅ `/api/patient-checkin.js` - Submit daily check-in responses
- ✅ `/api/patient-history.js` - Retrieve patient's check-in history

**Database**
- ✅ `lib/db.js` - In-memory database with schema:
  - `patient:{id}` - patient records
  - `token:{token}` - token → patient mapping
  - `checkin:{patientId}:{date}` - daily check-ins
  - One per day enforcement
  - Prevents duplicate submissions

**Features**
- ✅ Persistent patient records
- ✅ One check-in per day per patient
- ✅ Email notifications to Dr. Oluwole on each submission
- ✅ Red flag detection for concerning responses
- ✅ Full audit trail (timestamp, check-in ID)

---

## Phase 2: In Progress (Next)

### Patient Enrollment & Automation
- [ ] Integration with clinic/admin dashboard to enroll patients
- [ ] Patient email enrollment confirmation
- [ ] Automated daily reminder emails (Days 1, 3, 7, 14, 21, 28 post-op)
- [ ] Scheduled check-in automation (Vercel Cron)
- [ ] Email link includes patient name for personalization

### Patient Dashboard Enhancements
- [ ] QoR-15 trend chart (line graph over time)
- [ ] Pain trend visualization
- [ ] Wound healing status indicator
- [ ] Red flag timeline
- [ ] Overall recovery score
- [ ] Comparison to baseline QoR-15

### Clinical Features
- [ ] Red flag threshold customization by surgery type
- [ ] Automated alerts to Dr. Oluwole for high-risk responses
- [ ] Patient message to Dr. Oluwole (secure inbox)
- [ ] Dr. Oluwole can mark check-ins as "reviewed"

---

## Phase 3: Admin Dashboard

### For Dr. Oluwole
- [ ] Patient roster view
- [ ] Filter by post-op day, surgery type, risk level
- [ ] Check-in timeline view
- [ ] Patient communication interface
- [ ] Automated reports (weekly summary, flagged patients)
- [ ] Schedule follow-up consultations directly from check-in

### Analytics
- [ ] Recovery trends by surgery type
- [ ] Complication rate tracking
- [ ] Patient satisfaction metrics
- [ ] Time to full recovery by procedure

---

## How It Works (Complete Patient Flow)

### 1. Patient Enrollment
```
Dr. Oluwole or clinic staff:
1. Go to admin dashboard (Phase 3)
2. Enter patient name, email, surgery type, surgery date
3. System generates unique token
4. Patient receives enrollment email with:
   - Welcome message
   - Link to first check-in: /recovery-checkin?token=ABC123
   - What to expect
```

### 2. Daily Check-In
```
Patient:
1. Receives reminder email on POD 1, 3, 7, 14, 21, 28
2. Clicks link in email (token in URL)
3. Automatically authenticated (no login needed)
4. Sees their surgery info, check-in history
5. Completes 8-step form (3 minutes)
6. Submits → responses stored → email sent to Dr. Oluwole
7. Can only submit once per day
```

### 3. Doctor Review
```
Dr. Oluwole:
1. Receives email with check-in summary
2. Can view full history in admin dashboard
3. Identifies concerning trends or red flags
4. Messages patient or schedules consultation
5. Marks check-in as reviewed
```

---

## Technical Details

### Authentication
- Token-based (no username/password)
- One-time use email links (secure)
- Tokens expire after 7 days (customizable)
- No persistent login session needed

### Data Structure
```
Patient Record:
{
  id: "abc123",
  name: "John Smith",
  email: "john@example.com",
  phone: "(555) 123-4567",
  surgeryType: "BBL",
  surgeryDate: "2026-07-01",
  token: "64-char-hex",
  createdAt: "2026-07-01T10:00:00Z",
  lastCheckIn: "2026-07-02T14:30:00Z"
}

Check-In Record:
{
  id: "checkin-123",
  patientId: "abc123",
  date: "2026-07-02",
  timestamp: "2026-07-02T14:30:00Z",
  responses: {
    painRest: 3,
    painActivity: 5,
    painManaged: "somewhat",
    drainage: "minimal",
    opening: "closed",
    redness: "none",
    nausea: "no",
    vomiting: "no",
    intake: "good",
    anxiety: 2,
    mood: "neutral"
  },
  qor15: {
    answers: [5, 6, 4, 3, 5, ...],
    total: 142
  },
  riskLevel: null,
  notes: "Feeling good, minimal pain"
}
```

### Email Templates
- **Enrollment**: Welcome + first check-in link
- **Reminder**: POD-specific messaging + check-in link
- **Confirmation**: Thank you email to patient
- **Summary**: Check-in summary email to Dr. Oluwole

### API Endpoints
```
POST /api/patient-register
  → Enroll new patient, send enrollment email
  
POST /api/patient-checkin
  → Submit daily check-in (requires token in body)
  
GET /api/patient-history?token=xyz
  → Retrieve patient's check-in history
```

---

## Files Created

### Frontend
- `index.html` - Added `page-recovery-checkin` section with full form

### Backend
- `api/patient-register.js` - Patient enrollment endpoint
- `api/patient-checkin.js` - Check-in submission endpoint
- `api/patient-history.js` - History retrieval endpoint
- `lib/db.js` - Database utilities

### Testing
- `test-patient-flow.sh` - Integration test script

---

## Next Steps (Phase 2)

1. Set up email reminder scheduler (Vercel Cron)
2. Add QoR-15 trend chart to dashboard
3. Implement red flag detection by surgery type
4. Create admin patient enrollment interface
5. Add Dr. Oluwole's review workflow

---

## Notes

**Phase 1 Scope**: Basic functionality for patients to submit daily check-ins and have data stored.

**Production Readiness**: 
- ✅ APIs ready for testing
- ✅ Form integrated into live website
- ❌ Needs Vercel KV for persistent production storage
- ❌ Needs automated scheduling (Vercel Cron)
- ❌ Needs admin interface for patient management

**Storage**: Currently uses in-memory database (works during development). Phase 2 will migrate to Vercel KV for persistent storage across deployments.
