-- Update payment column from payment_status to has_paid in students table

-- First, add the new has_paid column
ALTER TABLE students ADD COLUMN has_paid BOOLEAN DEFAULT FALSE;

-- Copy data from payment_status to has_paid
UPDATE students SET has_paid = payment_status WHERE payment_status IS NOT NULL;

-- Drop the old payment_status column
ALTER TABLE students DROP COLUMN payment_status;

-- Add comment for documentation
COMMENT ON COLUMN students.has_paid IS 'Indicates if student has paid the GH₵5.00 registration fee';

-- Create index for efficient queries on has_paid status
CREATE INDEX idx_students_has_paid ON students(has_paid);

-- Optional: Add a check constraint to ensure payment_date is set when has_paid is true
ALTER TABLE students
ADD CONSTRAINT chk_payment_date_has_paid
CHECK (
  (has_paid = FALSE AND payment_date IS NULL) OR
  (has_paid = TRUE AND payment_date IS NOT NULL)
);
