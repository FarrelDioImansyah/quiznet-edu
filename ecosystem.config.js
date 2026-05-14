// ecosystem.config.js
// PM2 Process Manager — untuk production di Ubuntu Server
// Jalankan: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name:       'quiznet-edu',
    script:     'server/index.js',
    instances:  1,               // gunakan 'max' untuk multi-core
    autorestart: true,
    watch:      false,           // false di production
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT:     3000
    }
  }]
};
