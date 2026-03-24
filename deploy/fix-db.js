const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    # Set postgres password
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"

    # Enable password auth in pg_hba.conf
    PG_HBA=$(sudo -u postgres psql -t -c "SHOW hba_file;" | tr -d ' ')
    echo "HBA file: $PG_HBA"

    # Replace peer/ident with md5 for local connections
    sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' "$PG_HBA"
    sed -i 's/host    all             all             127.0.0.1\/32            scram-sha-256/host    all             all             127.0.0.1\/32            md5/' "$PG_HBA"
    sed -i 's/host    all             all             ::1\/128                 scram-sha-256/host    all             all             ::1\/128                 md5/' "$PG_HBA"

    # Reload PostgreSQL
    systemctl reload postgresql

    # Test connection
    PGPASSWORD=postgres psql -U postgres -h localhost -d carparktag -c "SELECT COUNT(*) FROM users;" 2>&1

    # Reseed if needed
    PGPASSWORD=postgres psql -U postgres -h localhost -d carparktag -f /var/www/smart-tags/packages/server/src/db/seed.sql 2>&1 | tail -5

    # Restart app
    pm2 restart smart-tags
    sleep 2

    # Test
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
