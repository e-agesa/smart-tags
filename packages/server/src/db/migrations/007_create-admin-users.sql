-- Up
CREATE TABLE admin_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(20) DEFAULT 'viewer',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Down
DROP TABLE IF EXISTS admin_users;
