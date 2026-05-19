-- Patient Profile Validation Table
-- Stores validation state for incomplete profile reminders
-- Created: 2026-05-17

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create table
CREATE TABLE IF NOT EXISTS patient_profile_validation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  missing_fields TEXT NOT NULL DEFAULT '[]',
  completion_percentage REAL NOT NULL DEFAULT 0,
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  last_notification_sent TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  updated_by_device TEXT,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_patient_validation_user ON patient_profile_validation(user_id);
CREATE INDEX IF NOT EXISTS idx_patient_validation_complete ON patient_profile_validation(is_complete) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_patient_validation_updated ON patient_profile_validation(updated_at DESC);

-- Row-level security
ALTER TABLE patient_profile_validation ENABLE ROW LEVEL SECURITY;

-- Users can read their own validation records
CREATE POLICY "Users can view own validation"
  ON patient_profile_validation FOR SELECT
  USING (user_id = auth.uid());

-- Users can insert their own validation records
CREATE POLICY "Users can insert own validation"
  ON patient_profile_validation FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own validation records
CREATE POLICY "Users can update own validation"
  ON patient_profile_validation FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own validation records
CREATE POLICY "Users can delete own validation"
  ON patient_profile_validation FOR DELETE
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_patient_validation_timestamp ON patient_profile_validation;
CREATE TRIGGER update_patient_validation_timestamp
  BEFORE UPDATE ON patient_profile_validation
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Add comment
COMMENT ON TABLE patient_profile_validation IS 'Stores validation state for incomplete patient profile reminders';
COMMENT ON COLUMN patient_profile_validation.missing_fields IS 'JSON array of missing field names';
COMMENT ON COLUMN patient_profile_validation.completion_percentage IS '0-100 completion percentage';
COMMENT ON COLUMN patient_profile_validation.is_complete IS 'Whether all required fields are filled';
COMMENT ON COLUMN patient_profile_validation.last_notification_sent IS 'Timestamp of last reminder notification sent';