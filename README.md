# CS2HUD v2.0

Professional CS2 spectator HUD — ESL-style vertical layout with full feature set.

## Features
- **ESL-style vertical HUD**: CT (blue left) · T (red right) · Center panel
- **Weapon SVG icons**: AK-47, AWP, M4A1-S, pistols, SMGs, etc.
- **Rajdhani font**: professional gaming HUD typography
- **Radar canvas**: player positions with map overlay support
- **Bomb/Defuse animations**: pulsing timer, flash on explode/defuse
- **Observer panel**: weapon + ammo + full utility inventory + kit indicator
- **BO1/BO3/BO5 management**: `/control` panel with map veto tracker
- **Round wins history**: color-coded dots (elim vs bomb)
- **Series bar**: live map scores display

## Quick Start
```bash
npm install
SERVER_HOST=189.74.98.124 npm start
```

## Endpoints
| URL | Purpose |
|-----|---------|
| `/hud` | HUD overlay (OBS Browser Source — 1920×1080) |
| `/control` | BO series control panel |
| `/setup` | Gaming PC GSI setup |
| `/gsi-config` | Download pre-configured GSI cfg |
| `/health` | Server health check |

## VPS Deploy
```bash
cd /opt && git clone https://github.com/muxammedqudaynazarov/CS2HUD.git
cd CS2HUD && npm install --omit=dev
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

## Map Radar Images
Place `{mapname}.png` files in `public/maps/` for map overlays.
Example: `public/maps/de_mirage.png`
Without images, radar shows a tactical grid with player dots.

## License
MIT © muxammedqudaynazarov
