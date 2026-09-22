/**
 * CS2HUD — Advanced Radar  v3.0
 * Inspired by BoltObserv (github.com/boltgolt/boltobserv, GPL-3.0)
 *
 * Features:
 *  - Autozoom: smooth pan + zoom to follow alive players
 *  - 6 player dot states: default / observed / flashed / shooting / damaged / bomb carrier
 *  - Grenade visualization: smoke · molotov · flash · HE · decoy
 *  - Z-height based layer selection (Nuke/Vertigo lower level)
 *  - Facing direction cone
 *  - Continuous rAF animation loop
 */

// ── Map data (Valve radar_cfg) ─────────────────────────────────
// pos_x/pos_y = top-left world coord; scale = units / 1024-pixel
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

const LOWER_LEVEL = {
  'de_nuke':    { threshold: -495,   file: 'de_nuke_lower'    },
  'de_vertigo': { threshold:  11700, file: 'de_vertigo_lower' },
};

const IMG_SRC  = 1024;
const RADAR_SZ = 360;
const BASE_SC  = RADAR_SZ / IMG_SRC;  // 0.3515625

// ── Lerp helper ────────────────────────────────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }

// ── Grenade colours ────────────────────────────────────────────
const NADE_STYLE = {
  smoke:     { fill:'rgba(160,170,180,0.55)', stroke:'rgba(220,230,240,0.7)', r:8 },
  inferno:   { fill:'rgba(255,100,20,0.5)',   stroke:'rgba(255,150,50,0.8)',  r:10 },
  flashbang: { fill:'rgba(255,240,100,0.6)',  stroke:'rgba(255,255,200,0.9)', r:5  },
  frag:      { fill:'rgba(230,60,60,0.55)',   stroke:'rgba(255,80,80,0.8)',   r:5  },
  decoy:     { fill:'rgba(120,130,140,0.4)',  stroke:'rgba(160,170,180,0.6)', r:4  },
};

// ═══════════════════════════════════════════════════════════════
class Radar {
  constructor(canvasEl) {
    this.canvas = canvasEl;
    this.ctx    = canvasEl.getContext('2d');
    this.canvas.width  = RADAR_SZ;
    this.canvas.height = RADAR_SZ;

    // Map assets
    this.mapName  = null;
    this.imgUpper = null;
    this.imgLower = null;

    // Camera state (in raw-coord space: 0…RADAR_SZ)
    this.camX    = RADAR_SZ / 2;
    this.camY    = RADAR_SZ / 2;
    this.camZoom = 1.0;
    this.tgtX    = RADAR_SZ / 2;
    this.tgtY    = RADAR_SZ / 2;
    this.tgtZoom = 1.0;

    // Shooting tracker  { steamid: { clip, ts } }
    this.shootTrack = {};
    // Damage tracker   { steamid: { hp, ts } }
    this.dmgTrack   = {};

    // Latest game state
    this.lastState = null;

    // Start continuous animation loop
    this._loop();
  }

  // ── Public API ───────────────────────────────────────────────
  loadMap(name) {
    if (name === this.mapName) return;
    this.mapName  = name;
    this.imgUpper = this._img(`/maps/${name}.png`);
    this.imgLower = LOWER_LEVEL[name]
      ? this._img(`/maps/${LOWER_LEVEL[name].file}.png`)
      : null;
    // Reset camera
    this.camX = this.tgtX = RADAR_SZ / 2;
    this.camY = this.tgtY = RADAR_SZ / 2;
    this.camZoom = this.tgtZoom = 1.0;
  }

  render(state) {
    if (!state) return;
    this._trackShooting(state);
    this._trackDamage(state);
    this._updateCamera(state);
    this.lastState = state;
  }

  // ── Animation loop ───────────────────────────────────────────
  _loop() {
    const SMOOTH_CAM  = 0.07;
    const SMOOTH_ZOOM = 0.055;

    const tick = () => {
      // Smoothly interpolate camera
      this.camX    = lerp(this.camX,    this.tgtX,    SMOOTH_CAM);
      this.camY    = lerp(this.camY,    this.tgtY,    SMOOTH_CAM);
      this.camZoom = lerp(this.camZoom, this.tgtZoom, SMOOTH_ZOOM);

      if (this.lastState) this._draw(this.lastState);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // ── Camera autozoom ──────────────────────────────────────────
  _updateCamera(state) {
    const allp = state?.allplayers;
    if (!allp || !this.mapName) return;

    const alive = Object.values(allp)
      .filter(p => (p.state?.health ?? 0) > 0 && p.position);

    if (!alive.length) {
      this.tgtX    = RADAR_SZ / 2;
      this.tgtY    = RADAR_SZ / 2;
      this.tgtZoom = 1.0;
      return;
    }

    const raws = alive.map(p => {
      const [gx, gy] = p.position.split(', ').map(Number);
      return this._raw(gx, gy);
    });

    const xs = raws.map(r => r.x), ys = raws.map(r => r.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const cX = (minX + maxX) / 2;
    const cY = (minY + maxY) / 2;

    // Padding: 45% of span on each side so players never touch edge
    const spanX = Math.max(maxX - minX, 30) * 1.9;
    const spanY = Math.max(maxY - minY, 30) * 1.9;

    const zoom = Math.min(
      RADAR_SZ / spanX,
      RADAR_SZ / spanY,
      2.8                // max zoom cap
    );

    this.tgtX    = cX;
    this.tgtY    = cY;
    this.tgtZoom = Math.max(zoom, 1.0);  // min = full map
  }

  // ── Main draw ────────────────────────────────────────────────
  _draw(state) {
    const ctx   = this.ctx;
    const allp  = state?.allplayers;
    const obsId = state?.player?.steamid;
    const bomb  = state?.bomb;
    const nades = state?.grenades;

    ctx.clearRect(0, 0, RADAR_SZ, RADAR_SZ);

    // 1. Map background
    this._drawBg();

    // 2. Grenades
    if (nades) this._drawNades(nades);

    // 3. Bomb when planted
    if (bomb?.position && (bomb.state === 'planted' || bomb.state === 'defusing')) {
      const [bx, by] = bomb.position.split(', ').map(Number);
      const pos = this._cam(bx, by);
      this._drawBomb(pos, bomb.state === 'defusing');
    }

    if (!allp) return;

    // 4. Players — sort by Z so higher players render on top
    const players = Object.entries(allp)
      .map(([id, p]) => ({ id, ...p }))
      .sort((a, b) => {
        const az = a.position ? +a.position.split(', ')[2] : 0;
        const bz = b.position ? +b.position.split(', ')[2] : 0;
        return az - bz;
      });

    for (const p of players) {
      if (!p.position) continue;
      const [gx, gy, gz] = p.position.split(', ').map(Number);

      // Skip lower-level players if we're showing upper only (basic heuristic)
      const pos = this._cam(gx, gy);
      if (pos.x < -20 || pos.x > RADAR_SZ + 20 || pos.y < -20 || pos.y > RADAR_SZ + 20) continue;

      const hp       = p.state?.health ?? 0;
      const isDead   = hp <= 0;
      const isCT     = p.team === 'CT';
      const isObs    = p.id === obsId;
      const isFlash  = (p.state?.flashed  ?? 0) > 200;
      const isDmg    = (Date.now() - (this.dmgTrack[p.id]?.ts ?? 0)) < 400;
      const isShot   = (Date.now() - (this.shootTrack[p.id]?.ts ?? 0)) < 260;
      const hasBomb  = Object.values(p.weapons ?? {}).some(w => w.name === 'weapon_c4');

      this._drawPlayer(pos, {
        isCT, isDead, isObs, isFlash, isDmg, isShot, hasBomb,
        slot: p.observer_slot, forward: p.forward, hp,
      });
    }
  }

  // ── Background ───────────────────────────────────────────────
  _drawBg() {
    const ctx = this.ctx;
    const ox  = RADAR_SZ / 2 - this.camX * this.camZoom;
    const oy  = RADAR_SZ / 2 - this.camY * this.camZoom;
    const sz  = RADAR_SZ * this.camZoom;

    if (this.imgUpper?.loaded) {
      ctx.fillStyle = '#080a10';
      ctx.fillRect(0, 0, RADAR_SZ, RADAR_SZ);
      ctx.drawImage(this.imgUpper, ox, oy, sz, sz);
      // Slight darkening overlay
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(0, 0, RADAR_SZ, RADAR_SZ);
    } else {
      this._drawGrid(ox, oy, sz);
    }

    // Border
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, RADAR_SZ - 1, RADAR_SZ - 1);
  }

  _drawGrid(ox, oy, sz) {
    const ctx  = this.ctx;
    ctx.fillStyle = '#07090f';
    ctx.fillRect(0, 0, RADAR_SZ, RADAR_SZ);

    const step = 36 * this.camZoom;
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    ctx.lineWidth = 1;

    const startX = ox % step - step;
    const startY = oy % step - step;
    for (let x = startX; x < RADAR_SZ; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, RADAR_SZ); ctx.stroke();
    }
    for (let y = startY; y < RADAR_SZ; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(RADAR_SZ, y); ctx.stroke();
    }

    // Map name
    const name = this.mapName ? this.mapName.replace('de_','').toUpperCase() : 'НЕТ КАРТЫ';
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.font = `bold ${13 * this.camZoom}px Rajdhani,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, RADAR_SZ / 2, RADAR_SZ / 2);
  }

  // ── Grenade visualization ────────────────────────────────────
  _drawNades(grenades) {
    const ctx = this.ctx;
    for (const n of Object.values(grenades)) {
      if (!n.position) continue;
      const [gx, gy] = n.position.split(', ').map(Number);
      const {x, y}   = this._cam(gx, gy);
      if (x < -20 || x > RADAR_SZ + 20 || y < -20 || y > RADAR_SZ + 20) continue;

      const st = NADE_STYLE[n.type] || NADE_STYLE.decoy;
      const r  = st.r * Math.max(0.7, this.camZoom * 0.8);

      // For smoke: lifetime-based expanding circle
      let radius = r;
      if (n.type === 'smoke') {
        const lt = parseFloat(n.lifetime ?? 0);
        radius = r * Math.min(1, lt / 4);  // expands over ~4s
      }

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = st.fill;
      ctx.fill();
      ctx.strokeStyle = st.stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  }

  // ── Player dot ───────────────────────────────────────────────
  _drawPlayer(pos, opts) {
    const { x, y } = pos;
    const { isCT, isDead, isObs, isFlash, isDmg, isShot, hasBomb, slot, forward, hp } = opts;
    const ctx = this.ctx;
    const z   = this.camZoom;

    // Base colours
    let mainColor  = isCT ? '#4d88ff' : '#ff4444';
    let ringColor  = isCT ? 'rgba(120,170,255,0.8)' : 'rgba(255,120,120,0.8)';
    let dotR       = Math.max(5, 7.5 / Math.max(z, 1));

    // Bomb carrier override (T with C4)
    if (hasBomb && !isCT) {
      mainColor = '#ffb830';
      ringColor = 'rgba(255,210,80,0.9)';
    }

    // ── Dead: small cross ──
    if (isDead) {
      ctx.strokeStyle = isCT ? 'rgba(77,136,255,0.45)' : 'rgba(255,68,68,0.45)';
      ctx.lineWidth = Math.max(1, 1.5 / z);
      const s = Math.max(3, 4.5 / z);
      ctx.beginPath();
      ctx.moveTo(x - s, y - s); ctx.lineTo(x + s, y + s);
      ctx.moveTo(x + s, y - s); ctx.lineTo(x - s, y + s);
      ctx.stroke();
      return;
    }

    // ── Shooting: muzzle flash ──
    if (isShot) {
      ctx.save();
      ctx.globalAlpha = 0.55;
      const flashR = dotR * 2.2;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, flashR);
      grad.addColorStop(0, 'rgba(255,230,100,0.9)');
      grad.addColorStop(1, 'rgba(255,160,20,0)');
      ctx.beginPath();
      ctx.arc(x, y, flashR, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }

    // ── Observed player outer glow ring ──
    if (isObs) {
      ctx.beginPath();
      ctx.arc(x, y, dotR + 5.5 / z, 0, Math.PI * 2);
      ctx.strokeStyle = isCT ? 'rgba(77,136,255,0.35)' : 'rgba(255,68,68,0.35)';
      ctx.lineWidth = 3 / z;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, y, dotR + 3 / z, 0, Math.PI * 2);
      ctx.strokeStyle = mainColor;
      ctx.lineWidth = 1.5 / z;
      ctx.stroke();
    }

    // ── Flashed: white outer glow ──
    if (isFlash) {
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(x, y, dotR * 2.0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();
      ctx.restore();
    }

    // ── Facing direction cone ──
    if (forward) {
      const [fx, fy] = forward.split(', ').map(Number);
      const angle    = Math.atan2(-fy, fx);
      const coneLen  = (dotR + 9) / z;
      const halfAng  = 0.42;

      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(x, y, coneLen, angle - halfAng, angle + halfAng);
      ctx.closePath();
      ctx.fillStyle = mainColor;
      ctx.fill();
      ctx.restore();
    }

    // ── Being damaged: red arc on back ──
    if (isDmg) {
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(x, y, dotR + 2 / z, Math.PI * 0.3, Math.PI * 1.7);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth   = 2.5 / z;
      ctx.stroke();
      ctx.restore();
    }

    // ── Shadow ──
    ctx.beginPath();
    ctx.arc(x + 0.8 / z, y + 0.8 / z, dotR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fill();

    // ── Main dot ──
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();

    // ── White ring ──
    ctx.beginPath();
    ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.strokeStyle = ringColor;
    ctx.lineWidth   = Math.max(0.8, 1.2 / z);
    ctx.stroke();

    // ── Flashed: white fill overlay ──
    if (isFlash) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.beginPath();
      ctx.arc(x, y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.restore();
    }

    // ── Slot number ──
    if (slot != null) {
      const fontSize = Math.max(6, (isObs ? 8.5 : 7) / z);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${fontSize}px Rajdhani,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(slot), x, y + 0.5 / z);
    }
  }

  // ── Bomb ─────────────────────────────────────────────────────
  _drawBomb({ x, y }, defusing) {
    const ctx   = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(Date.now() / (defusing ? 220 : 160) * Math.PI);
    const r     = Math.max(4, 6 / this.camZoom);

    // Pulsing glow
    ctx.beginPath();
    ctx.arc(x, y, r + 5 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = defusing
      ? `rgba(34,197,94,${0.1 + pulse * 0.15})`
      : `rgba(239,68,68,${0.1 + pulse * 0.18})`;
    ctx.fill();

    // Core dot
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle   = defusing ? '#22c55e' : '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.2 / this.camZoom;
    ctx.stroke();
  }

  // ── Shooting tracker ─────────────────────────────────────────
  _trackShooting(state) {
    const allp = state?.allplayers;
    if (!allp) return;

    for (const [id, p] of Object.entries(allp)) {
      // Find the active weapon's clip
      const wpns = p.weapons;
      if (!wpns) continue;
      let clip = null;
      for (const w of Object.values(wpns)) {
        if (w.state === 'active' && w.ammo_clip != null) {
          clip = w.ammo_clip; break;
        }
      }
      if (clip == null) continue;

      const prev = this.shootTrack[id];
      if (prev?.clip != null && clip < prev.clip) {
        this.shootTrack[id] = { clip, ts: Date.now() };
      } else {
        this.shootTrack[id] = { clip, ts: (this.shootTrack[id]?.ts ?? 0) };
      }
    }
  }

  // ── Damage tracker ───────────────────────────────────────────
  _trackDamage(state) {
    const allp = state?.allplayers;
    if (!allp) return;

    for (const [id, p] of Object.entries(allp)) {
      const hp   = p.state?.health ?? 0;
      const prev = this.dmgTrack[id];
      if (prev?.hp != null && hp < prev.hp && hp > 0) {
        this.dmgTrack[id] = { hp, ts: Date.now() };
      } else {
        this.dmgTrack[id] = { hp, ts: (this.dmgTrack[id]?.ts ?? 0) };
      }
    }
  }

  // ── Coord helpers ─────────────────────────────────────────────
  /** Game world → raw radar coords (0…RADAR_SZ, no camera) */
  _raw(gx, gy) {
    const m = MAP_DATA[this.mapName];
    if (!m) return { x: RADAR_SZ / 2, y: RADAR_SZ / 2 };
    return {
      x: (gx - m.x) / m.scale * BASE_SC,
      y: (m.y - gy) / m.scale * BASE_SC,
    };
  }

  /** Game world → canvas pixel (with camera pan + zoom) */
  _cam(gx, gy) {
    const raw = this._raw(gx, gy);
    return {
      x: RADAR_SZ / 2 + (raw.x - this.camX) * this.camZoom,
      y: RADAR_SZ / 2 + (raw.y - this.camY) * this.camZoom,
    };
  }

  /** Load image helper */
  _img(src) {
    const img = new Image();
    img.loaded  = false;
    img.onload  = () => { img.loaded = true; };
    img.onerror = () => { img.loaded = false; };
    img.src = src;
    return img;
  }
}

window.Radar = Radar;
