const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    cd /var/www/smart-tags
    JWT_SEC=$(grep JWT_SECRET .env | head -1 | cut -d= -f2)
    JWT_ADM=$(grep JWT_ADMIN_SECRET .env | head -1 | cut -d= -f2)
    cat > .env << ENVFILE
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carparktag
PORT=3000
NODE_ENV=production
JWT_SECRET=$JWT_SEC
JWT_ADMIN_SECRET=$JWT_ADM
BASE_URL=http://tf.letstag.me
FRONTEND_URL=http://tf.letstag.me
FROM_EMAIL=noreply@smarttags.co.ke
ENVFILE
    echo ".env fixed:"
    cat .env
    pm2 restart smart-tags
    sleep 3
    curl -s --connect-timeout 5 http://localhost:3000/api/auth/login -X POST -H "Content-Type: application/json" -d '{"phone":"0712345678","password":"test1234"}'
    echo ""
    echo "=== DONE ==="
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
