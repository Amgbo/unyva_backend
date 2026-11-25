-- Migration 046: In-app messaging for services.
--
-- Each conversation is between ONE customer and the service's provider about
-- ONE service, identified by (service_id, customer_id). Keying by customer keeps
-- every customer's conversation private from other customers of the same service.
--
-- Safe to run multiple times.

BEGIN;

CREATE TABLE IF NOT EXISTS service_messages (
    id          SERIAL PRIMARY KEY,
    service_id  INTEGER     NOT NULL REFERENCES services(id) ON DELETE CASCADE,
    -- The customer side of the conversation (never the provider).
    customer_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    sender_id   VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    receiver_id VARCHAR(20) NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    message     TEXT        NOT NULL,
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),

    CONSTRAINT service_messages_not_empty CHECK (length(trim(message)) > 0),
    CONSTRAINT service_messages_max_length CHECK (length(message) <= 2000),
    CONSTRAINT service_messages_not_self CHECK (sender_id <> receiver_id),
    -- The customer is always one of the two participants.
    CONSTRAINT service_messages_customer_participant
      CHECK (customer_id = sender_id OR customer_id = receiver_id)
);

-- Load a single conversation in order.
CREATE INDEX IF NOT EXISTS idx_service_messages_thread
  ON service_messages (service_id, customer_id, created_at);

-- Inbox: conversations a user sent or received messages in.
CREATE INDEX IF NOT EXISTS idx_service_messages_sender
  ON service_messages (sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_messages_receiver
  ON service_messages (receiver_id, created_at DESC);

-- Unread counts.
CREATE INDEX IF NOT EXISTS idx_service_messages_unread
  ON service_messages (receiver_id, service_id, customer_id)
  WHERE is_read = FALSE;

COMMIT;
