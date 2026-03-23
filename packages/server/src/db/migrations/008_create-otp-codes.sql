-- Up
CREATE TABLE otp_codes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) NOT NULL,
    code        VARCHAR(6) NOT NULL,
    purpose     VARCHAR(20) NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_otp_phone ON otp_codes(phone);

-- Down
DROP TABLE IF EXISTS otp_codes;
