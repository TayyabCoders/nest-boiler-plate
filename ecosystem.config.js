module.exports = {
  apps: [
    {
      name: 'tnt-backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3001,

      }
    }
  ]
};