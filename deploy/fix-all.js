const { Client } = require("ssh2");
const fs = require("fs");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    # Fix pg_hba.conf for password auth
    PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | tr -d ' ')
    cp "$PG_HBA" "$PG_HBA.bak"
    cat > "$PG_HBA" << 'PGHBA'
local   all             postgres                                peer
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
local   replication     all                                     peer
host    replication     all             127.0.0.1/32            scram-sha-256
host    replication     all             ::1/128                 scram-sha-256
PGHBA
    systemctl reload postgresql
    echo "PG auth fixed"

    # Create all tables using peer auth (as postgres user)
    cd /var/www/smart-tags
    sudo -u postgres psql -d carparktag << 'SQL'
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(15),
    email VARCHAR(255) UNIQUE,
    phone_verified BOOLEAN DEFAULT FALSE,
    emergency_phone VARCHAR(15),
    emergency_name VARCHAR(150),
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(20),
    oauth_id VARCHAR(255),
    avatar_url TEXT,
    lang_pref VARCHAR(2) DEFAULT 'en',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_plate VARCHAR(20) NOT NULL,
    make VARCHAR(50),
    color VARCHAR(30),
    item_type VARCHAR(20) DEFAULT 'car',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    tag_code VARCHAR(12) NOT NULL UNIQUE,
    qr_data_url TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    is_paused BOOLEAN DEFAULT FALSE,
    custom_message TEXT,
    activated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scan_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES tags(id),
    scanner_ip INET,
    scanner_phone VARCHAR(15),
    source VARCHAR(10) NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    user_agent TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_session_id UUID NOT NULL REFERENCES scan_sessions(id),
    type VARCHAR(10) NOT NULL,
    target VARCHAR(10) NOT NULL,
    at_session_id VARCHAR(100),
    status VARCHAR(20),
    duration_secs INT,
    cost_kes DECIMAL(8,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tag_id UUID REFERENCES tags(id),
    amount_kes DECIMAL(8,2) NOT NULL,
    mpesa_checkout_id VARCHAR(100),
    mpesa_receipt VARCHAR(30),
    phone_used VARCHAR(15) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    description VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'viewer',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(15) NOT NULL,
    code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tag_id UUID NOT NULL REFERENCES tags(id),
    finder_token VARCHAR(64) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_role VARCHAR(10) NOT NULL,
    body TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(30) NOT NULL UNIQUE,
    price_kes DECIMAL(10,2) NOT NULL DEFAULT 0,
    price_usd DECIMAL(10,2) NOT NULL DEFAULT 0,
    interval_months INT NOT NULL DEFAULT 12,
    max_tags INT NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    payment_ref VARCHAR(100),
    auto_renew BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sticker_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    qty INT NOT NULL DEFAULT 1,
    design VARCHAR(30) DEFAULT 'standard',
    unit_price_kes DECIMAL(8,2) NOT NULL,
    total_kes DECIMAL(10,2) NOT NULL,
    shipping_name VARCHAR(150),
    shipping_phone VARCHAR(15),
    shipping_address TEXT,
    shipping_city VARCHAR(50),
    status VARCHAR(20) DEFAULT 'pending',
    tracking_no VARCHAR(50),
    mpesa_receipt VARCHAR(30),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS qr_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES admin_users(id),
    qty INT NOT NULL,
    format VARCHAR(10) DEFAULT 'svg',
    resolution INT DEFAULT 300,
    file_url TEXT,
    status VARCHAR(20) DEFAULT 'generating',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_gateways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(30) NOT NULL UNIQUE,
    is_enabled BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL DEFAULT '{}',
    supported_currencies TEXT[] DEFAULT ARRAY['KES'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(30) NOT NULL UNIQUE,
    description TEXT,
    discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',
    discount_value DECIMAL(10,2) NOT NULL,
    max_uses INT DEFAULT NULL,
    used_count INT DEFAULT 0,
    min_amount_kes DECIMAL(10,2) DEFAULT 0,
    applies_to VARCHAR(20) DEFAULT 'all',
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS promo_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_id UUID NOT NULL REFERENCES promo_codes(id),
    user_id UUID NOT NULL REFERENCES users(id),
    order_type VARCHAR(20) NOT NULL,
    order_id UUID,
    discount_kes DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    banner_url TEXT,
    offer_type VARCHAR(20) DEFAULT 'discount',
    discount_percent INT DEFAULT 0,
    applies_to VARCHAR(20) DEFAULT 'all',
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
SQL
    echo "Tables created"

    # Now seed with password auth
    sudo -u postgres psql -d carparktag -f /var/www/smart-tags/packages/server/src/db/seed.sql
    echo "Seed done"

    # Update .env with domain
    cd /var/www/smart-tags
    sed -i 's|BASE_URL=.*|BASE_URL=http://tf.letstag.me|' .env
    sed -i 's|FRONTEND_URL=.*|FRONTEND_URL=http://tf.letstag.me|' .env
    cat .env
    echo "---"

    # Update nginx for domain
    cat > /etc/nginx/sites-available/smart-tags << 'NGCONF'
server {
    listen 80;
    server_name tf.letstag.me 147.79.101.189;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    client_max_body_size 10M;
}
NGCONF
    nginx -t && systemctl reload nginx
    echo "Nginx updated"

    # Restart app
    pm2 restart smart-tags
    sleep 3

    # Final test
    echo "=== TESTING ==="
    curl -s --connect-timeout 5 http://localhost:3000/health
    echo ""
    curl -s --connect-timeout 5 http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"phone":"0712345678","password":"test1234"}'
    echo ""
    echo "=== ALL DONE ==="
  `;
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => conn.end());
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
