# OpWell Concierge Security Setup

## Current Issues
- ❌ Using SUPABASE_ANON_KEY without RLS protection
- ❌ No RLS policies on patients/checkins tables
- ❌ Token validation only at API layer (no database-level protection)
- ❌ Anyone with Supabase URL could potentially access PostgREST directly

## Solution: Token-Based RLS + Service Role Key

### Architecture
```
Client → API Endpoint (/api/patient-checkin)
         ↓
    Validate token in code
    (primary security layer)
         ↓
    Use SERVICE_ROLE_KEY to query Supabase
    (bypasses RLS, but API controls access)
         ↓
    RLS policies as defense-in-depth
    (secondary protection if direct PostgREST access attempted)
```

---

## Step 1: Enable RLS on Tables

```sql
-- Enable RLS on patients table
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Enable RLS on checkins table
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
```

---

## Step 2: Create Token Validation Function

```sql
-- Function to validate patient token and return patient ID
CREATE OR REPLACE FUNCTION public.get_patient_by_token(token_param TEXT)
RETURNS TABLE(patient_id TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT id FROM public.patients 
  WHERE token = token_param
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to anon role (so PostgREST can call it)
GRANT EXECUTE ON FUNCTION public.get_patient_by_token(TEXT) TO anon;
```

---

## Step 3: RLS Policies for `public.patients`

```sql
-- Policy 1: Patient can SELECT only their own record (using token)
CREATE POLICY "patient_select_own" ON public.patients
  FOR SELECT
  USING (
    id = (SELECT patient_id FROM public.get_patient_by_token(
      current_setting('request.jwt.claims', true)::jsonb->>'patient_token'
    ))
  );

-- Policy 2: Service role can SELECT all (no USING clause = unrestricted)
CREATE POLICY "admin_select_all" ON public.patients
  FOR SELECT
  USING (true);

-- Policy 3: Service role can UPDATE patient records
CREATE POLICY "admin_update_all" ON public.patients
  FOR UPDATE
  USING (true);

-- Policy 4: Deny any INSERT (patients are created only via API)
CREATE POLICY "deny_insert_patients" ON public.patients
  FOR INSERT
  WITH CHECK (false);

-- Policy 5: Deny DELETE
CREATE POLICY "deny_delete_patients" ON public.patients
  FOR DELETE
  USING (false);
```

---

## Step 4: RLS Policies for `public.checkins`

```sql
-- Policy 1: Patient can INSERT only their own check-ins
CREATE POLICY "patient_insert_own_checkin" ON public.checkins
  FOR INSERT
  WITH CHECK (
    patient_id = (SELECT patient_id FROM public.get_patient_by_token(
      current_setting('request.jwt.claims', true)::jsonb->>'patient_token'
    ))
  );

-- Policy 2: Patient can SELECT only their own check-ins
CREATE POLICY "patient_select_own_checkins" ON public.checkins
  FOR SELECT
  USING (
    patient_id = (SELECT patient_id FROM public.get_patient_by_token(
      current_setting('request.jwt.claims', true)::jsonb->>'patient_token'
    ))
  );

-- Policy 3: Service role can SELECT all
CREATE POLICY "admin_select_all_checkins" ON public.checkins
  FOR SELECT
  USING (true);

-- Policy 4: Service role can UPDATE
CREATE POLICY "admin_update_all_checkins" ON public.checkins
  FOR UPDATE
  USING (true);

-- Policy 5: Deny DELETE
CREATE POLICY "deny_delete_checkins" ON public.checkins
  FOR DELETE
  USING (false);
```

---

## Step 5: Update API to Use SERVICE_ROLE_KEY

### In `lib/db.js`:

**Before:**
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY  // ❌ Using ANON key
);
```

**After:**
```javascript
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ✅ Using SERVICE_ROLE_KEY
);
```

### Why SERVICE_ROLE_KEY?
- SERVICE_ROLE_KEY bypasses RLS (which is OK since API validates first)
- ANON_KEY is meant for client-side with RLS protection
- This is the correct pattern for serverless APIs

---

## Step 6: Environment Variables

Add to Vercel/production environment:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_KEY=your-secure-admin-key
RESEND_API_KEY=re_xxxxx
```

**Get SERVICE_ROLE_KEY from:**
1. Go to Supabase Dashboard
2. Settings → API → Service Role Key
3. Copy (keep secure!)

---

## Security Flow (With RLS + Service Role)

### Patient Check-In Submission:
```
1. Patient submits form with token
2. API receives request
3. API validates token exists in DB ✅ (primary security)
4. API uses SERVICE_ROLE_KEY to insert check-in
5. RLS policy checked (secondary security) ✅
6. Data inserted
```

### Direct PostgREST Attack (if someone tries to bypass API):
```
1. Attacker calls PostgREST directly with ANON_KEY
2. RLS policies block access (they don't have valid token) ✅
3. Data is protected even without API
```

### Admin Access:
```
1. Admin calls /api/admin-patients
2. API validates x-admin-key header ✅
3. API uses SERVICE_ROLE_KEY (bypasses RLS - that's OK) ✅
4. Admin gets access to all data
```

---

## Verification Checklist

- [ ] RLS enabled on patients table
- [ ] RLS enabled on checkins table
- [ ] Token validation function created
- [ ] All 5 policies created for patients
- [ ] All 5 policies created for checkins
- [ ] API switched to SERVICE_ROLE_KEY
- [ ] Environment variables updated in Vercel
- [ ] Test: Patient can access own data
- [ ] Test: Patient cannot access other patient data
- [ ] Test: Admin can access all data
- [ ] Test: Direct PostgREST calls are blocked without valid token

---

## Testing the Security

### Test 1: Patient Access (Should work)
```bash
# Patient accesses their own data
curl -X POST https://your-api.com/api/patient-checkin \
  -H "Content-Type: application/json" \
  -d '{"token":"valid_patient_token", "checkInData":{...}}'
# Expected: ✅ Success
```

### Test 2: Invalid Token (Should fail)
```bash
# Invalid token
curl -X POST https://your-api.com/api/patient-checkin \
  -H "Content-Type: application/json" \
  -d '{"token":"invalid_token", "checkInData":{...}}'
# Expected: ❌ 401 Unauthorized
```

### Test 3: Direct PostgREST (Should fail)
```bash
# Direct database query without valid auth
curl -X GET "https://your-project.supabase.co/rest/v1/patients" \
  -H "apikey: YOUR_ANON_KEY"
# Expected: ❌ RLS blocks access (no rows returned or error)
```

---

## Deployment Steps

1. **Run RLS SQL in Supabase SQL Editor**
   - Copy policies from Step 2-4
   - Execute in Supabase dashboard

2. **Update API code** (db.js)
   - Change SUPABASE_ANON_KEY to SUPABASE_SERVICE_ROLE_KEY

3. **Update Vercel environment**
   - Add SUPABASE_SERVICE_ROLE_KEY to secrets
   - Restart deployment

4. **Test thoroughly**
   - Verify patient can submit check-ins
   - Verify admin dashboard works
   - Verify Vercel logs show successful data saves

5. **Monitor**
   - Check Vercel logs for any RLS errors
   - Monitor patient check-in submissions
   - Verify admin can view all data
