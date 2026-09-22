# CS2HUD

> Professional CS2 spectator HUD overlay using Game State Integration (GSI).

A clean, real-time HUD overlay for Counter-Strike 2 broadcasts — designed
for use as an OBS Browser Source or any WebRTC-based streaming setup.

---

## Features

| Feature | Details |
|---------|---------|
| **Live player panels** | Health bars, armor, weapon, K/D for all 10 players |
| **Team scoreboard** | CT and T scores with team names from GSI |
| **Bomb timer** | Visual countdown bar when bomb is planted or defusing |
| **Observer detail** | Expanded panel for the currently spectated player (weapon ammo, money, grenades) |
| **Round info** | Map name, round phase, round number |
| **WebSocket-powered** | Sub-200ms latency from CS2 → HUD |

---

## Setup

### 1 · Install dependencies
```bash
npm install
```

### 2 · Install the GSI config
Copy `gamestate_integration_cs2hud.cfg` into your CS2 config directory:

```
C:\Program Files (x86)\Steam\steamapps\common\
    Counter-Strike Global Offensive\game\csgo\cfg\
```

Restart CS2 if it was already running.

### 3 · Start the server
```bash
npm start
```

### 4 · Add to OBS
Add a **Browser Source** in OBS:
- **URL**: `http://localhost:3000/hud`
- **Width**: `1920`
- **Height**: `1080`
- Uncheck "Control audio via OBS"

The HUD is transparent — place it on top of your game capture.

---

## Project Structure

```
CS2HUD/
├── server.js                          # Node.js server (GSI + Socket.io)
├── gamestate_integration_cs2hud.cfg   # CS2 config file (copy to CS2)
├── package.json
└── public/
    └── hud/
        ├── index.html                 # HUD overlay page
        ├── css/hud.css                # All styles
        └── js/
            ├── weapons.js             # Weapon name lookup table
            └── hud.js                 # Main HUD logic
```

## Tech Stack

- **Node.js** + **Express** — HTTP server & GSI receiver
- **Socket.io** — real-time WebSocket broadcasting
- **Vanilla HTML / CSS / JS** — no frontend build step required

---

## Acknowledgments

This project was built from scratch, drawing inspiration from the open-source
CS2 HUD ecosystem:

- [JohnTimmermann/JTs-Hud](https://github.com/JohnTimmermann/JTs-Hud) — GPL-3.0
- [drweissbrot/cs-hud](https://github.com/drweissbrot/cs-hud) — ISC
- [JohnTimmermann/Custom-CS2-HUD](https://github.com/JohnTimmermann/Custom-CS2-HUD) — GPL-3.0

GSI documentation by [u/Bkid on Reddit](https://www.reddit.com/r/GlobalOffensive/comments/cjhcpy/).

---

## License

MIT © muxammedqudaynazarov
