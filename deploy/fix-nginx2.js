const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec("fuser -k 80/tcp 2>/dev/null; sleep 1; systemctl start nginx && echo 'NGINX OK' || (journalctl -xeu nginx.service --no-pager | tail -20)", (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => {
      // Test the site
      conn.exec("curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/health && echo ' API' && curl -s http://localhost:3000/ | head -c 100", (err2, stream2) => {
        if (err2) { conn.end(); return; }
        stream2.on("data", (d) => process.stdout.write(d.toString()));
        stream2.on("close", () => conn.end());
      });
    });
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
