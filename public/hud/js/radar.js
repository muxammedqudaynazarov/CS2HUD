/* ═══════════════════════════════════════════════════════
   CS2HUD — Radar Canvas Renderer
   ═══════════════════════════════════════════════════════ */

// Map coordinate data (from Valve radar cfg files)
const MAP_DATA = {
  'de_mirage':   { x:-3230, y: 1250, scale:4.90 },
  'de_dust2':    { x:-2476, y: 3239, scale:4.40 },
  'de_inferno':  { x:-2087, y: 3870, scale:4.90 },
  'de_nuke':     { x:-3453, y: 2887, scale:7.00 },
  'de_overpass': { x:-4831, y: 1781, scale:5.20 },
  'de_ancient':  { x:-2953, y: 2164, scale:5.00 },
  'de_anubis':   { x:-2796, y: 3328, scale:5.22 },
  'de_vertigo':  { x:-3168, y: 1762, scale:4.00 },
  'de_cache':    { x:-2000, y: 3250, scale:4.60 },
  'de_train':    { x:-2477, y: 2392, scale:4.70 },
  'de_tuscan':   { x:-2800, y: 2800, scale:5.00 },
};

const RADAR_SIZE = 360;  // canvas pixels

class Radar {
  constructor(canvasEl) {
    this.canvas  = canvasEl;
    this.ctx     = canvasEl.getContext('2d');
    this.mapName = null;
    this.mapImg  = null;
    this.imgLoaded = false;
    this.canvas.width  = RADAR_SIZE;
    this.canvas.height = RADAR_SIZE;
  }

  loadMap(name) {
    if (name === this.mapName) return;
    this.mapName  = name;
    this.imgLoaded = false;
    const img = new Image();
    img.onload  = () => { this.mapImg = img; this.imgLoaded = true; };
    img.onerror = () => { this.mapImg = null; this.imgLoaded = false; };
    img.src = `/maps/${name}.png`;
  }

  gameToCanvas(gx, gy) {
    const m = MAP_DATA[this.mapName];
    if (!m) return { x: RADAR_SIZE / 2, y: RADAR_SIZE / 2 };
    return {
      x:  (gx - m.x) / m.scale,
      y: -(gy - m.y) / m.scale,
    };
  }

  render(state) {
    const ctx   = this.ctx;
    const allp  = state?.allplayers;
    const map   = state?.map;
    const obsId = state?.player?.steamid;

    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    // ── Background ──────────────────────────────────────────
    if (this.imgLoaded && this.mapImg) {
      ctx.drawImage(this.mapImg, 0, 0, RADAR_SIZE, RADAR_SIZE);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    } else {
      this._drawGridBackground();
    }

    if (!allp) return;

    // ── Players ─────────────────────────────────────────────
    for (const [steamid, p] of Object.entries(allp)) {
      const pos = p.position;
      if (!pos) continue;
      const [gx, gy] = pos.split(', ').map(Number);
      const { x, y } = this.gameToCanvas(gx, gy);
      if (x < 0 || x > RADAR_SIZE || y < 0 || y > RADAR_SIZE) continue;

      const isCT    = p.team === 'CT';
      const isDead  = (p.state?.health ?? 0) <= 0;
      const isObs   = steamid === obsId;

      this._drawPlayer(x, y, isCT, isDead, isObs, p.observer_slot, p.name);
    }

    // ── Bomb ────────────────────────────────────────────────
    const bomb = state?.bomb;
    if (bomb?.position && (bomb.state === 'planted' || bomb.state === 'defusing')) {
      const [bx, by] = bomb.position.split(', ').map(Number);
      const { x, y } = this.gameToCanvas(bx, by);
      this._drawBomb(x, y, bomb.state === 'defusing');
    }
  }

  _drawGridBackground() {
    const ctx = this.ctx;
    ctx.fillStyle = '#08090f';
    ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    const step = 36;
    for (let i = 0; i <= RADAR_SIZE; i += step) {
      ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,RADAR_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(RADAR_SIZE,i); ctx.stroke();
    }

    // center crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RADAR_SIZE/2-10, RADAR_SIZE/2); ctx.lineTo(RADAR_SIZE/2+10, RADAR_SIZE/2);
    ctx.moveTo(RADAR_SIZE/2, RADAR_SIZE/2-10); ctx.lineTo(RADAR_SIZE/2, RADAR_SIZE/2+10);
    ctx.stroke();

    // border
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(0.5, 0.5, RADAR_SIZE-1, RADAR_SIZE-1);
  }

  _drawPlayer(x, y, isCT, isDead, isObs, slot, name) {
    const ctx = this.ctx;
    const r   = isObs ? 7 : 5.5;

    if (isDead) {
      // X mark for dead players
      ctx.strokeStyle = isCT ? 'rgba(80,130,220,0.5)' : 'rgba(220,60,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x-3,y-3); ctx.lineTo(x+3,y+3);
      ctx.moveTo(x+3,y-3); ctx.lineTo(x-3,y+3);
      ctx.stroke();
      return;
    }

    // Glow for observed player
    if (isObs) {
      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, Math.PI * 2);
      ctx.fillStyle = isCT ? 'rgba(80,140,255,0.3)' : 'rgba(255,80,80,0.3)';
      ctx.fill();
    }

    // Outer ring
    ctx.beginPath();
    ctx.arc(x, y, r + 1, 0, Math.PI * 2);
    ctx.fillStyle = isCT ? 'rgba(20,40,100,0.8)' : 'rgba(100,20,20,0.8)';
    ctx.fill();

    // Main dot
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isCT ? '#5c8ff0' : '#ff4444';
    ctx.fill();

    // Slot number
    if (slot != null) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${isObs ? 8 : 7}px "Rajdhani",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(slot, x, y + 0.5);
    }
  }

  _drawBomb(x, y, defusing) {
    const ctx = this.ctx;
    const t   = Date.now();

    // Pulsing circle
    const pulse = 0.5 + 0.5 * Math.sin(t / (defusing ? 300 : 200) * Math.PI);
    ctx.beginPath();
    ctx.arc(x, y, 10 + pulse * 4, 0, Math.PI * 2);
    ctx.fillStyle = defusing
      ? `rgba(50,200,100,${0.15 + pulse * 0.1})`
      : `rgba(255,60,60,${0.15 + pulse * 0.12})`;
    ctx.fill();

    // Bomb icon
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = defusing ? '#22c55e' : '#ef4444';
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('💣', x, y);
  }
}

// Export for use in hud.js
window.Radar = Radar;
