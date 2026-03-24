const { Client } = require("ssh2");

const HOST = "147.79.101.189";
const USER = "root";
const PASS = "MtVmTbHm@-L1,Yd&";

const commands = [
  "echo '=== [1/8] System update ==='",
  "apt update -y && apt install -y curl git nginx postgresql postgresql-contrib",
  "echo '=== [2/8] Installing Node.js 20 ==='",
  "curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs",
  "echo '=== [3/8] Installing PM2 ==='",
  "npm install -g pm2",
  "echo '=== [4/8] Setting up PostgreSQL ==='",
  "systemctl enable postgresql && systemctl start postgresql",
  "sudo -u postgres psql -c \"SELECT 1 FROM pg_database WHERE datname='carparktag'\" | grep -q 1 || sudo -u postgres psql -c \"CREATE DATABASE carparktag;\"",
  "sudo -u postgres psql -d carparktag -c \"CREATE EXTENSION IF NOT EXISTS pgcrypto;\"",
  "echo '=== [5/8] Cloning and building app ==='",
  "mkdir -p /var/www/smart-tags /var/log/smart-tags",
  "cd /var/www/smart-tags && ([ -d .git ] && git pull origin main || git clone https://github.com/e-agesa/smart-tags.git .)",
  "cd /var/www/smart-tags && npm ci",
  "cd /var/www/smart-tags && npm run build",
  "echo '=== [6/8] Creating .env ==='",
  `cd /var/www/smart-tags && [ -f .env ] || printf "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carparktag\\nPORT=3000\\nNODE_ENV=production\\nJWT_SECRET=$(openssl rand -hex 32)\\nJWT_ADMIN_SECRET=$(openssl rand -hex 32)\\nBASE_URL=http://147.79.101.189\\nFRONTEND_URL=http://147.79.101.189\\nFROM_EMAIL=noreply@smarttags.co.ke\\n" > .env`,
  "echo '=== [7/8] Seeding database ==='",
  "cd /var/www/smart-tags && sudo -u postgres psql -d carparktag -f packages/server/src/db/seed.sql 2>/dev/null; echo 'seed done'",
  "echo '=== [8/8] Starting app + Nginx ==='",
  "cd /var/www/smart-tags && pm2 delete smart-tags 2>/dev/null; pm2 start ecosystem.config.js --env production && pm2 save",
  `printf 'server {\\n  listen 80;\\n  server_name _;\\n  location / {\\n    proxy_pass http://127.0.0.1:3000;\\n    proxy_http_version 1.1;\\n    proxy_set_header Upgrade $http_upgrade;\\n    proxy_set_header Connection "upgrade";\\n    proxy_set_header Host $host;\\n    proxy_set_header X-Real-IP $remote_addr;\\n    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\\n    proxy_set_header X-Forwarded-Proto $scheme;\\n    proxy_read_timeout 86400;\\n  }\\n  gzip on;\\n  gzip_types text/plain text/css application/json application/javascript;\\n  client_max_body_size 10M;\\n}\\n' > /etc/nginx/sites-available/smart-tags`,
  "ln -sf /etc/nginx/sites-available/smart-tags /etc/nginx/sites-enabled/ && rm -f /etc/nginx/sites-enabled/default",
  "nginx -t && systemctl reload nginx",
  "echo '=============================='",
  "echo 'DEPLOY COMPLETE!'",
  "echo 'Visit: http://147.79.101.189'",
  "echo '=============================='",
];

const conn = new Client();
let cmdIndex = 0;

function runNext(stream) {
  if (cmdIndex >= commands.length) {
    console.log("\n✅ ALL COMMANDS COMPLETE");
    conn.end();
    return;
  }
  const cmd = commands[cmdIndex++];
  stream.write(cmd + "\n");
}

conn.on("ready", () => {
  console.log("✅ SSH Connected to", HOST);
  conn.shell((err, stream) => {
    if (err) { console.error("Shell error:", err); conn.end(); return; }

    let buffer = "";
    stream.on("data", (data) => {
      const text = data.toString();
      process.stdout.write(text);
      buffer += text;

      // When we see the prompt, run next command
      if (buffer.includes("# ") || buffer.includes("$ ")) {
        buffer = "";
        setTimeout(() => runNext(stream), 500);
      }
    });

    stream.on("close", () => {
      console.log("\nSession closed");
      conn.end();
    });
  });
});

conn.on("error", (err) => {
  console.error("SSH Error:", err.message);
});

conn.connect({
  host: HOST,
  port: 22,
  username: USER,
  password: PASS,
  readyTimeout: 30000,
});
