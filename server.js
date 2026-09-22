/**
 * CS2HUD — Server
 * ──────────────────────────────────────────────────────────────────
 * Receives CS2 Game State Integration (GSI) data via HTTP POST,
 * then broadcasts it in real-time to all connected HUD overlays
 * through Socket.io WebSockets.
 *
 * GSI endpoint  : POST http://localhost:3000/gsi
 * HUD overlay   : http://localhost:3000/hud
 * ──────────────────────────────────────────────────────────────────
 */

const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path       = require('path');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Last known game state (sent to new clients on connect)
let lastState = {};

// ─── Middleware ─────────────────────────────────────────────────
app.use(bodyParser.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Redirect root → HUD
app.get('/', (_, res) => res.redirect('/hud'));

// ─── GSI Receiver ───────────────────────────────────────────────
app.post('/gsi', (req, res) => {
  const state = req.body;

  if (state && typeof state === 'object') {
    lastState = state;
    io.emit('gamestate', state);

    // Debug: log phase changes
    if (state.round?.phase) {
      const phase = state.round.phase;
      const map   = state.map?.name || 'unknown';
      const round = (state.map?.round ?? 0) + 1;
      process.stdout.write(`\r[GSI] ${map} R${round} — ${phase.toUpperCase().padEnd(12)}`);
    }
  }

  res.sendStatus(200);
});

// ─── REST API ───────────────────────────────────────────────────
// Useful for debugging; returns the last received game state
app.get('/api/state', (_, res) => res.json(lastState));

// ─── WebSocket ──────────────────────────────────────────────────
io.on('connection', (socket) => {
  const addr = socket.handshake.address;
  console.log(`\n[WS] Client connected   : ${socket.id} (${addr})`);

  // Send current state immediately so the HUD renders without waiting
  if (Object.keys(lastState).length > 0) {
    socket.emit('gamestate', lastState);
  }

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// ─── Start ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  const line = '─'.repeat(44);
  console.log(`\n  ${line}`);
  console.log(`       ██████╗███████╗██████╗ ██╗  ██╗██╗   ██╗██████╗`);
  console.log(`      ██╔════╝██╔════╝╚════██╗██║  ██║██║   ██║██╔══██╗`);
  console.log(`      ██║     ███████╗ █████╔╝███████║██║   ██║██║  ██║`);
  console.log(`      ██║     ╚════██║██╔═══╝ ██╔══██║██║   ██║██║  ██║`);
  console.log(`      ╚██████╗███████║███████╗██║  ██║╚██████╔╝██████╔╝`);
  console.log(`       ╚═════╝╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝  v1.0.0`);
  console.log(`\n  ${line}`);
  console.log(`  Server   : http://localhost:${PORT}`);
  console.log(`  HUD      : http://localhost:${PORT}/hud`);
  console.log(`  GSI POST : http://localhost:${PORT}/gsi`);
  console.log(`  Debug    : http://localhost:${PORT}/api/state`);
  console.log(`  ${line}\n`);
});
