module.exports = {
  apps: [
    {
      name: 'savfi-backend',
      script: './dist/index.js',
      instances: 'max', // Use all available CPU cores
      exec_mode: 'cluster', // Cluster mode for better performance

      // Environment variables
      env: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },

      // Logging configuration
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',

      // Process management
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Graceful shutdown
      shutdown_with_message: true,

      // Additional options
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],

  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'node',
      host: 'your-server-ip',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/savfi-backend.git',
      path: '/var/www/savfi-backend',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git',
    },
  },
};
