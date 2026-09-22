/**
 * CS2HUD — Server  v1.2.0
 * ──────────────────────────────────────────────────────────────────
 * Supports both LAN and remote VPS deployments.
 *
 * Environment variables:
 *   PORT        = 3000          (HTTP port)
 *   SERVER_HOST = 189.74.98.124 (public IP or domain — set on VPS!)
 *   GSI_TOKEN   = cs2hud_2024   (auth token, must match cfg file)
 *
 * Endpoints:
 *   POST /gsi          ← CS2 gaming PC sends data here
 *   GET  /hud          ← OBS browser source
 *   GET  /setup        ← Setup guide (shows correct URLs)
 *   GET  /gsi-config   ← Downloads pre-configured .cfg file
 *   GET  /api/state    ← Last GSI state (debug)
 *   GET  /api/network  ← IP info (used by /setup page)
 *   GET  /health       ← Health check (uptime, connections)
 * ──────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const os         = require('os');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

// ─── Config (from env or defaults) ──────────────────────────────
const PORT        = parseInt(process.env.PORT        || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || null;   // e.g. 189.74.98.124
const GSI_TOKEN   = process.env.GSI_TOKEN   || 'cs2hud_2024';

// ─── IP detection ────────────────────────────────────────────────
function getLocalIPs() {
  const nets  = os.networkInterfaces();
  const found = [];
  for (const [name, addrs] of Object.entries(nets)) {
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) {
        found.push({ iface: name, ip: a.address });
      }
    }
  }
  return found;
}

/**
 * Returns the IP/hostname to use in URLs and GSI configs.
 * Priority:  SERVER_HOST env  →  first local IPv4  →  localhost
 */
function publicHost() {
  if (SERVER_HOST) return SERVER_HOST;
  const list = getLocalIPs();
  return list.length ? list[0].ip : 'localhost';
}

// ─── State ───────────────────────────────────────────────────────
let lastState       = {};
let gsiPacketCount  = 0;
let wsClientCount   = 0;
const startedAt     = Date.now();

// ─── Middleware ──────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────────

app.get('/', (_, res) => res.redirect('/hud'));

// ── Health check ─────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status:      'ok',
    uptime_s:    Math.floor((Date.now() - startedAt) / 1000),
    gsi_packets: gsiPacketCount,
    ws_clients:  wsClientCount,
    has_data:    Object.keys(lastState).length > 0,
  });
});

// ── GSI receiver ─────────────────────────────────────────────────
app.post('/gsi', (req, res) => {
  const state = req.body;
  if (!state || typeof state !== 'object') return res.sendStatus(400);

  // Token validation (optional but recommended on public VPS)
  const receivedToken = state.auth?.token;
  if (receivedToken && receivedToken !== GSI_TOKEN) {
    console.warn(`\n[GSI] ⚠️  Invalid token: "${receivedToken}" — request ignored`);
    return res.sendStatus(403);
  }

  lastState = state;
  gsiPacketCount++;
  io.emit('gamestate', state);

  if (state.round?.phase) {
    const map   = (state.map?.name || 'unknown').padEnd(20);
    const round = String((state.map?.round ?? 0) + 1).padStart(2);
    const phase = state.round.phase.toUpperCase().padEnd(14);
    process.stdout.write(`\r[GSI] ${map} R${round}  ${phase}  #${gsiPacketCount}`);
  }

  res.sendStatus(200);
});

// ── Debug / API ───────────────────────────────────────────────────
app.get('/api/state', (_, res) => res.json(lastState));

app.get('/api/network', (_, res) => {
  res.json({
    public_host: publicHost(),
    port:        PORT,
    local_ips:   getLocalIPs(),
    server_host_env: SERVER_HOST || null,
  });
});

// ── Dynamic GSI config download ───────────────────────────────────
// Point CS2 at the correct public host automatically.
app.get('/gsi-config', (req, res) => {
  const host = publicHost();
  const cfg  = `"CS2HUD"
{
    "uri"           "http://${host}:${PORT}/gsi"
    "timeout"       "5.0"
    "heartbeat"     "10.0"
    "auth"
    {
        "token"     "${GSI_TOKEN}"
    }
    "data"
    {
        "provider"               "1"
        "map"                    "1"
        "round"                  "1"
        "player_id"              "1"
        "allplayers_id"          "1"
        "allplayers_state"       "1"
        "allplayers_match_stats" "1"
        "allplayers_weapons"     "1"
        "allplayers_position"    "0"
        "bomb"                   "1"
        "grenades"               "1"
        "previously"             "1"
    }
}
`;
  res.setHeader('Content-Disposition',
    'attachment; filename="gamestate_integration_cs2hud.cfg"');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(cfg);
});

// ─── WebSocket ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  wsClientCount++;
  const from = socket.handshake.address;
  console.log(`\n[WS] ↑ connected    ${socket.id}  (${from})  clients: ${wsClientCount}`);

  if (Object.keys(lastState).length) socket.emit('gamestate', lastState);

  socket.on('disconnect', () => {
    wsClientCount = Math.max(0, wsClientCount - 1);
    console.log(`[WS] ↓ disconnected ${socket.id}  clients: ${wsClientCount}`);
  });
});

// ─── Start ───────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const host = publicHost();
  const line = '═'.repeat(54);

  console.log(`\n  ${line}`);
  console.log(`  CS2HUD  v1.2.0`);
  console.log(`  ${line}`);
  console.log(`\n  🌐  Public address`);
  console.log(`        http://${host}:${PORT}/hud`);
  if (SERVER_HOST) {
    console.log(`        (SERVER_HOST env set — using this for GSI config)`);
  } else {
    const all = getLocalIPs();
    if (all.length > 1) {
      all.forEach(({ iface, ip }) =>
        console.log(`        http://${ip}:${PORT}/hud   ← ${iface}`));
    }
    console.log(`\n  ⚠️   VPS'da to'g'ri IP ko'rsatish uchun:`);
    console.log(`        SERVER_HOST=<public-ip> npm start`);
  }
  console.log(`\n  🎮  Gaming PC GSI endpoint`);
  console.log(`        http://${host}:${PORT}/gsi`);
  console.log(`\n  📋  Setup page (gaming PC'dan oching)`);
  console.log(`        http://${host}:${PORT}/setup`);
  console.log(`\n  ❤️   Health check`);
  console.log(`        http://${host}:${PORT}/health`);
  console.log(`\n  🔑  GSI Token: ${GSI_TOKEN}`);
  console.log(`\n  ${line}\n`);
});
