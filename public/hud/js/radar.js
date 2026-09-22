/* ═══════════════════════════════════════════════════════
   CS2HUD — Radar Canvas Renderer  v2.1
   Map images: public/maps/{mapname}.png  (1024×1024)
   ═══════════════════════════════════════════════════════ */

// Map data — from Valve radar_cfg files
// pos_x/pos_y = top-left corner world coords
// scale = world units per 1024-pixel image pixel
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
};

// Two-level maps: detect lower level by Z threshold
const LOWER_LEVEL = {
  'de_nuke':    { threshold: -495, file: 'de_nuke_lower' },
  'de_vertigo': { threshold:  11700, file: 'de_vertigo_lower' },
};

const IMG_SIZE   = 1024;   // source image resolution
const RADAR_SIZE = 360;    // canvas pixels
const SCALE      = RADAR_SIZE / IMG_SIZE;  // 0.35156

class Radar {
  constructor(canvasEl) {
    this.canvas   = canvasEl;
    this.ctx      = canvasEl.getContext('2d');
    this.mapName  = null;
    this.imgUpper = null;
    this.imgLower = null;
    this.canvas.width  = RADAR_SIZE;
    this.canvas.height = RADAR_SIZE;
  }

  // Load (or reload when map changes)
  loadMap(name) {
    if (name === this.mapName) return;
    this.mapName  = name;
    this.imgUpper = this._loadImg(`/maps/${name}.png`);

    if (LOWER_LEVEL[name]) {
      this.imgLower = this._loadImg(`/maps/${LOWER_LEVEL[name].file}.png`);
    } else {
      this.imgLower = null;
    }
  }

  _loadImg(src) {
    const img    = new Image();
    img.loaded   = false;
    img.onload   = () => img.loaded = true;
    img.onerror  = () => img.loaded = false;
    img.src      = src;
    return img;
  }

  // Convert world coords → canvas coords (corrected Valve formula)
  _toCanvas(gx, gy) {
    const m = MAP_DATA[this.mapName];
    if (!m) return { x: RADAR_SIZE / 2, y: RADAR_SIZE / 2 };
    return {
      x: (gx - m.x) / m.scale * SCALE,
      y: (m.y - gy) / m.scale * SCALE,   // Y axis flipped: pos_y is topmost world coord
    };
  }

  // Decide which level image to use based on player Z height
  _chooseLevelImg(gz) {
    if (!LOWER_LEVEL[this.mapName]) return this.imgUpper;
    return gz < LOWER_LEVEL[this.mapName].threshold ? this.imgLower : this.imgUpper;
  }

  render(state) {
    const ctx   = this.ctx;
    const allp  = state?.allplayers;
    const obsId = state?.player?.steamid;

    ctx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    // ── Background ──────────────────────────────────────────
    if (this.imgUpper?.loaded) {
      ctx.drawImage(this.imgUpper, 0, 0, RADAR_SIZE, RADAR_SIZE);
      // Dark overlay so player dots stand out
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);
    } else {
      this._drawGrid();
    }

    if (!allp) return;

    // ── Players ─────────────────────────────────────────────
    // Draw dead players first, then alive (so alive render on top)
    const players = Object.entries(allp)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a,b) => {
        const aAlive = (a.state?.health ?? 0) > 0;
        const bAlive = (b.state?.health ?? 0) > 0;
        return aAlive === bAlive ? 0 : aAlive ? 1 : -1;
      });

    for (const p of players) {
      if (!p.position) continue;
      const parts = p.position.split(', ').map(Number);
      const [gx, gy, gz] = parts;
      const { x, y } = this._toCanvas(gx, gy);

      // skip if out of canvas
      if (x < -10 || x > RADAR_SIZE + 10 || y < -10 || y > RADAR_SIZE + 10) continue;

      const isCT   = p.team === 'CT';
      const isDead = (p.state?.health ?? 0) <= 0;
      const isObs  = p.id === obsId;

      this._drawPlayer(x, y, isCT, isDead, isObs, p.observer_slot, p.forward);
    }

    // ── Bomb ────────────────────────────────────────────────
    const bomb = state?.bomb;
    if (bomb?.position && (bomb.state === 'planted' || bomb.state === 'defusing')) {
      const [bx, by] = bomb.position.split(', ').map(Number);
      const { x, y } = this._toCanvas(bx, by);
      this._drawBomb(x, y, bomb.state === 'defusing');
    }
  }

  _drawPlayer(x, y, isCT, isDead, isObs, slot, forward) {
    const ctx = this.ctx;
    const r   = isObs ? 7 : 5.5;

    if (isDead) {
      ctx.strokeStyle = isCT ? 'rgba(77,136,255,0.5)' : 'rgba(255,68,68,0.5)';
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.moveTo(x-3, y-3); ctx.lineTo(x+3, y+3);
      ctx.moveTo(x+3, y-3); ctx.lineTo(x-3, y+3);
      ctx.stroke();
      return;
    }

    // Outer glow (observed)
    if (isObs) {
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.fillStyle = isCT ? 'rgba(77,136,255,0.28)' : 'rgba(255,68,68,0.28)';
      ctx.fill();
    }

    // Direction cone (from forward vector)
    if (forward) {
      const [fx, fy] = forward.split(', ').map(Number);
      const angle    = Math.atan2(-fy, fx);   // flip Y for canvas coords
      const coneLen  = r + 9;
      const halfAng  = 0.45;                  // ~26 degrees half-angle
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, coneLen, angle - halfAng, angle + halfAng);
      ctx.closePath();
      ctx.fillStyle = isCT ? 'rgba(77,136,255,0.4)' : 'rgba(255,68,68,0.4)';
      ctx.fill();
    }

    // Shadow
    ctx.beginPath();
    ctx.arc(x + 1, y + 1, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fill();

    // Main circle
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = isCT ? '#4d88ff' : '#ff4444';
    ctx.fill();

    // White border
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = isCT ? 'rgba(180,210,255,0.8)' : 'rgba(255,180,180,0.8)';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Slot number
    ctx.fillStyle = '#fff';
    ctx.font      = `bold ${isObs ? 8 : 7}px Rajdhani,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(slot ?? ''), x, y + 0.5);
  }

  _drawBomb(x, y, defusing) {
    const ctx   = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / (defusing ? 250 : 180) * Math.PI);

    // Pulsing outer ring
    ctx.beginPath();
    ctx.arc(x, y, 10 + pulse * 5, 0, Math.PI * 2);
    ctx.fillStyle = defusing
      ? `rgba(34,197,94,${0.12 + pulse * 0.1})`
      : `rgba(239,68,68,${0.12 + pulse * 0.12})`;
    ctx.fill();

    // Bomb dot
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fillStyle = defusing ? '#22c55e' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.2;
    ctx.stroke();

    // Icon text
    ctx.font      = '8px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(defusing ? '🔧' : '💣', x, y);
  }

  _drawGrid() {
    const ctx = this.ctx;
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth   = 1;
    const step = 36;
    for (let i = 0; i <= RADAR_SIZE; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, RADAR_SIZE); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(RADAR_SIZE, i); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(0.5, 0.5, RADAR_SIZE - 1, RADAR_SIZE - 1);

    // Map name placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font      = 'bold 13px Rajdhani,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.mapName ? this.mapName.replace('de_','').toUpperCase() : 'NO MAP', RADAR_SIZE/2, RADAR_SIZE/2);
  }
}

window.Radar = Radar;
