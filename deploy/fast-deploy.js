const { Client } = require("ssh2");

const conn = new Client();

const FULL_SCRIPT = `
set -e
echo "=== [1/8] Installing Node.js 20 ==="
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt install -y nodejs
fi
echo "Node: $(node --version)"

echo "=== [2/8] Installing PM2 ==="
npm install -g pm2 2>/dev/null

echo "=== [3/8] Setting up PostgreSQL ==="
systemctl enable postgresql && systemctl start postgresql
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='carparktag'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE carparktag;"
sudo -u postgres psql -d carparktag -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;" 2>/dev/null

echo "=== [4/8] Cloning repo ==="
mkdir -p /var/www/smart-tags /var/log/smart-tags
cd /var/www/smart-tags
if [ -d .git ]; then
  git pull origin main
else
  git clone https://github.com/e-agesa/smart-tags.git .
fi

echo "=== [5/8] Installing deps & building ==="
npm ci
npm run build

echo "=== [6/8] Creating .env ==="
if [ ! -f .env ]; then
  JWT_SEC=$(openssl rand -hex 32)
  JWT_ADM=$(openssl rand -hex 32)
  cat > .env << ENVFILE
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carparktag
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SEC
JWT_ADMIN_SECRET=$JWT_ADM
BASE_URL=http://147.79.101.189
FRONTEND_URL=http://147.79.101.189
FROM_EMAIL=noreply@smarttags.co.ke
ENVFILE
fi

echo "=== [7/8] Seeding database ==="
sudo -u postgres psql -d carparktag -f packages/server/src/db/seed.sql 2>/dev/null || echo "seed skipped"

echo "=== [8/8] Starting app + Nginx ==="
pm2 delete smart-tags 2>/dev/null || true
pm2 start ecosystem.config.js --env production
pm2 save

cat > /etc/nginx/sites-available/smart-tags << 'NGINXCONF'
server {
    listen 80;
    server_name _;
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
NGINXCONF

ln -sf /etc/nginx/sites-available/smart-tags /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=============================="
echo "DEPLOY COMPLETE!"
echo "Visit: http://147.79.101.189"
echo "=============================="
`;

conn.on("ready", () => {
  console.log("SSH Connected. Running deploy...");
  conn.exec(FULL_SCRIPT, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", (code) => {
      console.log("\nExit code:", code);
      conn.end();
    });
  });
});

conn.on("error", (err) => console.error("SSH Error:", err.message));

conn.connect({
  host: "147.79.101.189",
  port: 22,
  username: "root",
  password: "MtVmTbHm@-L1,Yd&",
  readyTimeout: 30000,
});
