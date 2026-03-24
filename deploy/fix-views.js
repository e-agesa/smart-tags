const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    cd /var/www/smart-tags
    # Copy EJS views to dist
    mkdir -p packages/server/dist/views
    cp packages/server/src/views/*.ejs packages/server/dist/views/
    ls -la packages/server/dist/views/
    pm2 restart smart-tags
    sleep 2
    curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/s/ST-K3M8X2PQ
    echo " QR page"
    echo "DONE"
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
