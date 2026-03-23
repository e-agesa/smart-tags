-- Up
CREATE TABLE communications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_session_id UUID NOT NULL REFERENCES scan_sessions(id),
    type            VARCHAR(10) NOT NULL,
    target          VARCHAR(10) NOT NULL,
    at_session_id   VARCHAR(100),
    status          VARCHAR(20),
    duration_secs   INT,
    cost_kes        DECIMAL(8,2),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comms_session ON communications(scan_session_id);

-- Down
DROP TABLE IF EXISTS communications;
