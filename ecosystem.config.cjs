/**
 * PM2 example — adjust paths/user for your server host.
 *
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'sanctum-site',
      script: 'src/index.js',
      cwd: __dirname,
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'production',
      },
      // .env is loaded by src/load-env.js from project root (not PM2 env_file)
    },
  ],
};
