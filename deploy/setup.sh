#!/bin/bash
# ============================================
# Smart Tags — Hostinger VPS Setup Script
# Run this on your Hostinger VPS after SSH in
# ============================================

set -e

DOMAIN="yourdomain.com"  # <-- CHANGE THIS
APP_DIR="/var/www/smart-tags"
DB_NAME="carparktag"
DB_USER="smarttags"
DB_PASS="$(openssl rand -hex 16)"
JWT_SECRET="$(openssl rand -hex 32)"
JWT_ADMIN_SECRET="$(openssl rand -hex 32)"

echo "=============================="
echo " Smart Tags — Server Setup"
echo "=============================="

# 1. System update
echo "[1/10] Updating system..."
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20
echo "[2/10] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 3. Install PostgreSQL
echo "[3/10] Installing PostgreSQL..."
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 4. Create database & user
echo "[4/10] Setting up database..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# 5. Install Nginx
echo "[5/10] Installing Nginx..."
sudo apt install -y nginx
sudo systemctl enable nginx

# 6. Install PM2
echo "[6/10] Installing PM2..."
sudo npm install -g pm2

# 7. Clone and build app
echo "[7/10] Cloning and building app..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR
cd $APP_DIR

if [ -d ".git" ]; then
  git pull origin main
else
  git clone https://github.com/twinfusion-ke/smart-tags.git .
fi

npm ci
npm run build

# 8. Create .env
echo "[8/10] Creating .env..."
cat > .env << EOF
DATABASE_URL=postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SECRET
JWT_ADMIN_SECRET=$JWT_ADMIN_SECRET
BASE_URL=https://$DOMAIN
FRONTEND_URL=https://$DOMAIN
SENDGRID_API_KEY=
FROM_EMAIL=noreply@$DOMAIN
EOF

# 9. Run migrations
echo "[9/10] Running database setup..."
PGPASSWORD=$DB_PASS psql -U $DB_USER -h localhost -d $DB_NAME -f packages/server/src/db/seed.sql 2>/dev/null || true

# Run migrations manually
PGPASSWORD=$DB_PASS psql -U $DB_USER -h localhost -d $DB_NAME << 'MIGRATE'
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Tables will be created by the migration files
MIGRATE

# 10. Setup Nginx
echo "[10/10] Configuring Nginx..."
sudo tee /etc/nginx/sites-available/smart-tags > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    client_max_body_size 10M;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/smart-tags /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# Create log directory
sudo mkdir -p /var/log/smart-tags
sudo chown $USER:$USER /var/log/smart-tags

# Start with PM2
cd $APP_DIR
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo ""
echo "=============================="
echo " SETUP COMPLETE!"
echo "=============================="
echo ""
echo " App:      http://$DOMAIN"
echo " Database: $DB_NAME"
echo " DB User:  $DB_USER"
echo " DB Pass:  $DB_PASS"
echo ""
echo " SAVE THESE CREDENTIALS!"
echo ""
echo " Next steps:"
echo "   1. Point your domain DNS to this server's IP"
echo "   2. Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo "   3. Login to admin: https://$DOMAIN/admin/login"
echo "      Email: admin@smarttags.co.ke"
echo "      Password: admin123 (CHANGE THIS!)"
echo ""
