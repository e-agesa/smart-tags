-- Up
CREATE TABLE payments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id),
    tag_id              UUID REFERENCES tags(id),
    amount_kes          DECIMAL(8,2) NOT NULL,
    mpesa_checkout_id   VARCHAR(100),
    mpesa_receipt       VARCHAR(30),
    phone_used          VARCHAR(15) NOT NULL,
    status              VARCHAR(20) DEFAULT 'pending',
    description         VARCHAR(200),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    completed_at        TIMESTAMPTZ
);

CREATE INDEX idx_payments_user ON payments(user_id);
CREATE INDEX idx_payments_checkout ON payments(mpesa_checkout_id);

-- Down
DROP TABLE IF EXISTS payments;
