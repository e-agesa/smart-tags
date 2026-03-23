-- Up
CREATE TABLE vehicles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate   VARCHAR(20) NOT NULL UNIQUE,
    make            VARCHAR(50),
    color           VARCHAR(30),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_user ON vehicles(user_id);
CREATE INDEX idx_vehicles_plate ON vehicles(license_plate);

-- Down
DROP TABLE IF EXISTS vehicles;
