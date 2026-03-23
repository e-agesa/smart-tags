-- Up
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(15) NOT NULL UNIQUE,
    phone_verified  BOOLEAN DEFAULT FALSE,
    emergency_phone VARCHAR(15),
    emergency_name  VARCHAR(150),
    password_hash   VARCHAR(255) NOT NULL,
    lang_pref       VARCHAR(2) DEFAULT 'en',
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users(phone);

-- Down
DROP TABLE IF EXISTS users;
