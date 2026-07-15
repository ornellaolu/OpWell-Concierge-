# Security Implementation - Step by Step

## Overview
This document provides exact steps to implement token-based RLS policies for the patients and checkins tables, using SERVICE_ROLE_KEY in the API layer.

---

## Phase 1: Environment Setup (5 minutes)

### Step 1.1: Get SERVICE_ROLE_KEY from Supabase
1. Go to https://app.supabase.com
2. Select your OpWell project
3. Navigate to **Settings** → **API**
4. Copy the **Service Role Key** (under "service_role secret")
   - This starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### Step 1.2: Add to Vercel Environment
1. Go to https://vercel.com/ornellaolu/opwell-concierge
2. Go to **Settings** → **Environment Variables**
3. Add new variable:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: Paste the key from Step 1.1
   - Environments: Production, Preview, Development
4. Click **Save & Deploy**
5. Wait for deployment to complete

---

## Phase 2: Database Setup (10 minutes)

### Step 2.1: Run RLS SQL in Supabase
1. Go to https://app.supabase.com → Your Project
2. Click **SQL Editor** (left sidebar)
3. Click **New Query** (or paste into existing)
4. Copy the entire content from: `/migrations/001_enable_rls_with_token_auth.sql`
5. Paste into the SQL editor
6. Click **Run**
7. Wait for completion (should see green checkmark)

**What this does:**
- ✅ Enables RLS on patients table
- ✅ Enables RLS on checkins table
- ✅ Creates token validation function
- ✅ Creates 5 policies for patients table
- ✅ Creates 5 policies for checkins table

### Step 2.2: Verify Policies Created
Run this verification query in Supabase SQL Editor:

```sql
SELECT schemaname, tablename, policyname, permissive, qual
FROM pg_policies
WHERE tablename IN ('patients', 'checkins')
ORDER BY tablename, policyname;
```

Expected output: 10 rows (5 policies per table)

---

## Phase 3: API Code Update (2 minutes)

### Step 3.1: Update lib/db.js
File: `/lib/db.js`

The file already has the updated code, but verify it looks like:

```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);
```

✅ Code is already updated!

---

## Phase 4: Testing (10 minutes)

### Test 4.1: Patient Check-In (Should Work)
1. Open https://www.opwellconcierge.com/recovery-checkin?token=TEST_TOKEN
   - Replace `TEST_TOKEN` with an actual token from database
2. Fill out the form completely
3. Click "Send to Dr. Oluwole"
4. Expected: "Check-in sent!" message appears ✅

**To get a TEST_TOKEN:**
1. Go to Supabase dashboard
2. Click **Table Editor**
3. Select **patients** table
4. Copy any `token` value from a patient record

### Test 4.2: Check Vercel Logs
1. Go to https://vercel.com/ornellaolu/opwell-concierge
2. Click **Deployments** → Recent deployment
3. Click **Logs** (or Functions tab)
4. Look for logs from `/api/patient-checkin`
5. Should see: "✅ Check-in saved successfully"

### Test 4.3: Verify Data in Database
1. Go to Supabase dashboard
2. Click **Table Editor** → **checkins**
3. Should see new check-in row with:
   - `patient_id`: matches the token's patient
   - `qor15_score`: the score from form
   - `date`: today's date

### Test 4.4: Admin Dashboard (Should Still Work)
1. Open https://www.opwellconcierge.com (homepage)
2. Navigate to admin dashboard
3. Should see all patients and their check-ins
4. Expected: All data loads normally ✅

### Test 4.5: Invalid Token (Should Fail)
1. Open https://www.opwellconcierge.com/recovery-checkin?token=INVALID_TOKEN
2. Fill out form completely
3. Click "Send to Dr. Oluwole"
4. Expected: Error message appears ✅
5. Check Vercel logs: Should show "Invalid or expired token"

---

## Phase 5: Security Verification (5 minutes)

### Verify 5.1: RLS is Active
1. Supabase dashboard → **Table Editor**
2. Select **patients** table
3. Look for **🔒 RLS enabled** badge next to table name
4. Should show: **🔒 RLS enabled**

### Verify 5.2: Policies Exist
1. Supabase dashboard → **Authentication** → **Policies**
2. Or run SQL query from Step 2.2
3. Should see:
   - 5 policies for `patients` table
   - 5 policies for `checkins` table

### Verify 5.3: API Uses SERVICE_ROLE_KEY
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel
2. Check that code uses it (already done)
3. Verify no hardcoded keys in code ✅

---

## Troubleshooting

### Problem: "Permission denied" errors in logs
**Cause:** RLS policies blocking access
**Solution:**
1. Verify SERVICE_ROLE_KEY is set correctly in Vercel
2. Verify RLS policies were created successfully
3. Check that the patient token exists in database

### Problem: Patient can't submit check-in after RLS enabled
**Cause:** API is still using ANON_KEY instead of SERVICE_ROLE_KEY
**Solution:**
1. Verify SUPABASE_SERVICE_ROLE_KEY is in Vercel environment
2. Verify code uses it: `process.env.SUPABASE_SERVICE_ROLE_KEY`
3. Redeploy after environment change

### Problem: "Invalid or expired token" error
**Cause:** Token doesn't exist in database
**Solution:**
1. Verify you're using a real token from a patient record
2. Check token matches exactly (case-sensitive)
3. Make sure patient record exists in database

### Problem: Admin dashboard shows no data after RLS
**Cause:** Admin API still using ANON_KEY without proper auth
**Solution:**
1. Admin APIs already use `x-admin-key` header validation
2. Admin code should work once SERVICE_ROLE_KEY is set
3. Verify deployment completed successfully

---

## Rollback Plan (If Needed)

If something breaks, you can temporarily disable RLS:

```sql
-- Disable RLS on tables (emergency only)
ALTER TABLE public.patients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins DISABLE ROW LEVEL SECURITY;
```

But then you'd be back to the insecure state. Better to debug the policies.

---

## Monitoring

After deployment, monitor these logs:

**In Vercel:**
- Look for `patient-checkin` API calls
- Check for "token not found" errors
- Monitor error rates

**In Supabase:**
- Go to **Settings** → **Logs** → **API logs**
- Search for 401/403 errors (RLS blocking)
- Monitor query performance

---

## Next Steps After Implementation

1. ✅ Run Phase 1-5 above
2. ✅ Test all scenarios
3. ✅ Monitor logs for 24 hours
4. ✅ Consider adding more advanced policies later:
   - Time-based policies (patients can only edit today's check-in)
   - Role-based policies (if you add staff/nurse roles)
   - Audit logging policies

---

## Summary

| Component | Before | After |
|-----------|--------|-------|
| Database Key | ANON_KEY (public) | SERVICE_ROLE_KEY (secure) |
| RLS Enabled | ❌ No | ✅ Yes |
| Token Validation | API only | API + RLS |
| Security Level | ⚠️ Medium | ✅ High |
| Defense-in-depth | ❌ No | ✅ Yes |

You're now secure! 🔐
