-- Up
CREATE TABLE tags (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id      UUID NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
    tag_code        VARCHAR(12) NOT NULL UNIQUE,
    qr_data_url     TEXT,
    status          VARCHAR(20) DEFAULT 'pending',
    activated_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_code ON tags(tag_code);

-- Down
DROP TABLE IF EXISTS tags;
