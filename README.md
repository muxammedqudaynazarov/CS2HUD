# CS2HUD

> Professional CS2 spectator HUD overlay using Game State Integration (GSI).

Real-time HUD for Counter-Strike 2 broadcasts — supports both **single-PC** and
**two-PC (LAN)** setups where the streaming PC and gaming PC are separate machines.

---

## Features

| Feature | Details |
|---------|---------|
| **Live player panels** | Health bars, armor, weapon, K/D for all 10 players |
| **Team scoreboard** | CT and T scores with team names from GSI |
| **Bomb timer** | Visual countdown bar — planted & defusing states |
| **Observer detail** | Expanded panel for the current POV player |
| **Round info** | Map name, phase, round number |
| **LAN-ready** | Server listens on all interfaces (`0.0.0.0`) |
| **Auto setup page** | `/setup` generates a pre-configured GSI cfg for any client |

---

## Quick Start

### 1 · Install dependencies
```bash
npm install
```

### 2 · Start the server (on streaming/HUD PC)
```bash
npm start
```

The console will print all available network addresses.

---

## Setup — Two-PC (LAN) Mode

```
┌───────────────────┐         LAN          ┌────────────────────┐
│   GAMING PC       │  ──── GSI POST ────► │   STREAMING PC     │
│   (CS2 running)   │                      │   (HUD server)     │
│                   │ ◄── browser? NO      │   http://192.168…  │
└───────────────────┘                      └────────────────────┘
                                                    │
                                                    ▼
                                             OBS Browser Source
                                           http://192.168.x.x:3000/hud
```

### On the Gaming PC

1. Open a browser and go to:
   ```
   http://<STREAMING_PC_IP>:3000/setup
   ```
2. Click **"Download GSI config"** — the file is pre-configured with the server's IP.
3. Place the downloaded file in CS2's cfg folder:
   ```
   C:\Program Files (x86)\Steam\steamapps\common\
       Counter-Strike Global Offensive\game\csgo\cfg\
   ```
4. Restart CS2.

### On the Streaming PC

- **OBS Browser Source URL:** `http://<STREAMING_PC_IP>:3000/hud`
- Resolution: **1920 × 1080**, Custom CSS: *(leave empty)*

---

## All Endpoints

| URL | Purpose |
|-----|---------|
| `/hud` | HUD overlay (for OBS) |
| `/setup` | Setup guide + GSI config download |
| `/gsi` | GSI receiver (CS2 posts here) |
| `/gsi-config` | Downloads a pre-configured `.cfg` file |
| `/api/state` | Returns last received game state (JSON) |
| `/api/network` | Returns server IP info (JSON) |

---

## Single-PC Mode

If CS2 and OBS are on the same machine, `localhost` works fine:

- HUD: `http://localhost:3000/hud`
- GSI cfg URI: `http://localhost:3000/gsi`

---

## Project Structure

```
CS2HUD/
├── server.js                         # Express + Socket.io server
├── gamestate_integration_cs2hud.cfg  # CS2 config template
├── package.json
└── public/
    ├── setup/index.html              # LAN setup guide page
    └── hud/
        ├── index.html                # HUD overlay
        ├── css/hud.css               # Styles
        └── js/
            ├── weapons.js            # Weapon name table
            └── hud.js                # HUD render logic
```

## Tech Stack

- **Node.js** + **Express** — server & GSI receiver
- **Socket.io** — real-time WebSocket
- **Vanilla HTML/CSS/JS** — no build step needed

---

## Acknowledgments

- [JohnTimmermann/JTs-Hud](https://github.com/JohnTimmermann/JTs-Hud) — GPL-3.0
- [drweissbrot/cs-hud](https://github.com/drweissbrot/cs-hud) — ISC
- [JohnTimmermann/Custom-CS2-HUD](https://github.com/JohnTimmermann/Custom-CS2-HUD) — GPL-3.0

---

## License

MIT © muxammedqudaynazarov
