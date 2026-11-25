-- Link a direct message to the found item it was sent about, so the chat can
-- show the item card (like product chats do). Nullable: most DMs have no item.
ALTER TABLE companion_messages
    ADD COLUMN IF NOT EXISTS found_item_id INTEGER REFERENCES found_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companion_messages_found_item_id
    ON companion_messages(found_item_id)
    WHERE found_item_id IS NOT NULL;
