/**
 * CS2HUD — Client-Side HUD Logic
 * ─────────────────────────────────────────────────────────────────
 * Connects to the server via Socket.io, receives live CS2 GSI data,
 * and renders all HUD components in real time.
 * ─────────────────────────────────────────────────────────────────
 *
 * Render pipeline:
 *   socket 'gamestate' event
 *     → updateHUD(state)
 *         → renderTopBar(state)    — scores, map, phase
 *         → renderBomb(state)      — bomb timer bar
 *         → renderPlayers(state)   — 10 player cards
 *         → renderObserver(state)  — detail panel for current POV
 */

'use strict';

// ─────────────────────────────────────────────────────────────────
//  State
// ─────────────────────────────────────────────────────────────────
let isLive = false;

// ─────────────────────────────────────────────────────────────────
//  DOM references  (cached once on load)
// ─────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

const D = {
  hud:          $('hud'),
  waiting:      $('waiting'),
  // Top bar
  ctName:       $('ct-name'),
  ctScore:      $('ct-score'),
  tName:        $('t-name'),
  tScore:       $('t-score'),
  phaseLabel:   $('phase-label'),
  mapName:      $('map-name'),
  roundDisplay: $('round-display'),
  // Bomb
  bombRow:      $('bomb-row'),
  bombSite:     $('bomb-site-label'),
  bombBar:      $('bomb-bar-fill'),
  bombSecs:     $('bomb-secs'),
  bombIcon:     $('bomb-icon'),
  // Observer
  obsPanel:     $('observer-panel'),
  obsName:      $('obs-name'),
  obsHealthBar: $('obs-health-bar'),
  obsHealthNum: $('obs-health-num'),
  obsWeapon:    $('obs-weapon'),
  obsAmmo:      $('obs-ammo'),
  obsArmorIcon: $('obs-armor-icon'),
  obsArmorVal:  $('obs-armor-val'),
  obsMoney:     $('obs-money'),
  obsGrenades:  $('obs-grenades'),
  // Players
  ctPlayers:    $('ct-players'),
  tPlayers:     $('t-players'),
};

// ─────────────────────────────────────────────────────────────────
//  Socket.io connection
// ─────────────────────────────────────────────────────────────────
const socket = io({ transports: ['websocket'] });

socket.on('connect', () => {
  console.log('[CS2HUD] Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('[CS2HUD] Socket disconnected');
});

socket.on('gamestate', (state) => {
  // First packet received: show the HUD
  if (!isLive) {
    isLive = true;
    D.waiting.style.display = 'none';
    D.hud.classList.remove('hidden');
    console.log('[CS2HUD] Live data received — HUD active');
  }
  updateHUD(state);
});

// ─────────────────────────────────────────────────────────────────
//  Master render function
// ─────────────────────────────────────────────────────────────────
function updateHUD(state) {
  renderTopBar(state);
  renderBomb(state);
  renderPlayers(state);
  renderObserver(state);
}

// ─────────────────────────────────────────────────────────────────
//  TOP BAR  (team names, scores, map, phase)
// ─────────────────────────────────────────────────────────────────
function renderTopBar(state) {
  const map   = state.map   || {};
  const round = state.round || {};

  // Team data
  const teamCT = map.team_ct || {};
  const teamT  = map.team_t  || {};

  D.ctName.textContent  = teamCT.name || 'COUNTER-TERRORIST';
  D.ctScore.textContent = teamCT.score ?? 0;
  D.tName.textContent   = teamT.name  || 'TERRORIST';
  D.tScore.textContent  = teamT.score ?? 0;

  // Map name (strip de_ / cs_ prefix)
  const rawMap = map.name || '';
  D.mapName.textContent = rawMap
    .replace(/^(de_|cs_|ar_|gg_|fy_)/, '')
    .toUpperCase() || '—';

  // Round number (map.round is 0-indexed in CS2 GSI)
  const roundNum = (map.round ?? 0) + 1;
  const maxRounds = 24; // Adjust if overtime
  D.roundDisplay.textContent = `R ${roundNum}`;

  // Phase label
  const phase = round.phase || map.phase || '';
  D.phaseLabel.textContent = formatPhase(phase);
}

/** Convert GSI phase string to a human-readable label */
function formatPhase(phase) {
  switch (phase) {
    case 'freezetime':    return 'BUY PHASE';
    case 'live':          return 'LIVE';
    case 'over':          return 'ROUND OVER';
    case 'warmup':        return 'WARMUP';
    case 'intermission':  return 'HALFTIME';
    case 'gameover':      return 'GAME OVER';
    default:              return (phase || '—').toUpperCase();
  }
}

// ─────────────────────────────────────────────────────────────────
//  BOMB
// ─────────────────────────────────────────────────────────────────
const BOMB_TOTAL = 40;    // seconds (CS2 default)
const DEFUSE_TOTAL = 10;  // seconds (no kit); 5 with kit

function renderBomb(state) {
  const bomb  = state.bomb  || {};
  const round = state.round || {};

  const bombState = bomb.state || round.bomb || '';
  const isPlanted  = bombState === 'planted';
  const isDefusing = bombState === 'defusing';

  if (!isPlanted && !isDefusing) {
    D.bombRow.classList.add('hidden');
    return;
  }

  D.bombRow.classList.remove('hidden');

  // Site
  D.bombSite.textContent = bomb.site ? bomb.site : '';

  // Countdown value from GSI
  const cd  = Math.max(0, parseFloat(bomb.countdown || 0));
  const max = isDefusing ? DEFUSE_TOTAL : BOMB_TOTAL;
  const pct = (cd / max) * 100;

  D.bombSecs.textContent = cd.toFixed(1) + 's';
  D.bombBar.style.width  = Math.min(100, Math.max(0, pct)) + '%';

  if (isDefusing) {
    D.bombBar.style.background = 'var(--bomb-defuse)';
    D.bombSecs.style.color     = 'var(--bomb-defuse)';
    D.bombSite.style.color     = 'var(--bomb-defuse)';
    D.bombIcon.textContent     = '🔧';
  } else {
    // Urgent red when < 10s
    const urgent = cd < 10;
    D.bombBar.style.background = urgent ? '#dc2626' : 'var(--bomb-active)';
    D.bombSecs.style.color     = urgent ? '#ef4444' : 'var(--bomb-active)';
    D.bombSite.style.color     = 'var(--bomb-active)';
    D.bombIcon.textContent     = '💣';
  }
}

// ─────────────────────────────────────────────────────────────────
//  PLAYER PANELS
// ─────────────────────────────────────────────────────────────────
function renderPlayers(state) {
  const allplayers = state.allplayers;
  if (!allplayers) return;

  // Observed player's steamid (for highlighting)
  const observedId = state.player?.steamid || null;

  const ct = [];
  const t  = [];

  for (const [steamid, data] of Object.entries(allplayers)) {
    const p = { steamid, ...data };
    if (p.team === 'CT') ct.push(p);
    else if (p.team === 'T') t.push(p);
  }

  // Sort by observer slot (1-10)
  const bySlot = (a, b) => (a.observer_slot ?? 99) - (b.observer_slot ?? 99);
  ct.sort(bySlot);
  t.sort(bySlot);

  D.ctPlayers.innerHTML = ct.map(p => buildCard(p, 'ct', p.steamid === observedId)).join('');
  D.tPlayers.innerHTML  = t.map( p => buildCard(p, 't',  p.steamid === observedId)).join('');
}

/** Build HTML string for a single player card */
function buildCard(player, side, isObserved) {
  const state  = player.state  || {};
  const stats  = player.match_stats || {};
  const hp     = state.health ?? 0;
  const isDead = hp <= 0;

  // Weapon
  const activeWpn  = findActiveWeapon(player.weapons);
  const wpnDisplay = activeWpn ? getWeaponName(activeWpn.name) : '';

  // HP color
  const hpColor = isDead ? 'var(--hp-dead)' : hpToColor(hp);

  // CSS classes
  const classes = [
    'player-card',
    isDead    ? 'is-dead'     : '',
    isObserved ? 'is-observed' : '',
  ].filter(Boolean).join(' ');

  // HP bar fill width
  const hpPct = isDead ? 0 : hp;

  // Armor indicator
  let armorStr = '';
  if (!isDead && state.armor > 0) {
    armorStr = state.helmet ? '💎' : '🛡️';
  }

  return /* html */`
    <div class="${classes}" data-steamid="${esc(player.steamid)}">
      <div class="pc-header">
        <span class="pc-slot">${player.observer_slot ?? ''}</span>
        <span class="pc-name">${esc(player.name || 'Player')}</span>
        <span class="pc-hp-val" style="color:${hpColor}">${isDead ? '✕' : hp}</span>
      </div>
      <div class="pc-hp-bar">
        <div class="pc-hp-fill" style="width:${hpPct}%; background:${hpColor}"></div>
      </div>
      <div class="pc-weapon">${isDead ? 'DEAD' : esc(wpnDisplay)}</div>
      <div class="pc-stats">
        <span class="pc-kd">K ${stats.kills ?? 0} / D ${stats.deaths ?? 0}</span>
        ${armorStr ? `<span class="pc-armor">${armorStr}</span>` : ''}
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────────────
//  OBSERVER DETAIL PANEL
// ─────────────────────────────────────────────────────────────────
function renderObserver(state) {
  const player = state.player;

  // Hide if no player or not in-game
  if (!player || !player.steamid || player.activity === 'menu') {
    D.obsPanel.classList.add('hidden');
    return;
  }

  const s    = player.state        || {};
  const stats = player.match_stats || {};
  const hp   = s.health ?? 0;

  D.obsPanel.classList.remove('hidden');

  // Border accent by team side
  const isCT = player.team === 'CT';
  D.obsPanel.style.borderTopColor = isCT ? 'var(--ct)' : 'var(--t)';

  // Name
  D.obsName.textContent = player.name || '—';

  // HP bar
  const hpPct = Math.max(0, Math.min(100, hp));
  D.obsHealthBar.style.width      = hpPct + '%';
  D.obsHealthBar.style.background = hpToColor(hp);
  D.obsHealthNum.textContent      = hp;

  // Active weapon + ammo
  const wpn = findActiveWeapon(player.weapons);
  D.obsWeapon.textContent = wpn ? getWeaponName(wpn.name) : '—';
  if (wpn && wpn.ammo_clip != null) {
    D.obsAmmo.textContent = `${wpn.ammo_clip} / ${wpn.ammo_reserve ?? '∞'}`;
  } else {
    D.obsAmmo.textContent = '';
  }

  // Armor
  if (s.armor > 0) {
    D.obsArmorIcon.textContent = s.helmet ? '💎' : '🛡️';
    D.obsArmorVal.textContent  = s.armor;
  } else {
    D.obsArmorIcon.textContent = '—';
    D.obsArmorVal.textContent  = '';
  }

  // Money
  D.obsMoney.textContent = '$' + (s.money ?? 0).toLocaleString();

  // Grenades
  const grenades = findGrenades(player.weapons);
  D.obsGrenades.innerHTML = grenades.length
    ? grenades.map(g => `<span class="gren-badge">${esc(g)}</span>`).join('')
    : '';
}

// ─────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────

/** Find the currently active weapon from GSI weapons object */
function findActiveWeapon(weapons) {
  if (!weapons) return null;
  for (const w of Object.values(weapons)) {
    if (w.state === 'active') return w;
  }
  // Fallback: return best available weapon
  const priority = ['SniperRifle', 'Rifle', 'Submachine Gun',
                    'Shotgun', 'Machine Gun', 'Pistol'];
  for (const type of priority) {
    for (const w of Object.values(weapons)) {
      if (w.type === type) return w;
    }
  }
  return null;
}

/** Collect carried grenades and return their badge labels */
function findGrenades(weapons) {
  if (!weapons) return [];
  const result = [];
  for (const w of Object.values(weapons)) {
    const badge = getGrenadeBadge(w.name);
    if (badge) result.push(badge);
  }
  return result;
}

/** Map HP value (0-100) to a CSS color string */
function hpToColor(hp) {
  if (hp > 60) return 'var(--hp-high)';
  if (hp > 30) return 'var(--hp-mid)';
  return 'var(--hp-low)';
}

/** Escape HTML special characters to prevent XSS from player names */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
