/**
 * CS2HUD v3.1 — Fixed version
 * Fixes: timer red<15s, centered banner, radar, separators,
 *        no-obs-bg, dead styling, bugs
 */
'use strict';

// ── Timer tracking ─────────────────────────────────────
const PHASE_DUR = { freezetime: 15, live: 115 };
let phaseTimerStart = null;
let lastPhase       = null;
let timerInterval   = null;
let timerRemaining  = 0;

// ── Bomb tracking ──────────────────────────────────────
let prevBombState = null;

// ── Radar ─────────────────────────────────────────────
let radar = null;

// ── DOM ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const D = {
  hud:$('hud'), waiting:$('waiting'),
  tournamentName:$('tournament-name'),
  ctName:$('ct-name'), ctScore:$('ct-score'),
  tName:$('t-name'),   tScore:$('t-score'),
  timerDisp:$('timer-display'), roundLabel:$('round-label'),
  aliveCt:$('alive-ct'), aliveT:$('alive-t'),
  bombPanel:$('bomb-panel'), bombIconEl:$('bomb-icon-el'),
  bombStateTxt:$('bomb-state-txt'), bombSiteTxt:$('bomb-site-txt'),
  bombBarFill:$('bomb-bar-fill'), bombSecs:$('bomb-secs'),
  ctPlayers:$('ct-players'), tPlayers:$('t-players'),
  obsPanel:$('observer-panel'),
  obsName:$('obs-name'), obsHpbar:$('obs-hpbar'), obsHpval:$('obs-hpval'),
  obsWpnIcon:$('obs-wpn-icon'), obsWpnName:$('obs-wpn-name'), obsWpnAmmo:$('obs-wpn-ammo'),
  obsNades:$('obs-nades'), obsArmorVal:$('obs-armor-val'), obsMoneyVal:$('obs-money-val'),
  flashCont:$('flash-container'),
  radarCanvas:$('radar-canvas'),
};

// ── Init radar ────────────────────────────────────────
if (D.radarCanvas && window.Radar) {
  radar = new Radar(D.radarCanvas);
}

// ── Socket ────────────────────────────────────────────
let isLive = false;
const socket = io({ transports:['websocket'] });

socket.on('connect', () => console.log('[HUD] connected'));

socket.on('tournament', ({ name }) => {
  D.tournamentName.textContent = name || 'TOURNAMENT NAME';
});

socket.on('gamestate', state => {
  if (!isLive) {
    isLive = true;
    D.waiting.style.display = 'none';
    D.hud.classList.remove('hidden');
  }
  renderHUD(state);
});

// ── Master render ─────────────────────────────────────
function renderHUD(state) {
  renderScorebar(state);
  renderAlive(state);
  renderBomb(state);
  renderPlayers(state);
  renderObserver(state);
  syncTimer(state);
  renderRadar(state);
}

// ── SCOREBAR ──────────────────────────────────────────
function renderScorebar(state) {
  const map = state.map || {};
  const ct  = map.team_ct || {};
  const t   = map.team_t  || {};
  D.ctName.textContent  = ct.name || 'COUNTER-TERRORIST';
  D.tName.textContent   = t.name  || 'TERRORIST';
  D.ctScore.textContent = ct.score ?? 0;
  D.tScore.textContent  = t.score  ?? 0;
  const rnd = (map.round ?? 0) + 1;
  D.roundLabel.textContent = `Round ${rnd}/24`;
}

// ── ALIVE COUNT ───────────────────────────────────────
function renderAlive(state) {
  const all = state.allplayers;
  if (!all) return;
  let ct = 0, t = 0;
  for (const p of Object.values(all)) {
    if ((p.state?.health ?? 0) > 0) {
      if (p.team === 'CT') ct++;
      else if (p.team === 'T') t++;
    }
  }
  D.aliveCt.textContent = ct;
  D.aliveT.textContent  = t;
}

// ── FIX 1: TIMER — red when < 15s ────────────────────
function syncTimer(state) {
  const phase = state.round?.phase || state.map?.phase || '';
  if (phase !== lastPhase) {
    lastPhase = phase;
    if (PHASE_DUR[phase]) {
      phaseTimerStart = Date.now();
      startTimerTick(phase);
    } else {
      stopTimerTick();
      D.timerDisp.textContent = phaseLabel(phase);
      D.timerDisp.className   = 'phase-over';
    }
  }
}

function phaseLabel(p) {
  const M = { warmup:'WARMUP', over:'END', gameover:'END', intermission:'HALF' };
  return M[p] || 'LIVE';
}

function startTimerTick(phase) {
  stopTimerTick();
  const dur = PHASE_DUR[phase];
  timerInterval = setInterval(() => {
    const elapsed    = (Date.now() - phaseTimerStart) / 1000;
    const remaining  = Math.max(0, dur - elapsed);
    timerRemaining   = remaining;
    const m = Math.floor(remaining / 60);
    const s = Math.floor(remaining % 60);
    D.timerDisp.textContent = `${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    // FIX 1: Timer class based on phase and remaining time
    if (remaining < 15 && remaining > 0) {
      D.timerDisp.className = 'timer-urgent';
    } else if (phase === 'freezetime') {
      D.timerDisp.className = 'phase-freeze';
    } else {
      D.timerDisp.className = '';
    }

    if (remaining <= 0) stopTimerTick();
  }, 200);
}

function stopTimerTick() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}

// ── BOMB ──────────────────────────────────────────────
const BOMB_TOTAL   = 40;
const DEFUSE_TOTAL = 10;

function renderBomb(state) {
  const bomb = state.bomb  || {};
  const rnd  = state.round || {};
  const st   = bomb.state  || rnd.bomb || '';
  const isPlanted  = st === 'planted';
  const isDefusing = st === 'defusing';

  if (prevBombState !== st) {
    if (st === 'defused')  flash('defused');
    if (st === 'exploded') flash('explode');
    prevBombState = st;
  }

  if (!isPlanted && !isDefusing) {
    D.bombPanel.classList.add('hidden');
    return;
  }

  D.bombPanel.classList.remove('hidden');
  const cd  = Math.max(0, parseFloat(bomb.countdown || 0));
  const max = isDefusing ? DEFUSE_TOTAL : BOMB_TOTAL;
  const pct = Math.min(100, (cd / max) * 100);

  D.bombIconEl.textContent   = isDefusing ? '🔧' : '💣';
  D.bombStateTxt.textContent = isDefusing ? 'DEFUSING...' : 'BOMB PLANTED';
  D.bombSiteTxt.textContent  = bomb.site ? `SITE ${bomb.site}` : '';
  D.bombBarFill.style.width  = pct + '%';
  D.bombBarFill.className    = 'bomb-bar-fill' + (isDefusing ? ' defusing' : '');
  D.bombSecs.textContent     = cd.toFixed(1) + 's';
  D.bombSecs.className       = 'bomb-secs'
    + (isDefusing ? ' defusing' : '')
    + (cd < 10 && !isDefusing ? ' urgent' : '');
}

// ── FIX 8: PLAYERS — bug: ICON_MAP must come from weapons.js ─
function renderPlayers(state) {
  const all   = state.allplayers;
  if (!all) return;
  const obsId = state.player?.steamid;
  const ct = [], t = [];
  for (const [id, p] of Object.entries(all)) {
    if (p.team === 'CT')      ct.push({ id, ...p });
    else if (p.team === 'T')  t.push({ id, ...p });
  }
  const bySlot = (a,b) => (a.observer_slot ?? 99) - (b.observer_slot ?? 99);
  ct.sort(bySlot); t.sort(bySlot);
  D.ctPlayers.innerHTML = ct.map(p => playerCard(p, p.id === obsId)).join('');
  D.tPlayers.innerHTML  = t.map( p => playerCard(p, p.id === obsId)).join('');
}

function playerCard(p, isObs) {
  const s    = p.state || {};
  const st   = p.match_stats || {};
  const hp   = s.health ?? 0;
  const dead = hp <= 0;
  const wpn  = findActiveWeapon(p.weapons);
  const nads = getGrenades(p.weapons);
  const hpC  = dead ? '#333' : hpColor(hp);

  const cls = ['pc', dead ? 'is-dead' : '', isObs ? 'is-obs' : ''].filter(Boolean).join(' ');

  // Weapon icon via CSS mask
  const iconFile = wpn ? (ICON_MAP[wpn.name] || null) : null;
  const iconHtml = iconFile
    ? `<span class="wi" style="width:100%;height:100%;-webkit-mask-image:url('/icons/${iconFile}.svg');mask-image:url('/icons/${iconFile}.svg')"></span>`
    : '';

  // Ammo
  const ammoStr = (!dead && wpn?.ammo_clip != null)
    ? `<span class="pc-ammo">${wpn.ammo_clip}/${wpn.ammo_reserve ?? '∞'}</span>` : '';

  // Grenades
  const nadesHtml = nads.map(g =>
    `<div class="nd" style="background:${g.color}" title="${g.title}">${g.label.slice(0,2)}</div>`
  ).join('');

  // Armor icon
  const armorIcon = (!dead && s.armor > 0) ? (s.helmet ? '💎' : '🛡️') : '';
  const kitIcon   = (!dead && s.defusekit) ? '<span class="pc-kit">🔧</span>' : '';

  if (dead) {
    return `<div class="${cls}">
      <div class="pc-r1">
        <span class="pc-slot">${p.observer_slot ?? ''}</span>
        <span class="pc-name">${esc(p.name || '')}</span>
        <span class="pc-hp" style="color:#333">✕</span>
      </div>
      <div class="pc-hpbar"><div class="pc-hpfill" style="width:0%"></div></div>
      <div class="pc-dead-label">DEAD</div>
      <div class="pc-r4">
        <span class="pc-kd">K ${st.kills ?? 0} · D ${st.deaths ?? 0}</span>
      </div>
    </div>`;
  }

  return `<div class="${cls}">
    <div class="pc-r1">
      <span class="pc-slot">${p.observer_slot ?? ''}</span>
      <span class="pc-name">${esc(p.name || '')}</span>
      <span class="pc-hp" style="color:${hpC}">${hp}</span>
    </div>
    <div class="pc-hpbar">
      <div class="pc-hpfill" style="width:${hp}%;background:${hpC}"></div>
    </div>
    <div class="pc-r2">
      <div class="pc-wi">${iconHtml}</div>
      <span class="pc-wname">${esc(getWeaponName(wpn?.name))}</span>
      ${ammoStr}
    </div>
    <div class="pc-r3"><div class="pc-nades">${nadesHtml}</div></div>
    <div class="pc-r4">
      <span class="pc-kd">K ${st.kills ?? 0} · D ${st.deaths ?? 0}</span>
      ${armorIcon ? `<span class="pc-armor">${armorIcon}</span>` : ''}
      ${kitIcon}
      <span class="pc-money">$${(s.money ?? 0).toLocaleString()}</span>
    </div>
  </div>`;
}

// ── OBSERVER ──────────────────────────────────────────
function renderObserver(state) {
  const pl = state.player;
  // FIX 8: properly check if player is in-game
  if (!pl || !pl.steamid || pl.activity === 'menu') {
    D.obsPanel.classList.add('hidden');
    return;
  }
  const s    = pl.state || {};
  const hp   = s.health ?? 0;
  const isCT = pl.team === 'CT';
  const wpn  = findActiveWeapon(pl.weapons);
  const nads = getGrenades(pl.weapons);

  D.obsPanel.classList.remove('hidden');
  // FIX 8: set class correctly for border color
  D.obsPanel.className = isCT ? 'obs-ct' : 'obs-t';

  D.obsName.textContent = esc(pl.name || '—');
  D.obsHpbar.style.width      = Math.max(0, Math.min(100, hp)) + '%';
  D.obsHpbar.style.background = hpColor(hp);
  D.obsHpval.textContent      = hp;
  D.obsHpval.style.color      = hpColor(hp);

  // Weapon
  D.obsWpnName.textContent = getWeaponName(wpn?.name);
  const iconFile = wpn ? (ICON_MAP[wpn.name] || null) : null;
  if (iconFile) {
    const clr = isCT ? 'var(--ct)' : 'var(--t)';
    D.obsWpnIcon.innerHTML =
      `<span class="wi" style="width:52px;height:16px;color:${clr};` +
      `-webkit-mask-image:url('/icons/${iconFile}.svg');mask-image:url('/icons/${iconFile}.svg')"></span>`;
  } else {
    D.obsWpnIcon.innerHTML = '';
  }

  if (wpn?.ammo_clip != null) {
    D.obsWpnAmmo.innerHTML =
      `<span style="color:#fff;font-weight:700">${wpn.ammo_clip}</span>` +
      `<span style="color:var(--muted)"> / ${wpn.ammo_reserve ?? '∞'}</span>`;
  } else {
    D.obsWpnAmmo.innerHTML = '';
  }

  // Grenades
  D.obsNades.innerHTML = nads.map(g =>
    `<div class="obs-nd" style="background:${g.color}" title="${g.title}">${g.label}</div>`
  ).join('');

  // Armor + kit + money
  let armorStr = s.armor > 0 ? `${s.helmet ? '💎' : '🛡️'} ${s.armor}` : '';
  if (isCT && s.defusekit) armorStr += ' 🔧';
  D.obsArmorVal.textContent = armorStr;
  D.obsMoneyVal.textContent = '$' + (s.money ?? 0).toLocaleString();
}

// ── FIX 3: RADAR ──────────────────────────────────────
function renderRadar(state) {
  if (!radar) return;
  const mapName = state.map?.name;
  if (mapName) radar.loadMap(mapName);
  radar.render(state);
}

// ── Flash ─────────────────────────────────────────────
function flash(type) {
  const el = document.createElement('div');
  el.className = type === 'defused' ? 'flash-defused' : 'flash-explode';
  D.flashCont.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── Helpers ───────────────────────────────────────────
function hpColor(hp) {
  return hp > 60 ? 'var(--hp-h)' : hp > 30 ? 'var(--hp-m)' : 'var(--hp-l)';
}
function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
