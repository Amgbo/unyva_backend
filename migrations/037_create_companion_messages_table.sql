CREATE TABLE companion_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id  UUID NOT NULL
                REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id   VARCHAR(50) NOT NULL
                REFERENCES students(student_id),
  receiver_id VARCHAR(50) NOT NULL
                REFERENCES students(student_id),
  content     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cmsg_booking  ON companion_messages(booking_id);
CREATE INDEX idx_cmsg_sender   ON companion_messages(sender_id);
CREATE INDEX idx_cmsg_receiver ON companion_messages(receiver_id);

