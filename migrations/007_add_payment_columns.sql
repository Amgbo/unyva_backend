-- Migration to add has_paid and payment_date columns to students table
-- This fixes the "column has_paid does not exist" error

-- Add has_paid column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'students'
                   AND column_name = 'has_paid') THEN
        ALTER TABLE students ADD COLUMN has_paid BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added has_paid column to students table';
    ELSE
        RAISE NOTICE 'has_paid column already exists';
    END IF;
END $$;

-- Add payment_date column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'students'
                   AND column_name = 'payment_date') THEN
        ALTER TABLE students ADD COLUMN payment_date TIMESTAMP NULL;
        RAISE NOTICE 'Added payment_date column to students table';
    ELSE
        RAISE NOTICE 'payment_date column already exists';
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN students.has_paid IS 'Indicates if student has paid the GH₵5.00 registration fee';
COMMENT ON COLUMN students.payment_date IS 'Timestamp when payment was completed';

-- Create index for efficient queries on payment status if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE tablename = 'students'
                   AND indexname = 'idx_students_has_paid') THEN
        CREATE INDEX idx_students_has_paid ON students(has_paid);
        RAISE NOTICE 'Created index idx_students_has_paid';
    ELSE
        RAISE NOTICE 'Index idx_students_has_paid already exists';
    END IF;
END $$;

-- Add check constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints
                   WHERE constraint_name = 'chk_payment_date_has_paid') THEN
        ALTER TABLE students
        ADD CONSTRAINT chk_payment_date_has_paid
        CHECK (
            (has_paid = FALSE AND payment_date IS NULL) OR
            (has_paid = TRUE AND payment_date IS NOT NULL)
        );
        RAISE NOTICE 'Added check constraint chk_payment_date_has_paid';
    ELSE
        RAISE NOTICE 'Check constraint chk_payment_date_has_paid already exists';
    END IF;
END $$;
