const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec(`
    cd /var/www/smart-tags &&
    git pull origin main &&
    npm run build &&
    cp packages/server/src/views/*.ejs packages/server/dist/views/ &&
    pm2 restart smart-tags &&
    sleep 3 &&
    curl -s http://localhost:3000/health &&
    echo "" &&
    echo "REDEPLOY DONE"
  `, (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => conn.end());
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
