-- Create delete_account_requests table
CREATE TABLE IF NOT EXISTS delete_account_requests (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  student_id_or_email VARCHAR(255) NOT NULL,
  deletion_message TEXT NOT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_delete_account_requests_status ON delete_account_requests(status);

-- Create index on submitted_at for ordering
CREATE INDEX IF NOT EXISTS idx_delete_account_requests_submitted_at ON delete_account_requests(submitted_at DESC);
