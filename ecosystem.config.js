module.exports = {
  apps: [{
    name:   'cs2hud',
    script: 'server.js',
    cwd:    '/opt/CS2HUD',
    env: {
      PORT:        3000,
      SERVER_HOST: '189.74.98.124',
      GSI_TOKEN:   'cs2hud_2024',
      NODE_ENV:    'production',
    },
    max_memory_restart: '512M',
    restart_delay:       3000,
    watch:               false,
  }]
};
