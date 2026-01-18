/**
 * PM2 Ecosystem Configuration
 * Streaming Agent - Data Collection Server
 *
 * Usage:
 *   Development: pm2 start ecosystem.config.js
 *   Production:  pm2 start ecosystem.config.js --env production
 *
 * Commands:
 *   pm2 logs streaming-agent     - View logs
 *   pm2 restart streaming-agent  - Restart server
 *   pm2 stop streaming-agent     - Stop server
 *   pm2 delete streaming-agent   - Remove from PM2
 */

module.exports = {
  apps: [
    {
      name: "streaming-agent",
      script: "server/index.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,

      // Memory management
      max_memory_restart: "1G",

      // Environment - Development
      env: {
        NODE_ENV: "development",
        PORT: 3001,
      },

      // Environment - Production
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      },

      // Logging
      error_file: "./logs/err.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart behavior
      autorestart: true,
      restart_delay: 5000,
      max_restarts: 10,

      // Graceful shutdown
      kill_timeout: 15000,
      wait_ready: true,
      listen_timeout: 10000,

      // Cluster mode settings (if using instances > 1)
      instance_var: "INSTANCE_ID",

      // Process metadata
      merge_logs: true,
      vizion: false,
    },

    // Backup Scheduler
    {
      name: "backup-scheduler",
      script: "server/scripts/backup-to-gcs.js",
      args: "--scheduler",
      instances: 1,
      exec_mode: "fork",
      watch: false,

      // Environment
      env: {
        NODE_ENV: "production",
      },

      // Logging
      error_file: "./logs/backup-err.log",
      out_file: "./logs/backup-out.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",

      // Restart behavior
      autorestart: true,
      restart_delay: 60000, // 1 minute delay on restart
      max_restarts: 5,

      // Process metadata
      merge_logs: true,
      vizion: false,
    },
  ],
};
