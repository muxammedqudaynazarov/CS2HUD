/**
 * CS2HUD — Server  (LAN-ready)
 * ──────────────────────────────────────────────────────────────────
 * Listens on 0.0.0.0 so both localhost AND network clients can reach it.
 *
 *   Gaming PC  → sends GSI to   http://<SERVER_IP>:3000/gsi
 *   OBS        → browser source http://<SERVER_IP>:3000/hud
 *   Setup page → http://<SERVER_IP>:3000/setup  (auto-downloads GSI cfg)
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

const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';   // listen on ALL network interfaces

// ─── Detect local network IP(s) ─────────────────────────────────
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

// Primary IP used for GSI config generation & console hints
function primaryIP() {
  const list = getLocalIPs();
  return list.length ? list[0].ip : '127.0.0.1';
}

// ─── Last game state ─────────────────────────────────────────────
let lastState = {};

// ─── Middleware ──────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────────

// Root → HUD
app.get('/', (_, res) => res.redirect('/hud'));

// GSI receiver  (called by CS2 on the gaming PC)
app.post('/gsi', (req, res) => {
  const state = req.body;
  if (state && typeof state === 'object') {
    lastState = state;
    io.emit('gamestate', state);

    if (state.round?.phase) {
      const map   = state.map?.name || 'unknown';
      const round = (state.map?.round ?? 0) + 1;
      process.stdout.write(
        `\r[GSI] ${map.padEnd(20)} R${String(round).padStart(2)}  ${state.round.phase.toUpperCase().padEnd(14)}`
      );
    }
  }
  res.sendStatus(200);
});

// Last state (debug / health check)
app.get('/api/state', (_, res) => res.json(lastState));

// Network info endpoint – used by the setup page
app.get('/api/network', (_, res) => {
  res.json({
    ips:  getLocalIPs(),
    port: PORT,
    primary: primaryIP(),
  });
});

// ── Dynamic GSI config download ──────────────────────────────────
// Gaming PC opens http://<SERVER_IP>:3000/gsi-config → downloads
// a pre-configured .cfg file pointing back at this server's IP.
app.get('/gsi-config', (req, res) => {
  const serverIP = primaryIP();
  const cfg = `"CS2HUD"
{
    "uri"           "http://${serverIP}:${PORT}/gsi"
    "timeout"       "5.0"
    "heartbeat"     "10.0"
    "auth"
    {
        "token"     "cs2hud_2024"
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

// ─── WebSocket ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  const from = socket.handshake.address;
  console.log(`\n[WS] Client connected    : ${socket.id}  (${from})`);
  if (Object.keys(lastState).length) socket.emit('gamestate', lastState);
  socket.on('disconnect', () =>
    console.log(`[WS] Client disconnected : ${socket.id}`));
});

// ─── Start ──────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  const ip   = primaryIP();
  const all  = getLocalIPs();
  const line = '─'.repeat(52);

  console.log(`\n  ${line}`);
  console.log(`  CS2HUD  v1.1.0  —  LAN Mode`);
  console.log(`  ${line}`);
  console.log(`\n  🖥️  Server (this machine)`);
  console.log(`      http://localhost:${PORT}/hud`);
  if (all.length) {
    all.forEach(({ iface, ip: addr }) =>
      console.log(`      http://${addr}:${PORT}/hud     ← ${iface}`));
  }
  console.log(`\n  🎮  Gaming PC  (put cfg file here)`);
  console.log(`      CS2 sends GSI to → http://${ip}:${PORT}/gsi`);
  console.log(`\n  📋  Setup page  (open on gaming PC)`);
  console.log(`      http://${ip}:${PORT}/setup`);
  console.log(`      (auto-downloads correct GSI config)`);
  console.log(`\n  ${line}\n`);
});
