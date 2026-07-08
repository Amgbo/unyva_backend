-- Add payment fields to students table for Paystack integration
-- This migration adds has_paid and payment_date columns

ALTER TABLE students
ADD COLUMN has_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN payment_date TIMESTAMP NULL;

-- Add comment for documentation
COMMENT ON COLUMN students.has_paid IS 'Indicates if student has paid the GH₵5.00 login fee';
COMMENT ON COLUMN students.payment_date IS 'Timestamp when payment was completed';

-- Create index for efficient queries on payment status
CREATE INDEX idx_students_has_paid ON students(has_paid);

-- Optional: Add a check constraint to ensure payment_date is set when has_paid is true
ALTER TABLE students
ADD CONSTRAINT chk_payment_date
CHECK (
  (has_paid = FALSE AND payment_date IS NULL) OR
  (has_paid = TRUE AND payment_date IS NOT NULL)
);
