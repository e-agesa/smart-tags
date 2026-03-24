const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /var/www/smart-tags
    echo "=== Web dist ==="
    ls -la packages/web/dist/ 2>&1
    echo "=== Server dist ==="
    ls packages/server/dist/ | head -10
    echo "=== Check app.ts for static serving ==="
    grep -n "static\|sendFile\|production" packages/server/dist/app.js | head -10
  `, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => conn.end());
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
