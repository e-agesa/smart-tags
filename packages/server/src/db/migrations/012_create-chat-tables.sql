-- Up
CREATE TABLE IF NOT EXISTS chat_rooms (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id          UUID NOT NULL REFERENCES tags(id),
    finder_token    VARCHAR(64) NOT NULL UNIQUE,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    closed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chatrooms_tag ON chat_rooms(tag_id);
CREATE INDEX IF NOT EXISTS idx_chatrooms_token ON chat_rooms(finder_token);

CREATE TABLE IF NOT EXISTS chat_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_role     VARCHAR(10) NOT NULL,
    body            TEXT NOT NULL,
    read_at         TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chatmsg_room ON chat_messages(room_id);

-- Down
DROP TABLE IF EXISTS chat_messages;
DROP TABLE IF EXISTS chat_rooms;
