// PM2 Process Manager Configuration
module.exports = {
  apps: [
    {
      name: "smart-tags",
      script: "packages/server/dist/index.js",
      instances: "max",
      exec_mode: "cluster",
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/var/log/smart-tags/error.log",
      out_file: "/var/log/smart-tags/out.log",
      merge_logs: true,
    },
  ],
};
