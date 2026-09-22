/**
 * CS2HUD Server  v2.0.0
 * GSI receiver · WebSocket · Series API · Team management
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

const PORT        = parseInt(process.env.PORT        || '3000', 10);
const SERVER_HOST = process.env.SERVER_HOST || null;
const GSI_TOKEN   = process.env.GSI_TOKEN   || 'cs2hud_2024';

// ─── IP helpers ─────────────────────────────────────────────────
function getLocalIPs() {
  const nets = os.networkInterfaces();
  const out  = [];
  for (const [name, addrs] of Object.entries(nets))
    for (const a of addrs)
      if (a.family === 'IPv4' && !a.internal) out.push({ iface: name, ip: a.address });
  return out;
}
function publicHost() {
  if (SERVER_HOST) return SERVER_HOST;
  const list = getLocalIPs();
  return list.length ? list[0].ip : 'localhost';
}

// ─── State ──────────────────────────────────────────────────────
let lastState      = {};
let gsiPacketCount = 0;
let wsClientCount  = 0;
const startedAt    = Date.now();

// ─── Series state (BO1/BO3/BO5) ─────────────────────────────────
let seriesState = {
  format: 'BO3',
  team1: { name: 'Team CT', shortName: 'CT', score: 0, country: '' },
  team2: { name: 'Team T',  shortName: 'T',  score: 0, country: '' },
  maps:  [],    // [{name, team1Score, team2Score, winner: null|'team1'|'team2', picked_by, side_team1}]
  active: false,
};

// ─── Middleware ──────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Routes ─────────────────────────────────────────────────────
app.get('/',        (_, res) => res.redirect('/hud'));
app.get('/health',  (_, res) => res.json({
  status: 'ok',
  uptime_s: Math.floor((Date.now() - startedAt) / 1000),
  gsi_packets: gsiPacketCount,
  ws_clients:  wsClientCount,
  has_data:    Object.keys(lastState).length > 0,
}));
app.get('/api/state',   (_, res) => res.json(lastState));
app.get('/api/network', (_, res) => res.json({
  public_host: publicHost(), port: PORT, local_ips: getLocalIPs(),
}));

// ─── Series API ──────────────────────────────────────────────────
app.get('/api/series', (_, res) => res.json(seriesState));

app.post('/api/series', (req, res) => {
  seriesState = { ...seriesState, ...req.body };
  io.emit('series', seriesState);
  res.json({ ok: true, series: seriesState });
});

app.post('/api/series/map-win', (req, res) => {
  const { mapIndex, winner } = req.body; // winner: 'team1' | 'team2'
  if (seriesState.maps[mapIndex]) {
    seriesState.maps[mapIndex].winner = winner;
    if (winner === 'team1') seriesState.team1.score++;
    if (winner === 'team2') seriesState.team2.score++;
    io.emit('series', seriesState);
  }
  res.json({ ok: true });
});

app.post('/api/series/reset', (_, res) => {
  seriesState.team1.score = 0;
  seriesState.team2.score = 0;
  seriesState.maps        = [];
  io.emit('series', seriesState);
  res.json({ ok: true });
});

// ─── GSI Config download ─────────────────────────────────────────
app.get('/gsi-config', (_, res) => {
  const host = publicHost();
  const cfg  = `"CS2HUD"\n{\n    "uri"           "http://${host}:${PORT}/gsi"\n    "timeout"       "5.0"\n    "heartbeat"     "10.0"\n    "auth"\n    {\n        "token"     "${GSI_TOKEN}"\n    }\n    "data"\n    {\n        "provider"               "1"\n        "map"                    "1"\n        "round"                  "1"\n        "player_id"              "1"\n        "allplayers_id"          "1"\n        "allplayers_state"       "1"\n        "allplayers_match_stats" "1"\n        "allplayers_weapons"     "1"\n        "allplayers_position"    "1"\n        "bomb"                   "1"\n        "grenades"               "1"\n        "previously"             "1"\n    }\n}\n`;
  res.setHeader('Content-Disposition','attachment; filename="gamestate_integration_cs2hud.cfg"');
  res.setHeader('Content-Type','text/plain; charset=utf-8');
  res.send(cfg);
});

// ─── GSI Receiver ────────────────────────────────────────────────
app.post('/gsi', (req, res) => {
  const state = req.body;
  if (!state || typeof state !== 'object') return res.sendStatus(400);
  const tok = state.auth?.token;
  if (tok && tok !== GSI_TOKEN) return res.sendStatus(403);
  lastState = state;
  gsiPacketCount++;
  io.emit('gamestate', state);
  if (state.round?.phase) {
    const map   = (state.map?.name || '?').padEnd(18);
    const round = String((state.map?.round ?? 0) + 1).padStart(2);
    process.stdout.write(`\r[GSI] ${map} R${round}  ${state.round.phase.toUpperCase().padEnd(12)} #${gsiPacketCount}`);
  }
  res.sendStatus(200);
});

// ─── WebSocket ───────────────────────────────────────────────────
io.on('connection', socket => {
  wsClientCount++;
  console.log(`\n[WS] + ${socket.id}  (clients: ${wsClientCount})`);
  if (Object.keys(lastState).length)  socket.emit('gamestate', lastState);
  if (seriesState.active)             socket.emit('series',    seriesState);
  socket.on('disconnect', () => { wsClientCount = Math.max(0, wsClientCount - 1); });
});

// ─── Start ───────────────────────────────────────────────────────
server.listen(PORT, '0.0.0.0', () => {
  const h = publicHost(), ln = '═'.repeat(50);
  console.log(`\n  ${ln}\n  CS2HUD  v2.0.0\n  ${ln}`);
  console.log(`  HUD     : http://${h}:${PORT}/hud`);
  console.log(`  Control : http://${h}:${PORT}/control`);
  console.log(`  Setup   : http://${h}:${PORT}/setup`);
  console.log(`  Health  : http://${h}:${PORT}/health`);
  if (!SERVER_HOST) console.log(`\n  ⚠️  VPS'da: SERVER_HOST=${h} npm start`);
  console.log(`  ${ln}\n`);
});
