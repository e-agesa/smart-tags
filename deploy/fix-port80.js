const { Client } = require("ssh2");
const conn = new Client();
conn.on("ready", () => {
  const cmd = `
    # Stop traefik and docker
    docker stop $(docker ps -q) 2>/dev/null || true
    systemctl stop docker 2>/dev/null || true
    systemctl disable docker 2>/dev/null || true
    # Kill anything on port 80
    fuser -k 80/tcp 2>/dev/null || true
    sleep 1
    # Start nginx
    systemctl start nginx
    systemctl enable nginx
    echo "NGINX STATUS:"
    systemctl is-active nginx
    echo "---"
    curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost
    echo ""
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
