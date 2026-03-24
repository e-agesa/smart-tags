const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  conn.exec("nginx -t 2>&1 && echo '---' && ss -tlnp | grep ':80' && echo '---' && cat /etc/nginx/sites-enabled/smart-tags", (err, stream) => {
    if (err) { console.error(err); conn.end(); return; }
    stream.on("data", (d) => process.stdout.write(d.toString()));
    stream.stderr.on("data", (d) => process.stderr.write(d.toString()));
    stream.on("close", () => conn.end());
  });
});
conn.on("error", (err) => console.error("SSH Error:", err.message));
conn.connect({ host: "147.79.101.189", port: 22, username: "root", password: "MtVmTbHm@-L1,Yd&" });
