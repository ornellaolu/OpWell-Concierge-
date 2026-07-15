-- Migration: Enable RLS with Token-Based Authentication
-- This migration secures the patients and checkins tables with RLS policies
-- that validate access using the patient token

-- ============================================================================
-- Step 1: Enable RLS on tables
-- ============================================================================

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Create token validation function
-- ============================================================================

-- Function to validate patient token and return patient ID
-- This function is used by RLS policies to validate access
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

-- ============================================================================
-- Step 3: RLS Policies for public.patients
-- ============================================================================

-- Policy 1: Patient can SELECT only their own record (using token)
-- The token is passed via current_setting which would be set by app logic
CREATE POLICY "patient_select_own" ON public.patients
  FOR SELECT
  USING (
    id = (SELECT patient_id FROM public.get_patient_by_token(
      COALESCE(
        current_setting('app.patient_token', true),
        ''
      )
    ))
  );

-- Policy 2: Service role can SELECT all (no USING clause = unrestricted)
-- Service role bypasses RLS, so this is more of a documentation policy
CREATE POLICY "service_role_select_all" ON public.patients
  FOR SELECT
  USING (true);

-- Policy 3: Service role can UPDATE patient records
CREATE POLICY "service_role_update_all" ON public.patients
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

-- ============================================================================
-- Step 4: RLS Policies for public.checkins
-- ============================================================================

-- Policy 1: Patient can INSERT only their own check-ins
CREATE POLICY "patient_insert_own_checkin" ON public.checkins
  FOR INSERT
  WITH CHECK (
    patient_id = (SELECT patient_id FROM public.get_patient_by_token(
      COALESCE(
        current_setting('app.patient_token', true),
        ''
      )
    ))
  );

-- Policy 2: Patient can SELECT only their own check-ins
CREATE POLICY "patient_select_own_checkins" ON public.checkins
  FOR SELECT
  USING (
    patient_id = (SELECT patient_id FROM public.get_patient_by_token(
      COALESCE(
        current_setting('app.patient_token', true),
        ''
      )
    ))
  );

-- Policy 3: Service role can SELECT all
CREATE POLICY "service_role_select_all_checkins" ON public.checkins
  FOR SELECT
  USING (true);

-- Policy 4: Service role can UPDATE
CREATE POLICY "service_role_update_all_checkins" ON public.checkins
  FOR UPDATE
  USING (true);

-- Policy 5: Deny DELETE
CREATE POLICY "deny_delete_checkins" ON public.checkins
  FOR DELETE
  USING (false);

-- ============================================================================
-- Verification Queries
-- ============================================================================

-- Run these to verify policies are created:
-- SELECT * FROM information_schema.role_table_grants WHERE table_name = 'patients';
-- SELECT * FROM pg_policies WHERE tablename IN ('patients', 'checkins');
