module.exports = {
  apps: [
    {
      name: "picopics-v2",
      script: "npm",
      args: "start",
      cwd: "/home/PicoPicsFullStack/PicoPics",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "/home/PicoPicsFullStack/PicoPics/logs/err.log",
      out_file: "/home/PicoPicsFullStack/PicoPics/logs/out.log",
      log_file: "/home/PicoPicsFullStack/PicoPics/logs/combined.log",
      time: true,
    },
  ],
};
