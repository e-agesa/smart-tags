-- Up
CREATE TABLE scan_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id          UUID NOT NULL REFERENCES tags(id),
    scanner_ip      INET,
    scanner_phone   VARCHAR(15),
    source          VARCHAR(10) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scans_tag ON scan_sessions(tag_id);
CREATE INDEX idx_scans_created ON scan_sessions(created_at);

-- Down
DROP TABLE IF EXISTS scan_sessions;
