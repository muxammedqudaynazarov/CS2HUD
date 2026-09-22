/* ═══════════════════════════════════════════════════════
   CS2HUD v2.0 — Main HUD Logic
   ═══════════════════════════════════════════════════════ */
'use strict';

// ── State ─────────────────────────────────────────────────────
let isLive   = false;
let series   = null;
let prevBomb = null;
let radar    = null;

// ── DOM helpers ───────────────────────────────────────────────
const $ = id => document.getElementById(id);
const D = {
  hud:     $('hud'),    waiting: $('waiting'),
  ctName:  $('ct-name'), ctScore: $('ct-score'), ctFlag: $('ct-flag'), ctSideName: $('ct-side-name'),
  tName:   $('t-name'),  tScore:  $('t-score'),  tFlag:  $('t-flag'),  tSideName:  $('t-side-name'),
  phase:   $('phase-label'), mapName: $('map-name'), roundInfo: $('round-info'),
  seriesBar:  $('series-bar'),  roundWins: $('round-wins'),
  ctPlayers:  $('ct-players'),  tPlayers:  $('t-players'),
  obPanel:    $('observer-panel'),
  obsName:    $('obs-name'),    obsHpBar: $('obs-hpbar'),  obsHpVal: $('obs-hpval'),
  obsWpnIcon: $('obs-wpn-icon'), obsWpnName: $('obs-wpn-name'), obsAmmo: $('obs-ammo'),
  obsNades:   $('obs-nades'),   obsArmor:   $('obs-armor'), obsKit: $('obs-kit'),
  obsMoney:   $('obs-money'),
  bombPanel:  $('bomb-panel'),  bombState: $('bomb-state'), bombSite: $('bomb-site'),
  bombTime:   $('bomb-time'),   bombBar:   $('bomb-bar'),   bombIconWrap: $('bomb-icon-wrap'),
  flashCont:  $('flash-container'),
  radarCanvas: $('radar-canvas'),
};

// ── Init Radar ────────────────────────────────────────────────
radar = new Radar(D.radarCanvas);

// ── Socket ────────────────────────────────────────────────────
const socket = io({ transports: ['websocket'] });

socket.on('connect',    () => console.log('[HUD] connected'));
socket.on('disconnect', () => console.log('[HUD] disconnected'));

socket.on('gamestate', state => {
  if (!isLive) {
    isLive = true;
    D.waiting.style.display = 'none';
    D.hud.classList.remove('hidden');
  }
  renderHUD(state);
});

socket.on('series', data => {
  series = data;
  renderSeries();
});

// ── Master render ─────────────────────────────────────────────
function renderHUD(state) {
  renderTopBar(state);
  renderRoundWins(state);
  renderPlayers(state);
  renderBomb(state);
  renderObserver(state);
  renderRadar(state);
}

// ── TOP BAR ───────────────────────────────────────────────────
function renderTopBar(state) {
  const map = state.map || {};
  const rnd = state.round || {};
  const ct  = map.team_ct || {};
  const t   = map.team_t  || {};

  D.ctName.textContent = ct.name || 'COUNTER-TERRORIST';
  D.tName.textContent  = t.name  || 'TERRORIST';
  D.ctSideName.textContent = ct.name || 'CT';
  D.tSideName.textContent  = t.name  || 'T';
  D.ctScore.textContent = ct.score ?? 0;
  D.tScore.textContent  = t.score  ?? 0;

  if (ct.flag) { D.ctFlag.textContent = flagEmoji(ct.flag); }
  if (t.flag)  { D.tFlag.textContent  = flagEmoji(t.flag);  }

  const raw = map.name || '';
  D.mapName.textContent = raw.replace(/^(de_|cs_|ar_|gg_)/,'').toUpperCase() || '—';

  const rnum = (map.round ?? 0) + 1;
  D.roundInfo.textContent = `R ${rnum}`;

  const phase = rnd.phase || map.phase || '';
  D.phase.textContent = phaseLabel(phase);

  if (map.name) radar.loadMap(map.name);
}

function flagEmoji(code) {
  if (!code || code.length !== 2) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)));
}

function phaseLabel(p) {
  const M = { freezetime:'BUY PHASE', live:'LIVE', over:'ROUND OVER',
               warmup:'WARMUP', intermission:'HALFTIME', gameover:'GAME OVER' };
  return M[p] || (p || '—').toUpperCase();
}

// ── ROUND WINS ────────────────────────────────────────────────
function renderRoundWins(state) {
  const wins = state.map?.round_wins;
  if (!wins) { D.roundWins.innerHTML = ''; return; }

  const maxRound = (state.map?.round ?? 0) + 1;
  const half     = 12;
  const dots     = [];

  for (let i = 1; i < maxRound; i++) {
    const result = wins[i];
    if (!result) continue;
    const isCT    = result.startsWith('ct_');
    const isBomb  = result.includes('bomb');
    const isElim  = result.includes('elimination');
    const cls     = isCT
      ? (isBomb ? 'rw-ct-def' : 'rw-ct-elim')
      : (isBomb ? 'rw-t-bomb' : 'rw-t-elim');
    dots.push(`<div class="rw-dot ${cls}" title="R${i}: ${result}"></div>`);
    if (i === half) dots.push('<div class="rw-sep"></div>');
  }
  D.roundWins.innerHTML = dots.join('');
}

// ── SERIES ───────────────────────────────────────────────────
function renderSeries() {
  if (!series || !series.active || !series.maps.length) {
    D.seriesBar.classList.add('hidden');
    return;
  }
  D.seriesBar.classList.remove('hidden');

  const fmt  = series.format;
  const maps = series.maps;
  const html = [`<span class="series-label">${fmt}</span>`,
                `<span class="series-format">${series.team1.score}:${series.team2.score}</span>`];

  for (const m of maps) {
    const cls = m.winner === 'team1' ? 'won-ct' : m.winner === 'team2' ? 'won-t' : 'active';
    const score = m.winner
      ? `<span class="sm-score"><span class="s-ct">${m.team1Score}</span>:<span class="s-t">${m.team2Score}</span></span>`
      : '';
    html.push(`<div class="series-map ${cls}"><span class="sm-name">${esc(m.name||'?')}</span>${score}</div>`);
  }

  D.seriesBar.innerHTML = html.join('');
}

// ── PLAYER CARDS ─────────────────────────────────────────────
function renderPlayers(state) {
  const allp  = state.allplayers;
  if (!allp) return;
  const obsId = state.player?.steamid;

  const ct = [], t = [];
  for (const [id, p] of Object.entries(allp)) {
    const pl = { steamid: id, ...p };
    if (p.team === 'CT') ct.push(pl);
    else if (p.team === 'T') t.push(pl);
  }
  const bySlot = (a,b) => (a.observer_slot??99) - (b.observer_slot??99);
  ct.sort(bySlot); t.sort(bySlot);

  D.ctPlayers.innerHTML = ct.map(p => playerCard(p, 'ct', p.steamid === obsId)).join('');
  D.tPlayers.innerHTML  = t.map( p => playerCard(p, 't',  p.steamid === obsId)).join('');
}

function playerCard(player, side, isObs) {
  const s    = player.state || {};
  const st   = player.match_stats || {};
  const hp   = s.health ?? 0;
  const dead = hp <= 0;
  const wpn  = findActiveWeapon(player.weapons);
  const grenades = getGrenades(player.weapons);
  const hpC  = dead ? '#444' : hpColor(hp);
  const cls  = ['player-card', dead ? 'dead' : '', isObs ? 'observed' : ''].filter(Boolean).join(' ');

  // ammo
  let ammoHtml = '';
  if (wpn && wpn.ammo_clip != null && !dead)
    ammoHtml = `<span class="pc-ammo">${wpn.ammo_clip}/${wpn.ammo_reserve ?? '∞'}</span>`;

  // nades
  const nadesHtml = grenades.map(g =>
    `<div class="nade-dot" style="background:${g.color}" title="${g.title}">${g.label.substring(0,2)}</div>`
  ).join('');

  // armor
  let armorTxt = '';
  if (!dead && s.armor > 0) armorTxt = s.helmet ? '💎' : '🛡️';

  // kit
  const kitHtml = (!dead && s.defusekit && side === 'ct')
    ? `<span class="pc-kit" title="Defuse Kit">🔧</span>` : '';

  // money
  const moneyHtml = !dead
    ? `<span class="pc-money">$${(s.money ?? 0).toLocaleString()}</span>` : '';

  return `<div class="${cls}">
    <div class="pc-row1">
      <span class="pc-slot">${player.observer_slot ?? ''}</span>
      <span class="pc-name">${esc(player.name || 'Player')}</span>
      ${dead
        ? `<span class="pc-dead-mark">✕</span>`
        : `<span class="pc-hp-num" style="color:${hpC}">${hp}</span>`}
    </div>
    <div class="pc-hpbar"><div class="pc-hpfill" style="width:${dead?0:hp}%;background:${hpC}"></div></div>
    <div class="pc-row2">
      <div class="pc-wpn-icon">${dead ? '' : getWeaponIcon(wpn?.name)}</div>
      <span class="pc-wpn-name">${dead ? 'DEAD' : esc(getWeaponName(wpn?.name))}</span>
      ${ammoHtml}
    </div>
    <div class="pc-row3">
      <div class="pc-nades">${nadesHtml}</div>
    </div>
    <div class="pc-row4">
      <span class="pc-kd">K ${st.kills??0} · D ${st.deaths??0}</span>
      ${armorTxt ? `<span class="pc-armor">${armorTxt}</span>` : ''}
      ${kitHtml}
      ${moneyHtml}
    </div>
  </div>`;
}

// ── BOMB ─────────────────────────────────────────────────────
const BOMB_TOTAL   = 40;
const DEFUSE_TOTAL = 10;

function renderBomb(state) {
  const bomb = state.bomb || {};
  const rnd  = state.round || {};
  const st   = bomb.state || rnd.bomb || '';

  const planted  = st === 'planted';
  const defusing = st === 'defusing';
  const exploded = st === 'exploded';
  const defused  = st === 'defused';

  // Flash effects
  if (prevBomb !== st) {
    if (defused)  flash('defused');
    if (exploded) flash('explode');
    prevBomb = st;
  }

  if (!planted && !defusing) {
    D.bombPanel.classList.add('hidden');
    return;
  }

  D.bombPanel.classList.remove('hidden');

  const cd  = Math.max(0, parseFloat(bomb.countdown || 0));
  const max = defusing ? DEFUSE_TOTAL : BOMB_TOTAL;
  const pct = Math.min(100, (cd / max) * 100);

  const urgent = !defusing && cd < 10;
  const mode   = defusing ? 'defusing' : 'planted';

  D.bombState.textContent = defusing ? 'DEFUSING...' : `BOMB PLANTED`;
  D.bombState.className   = `bomb-state ${mode}`;
  D.bombSite.textContent  = bomb.site ? `SITE ${bomb.site}` : '';
  D.bombTime.textContent  = cd.toFixed(1) + 's';
  D.bombTime.className    = `bomb-time ${mode}${urgent ? ' urgent' : ''}`;
  D.bombBar.className     = `bomb-bar-fill ${mode}`;
  D.bombBar.style.width   = pct + '%';
  D.bombIconWrap.className = `bomb-icon-wrap ${mode}`;
  D.bombIconWrap.textContent = defusing ? '🔧' : '💣';
}

function flash(type) {
  const el = document.createElement('div');
  el.className = type === 'defused' ? 'flash-defused' : 'flash-explode';
  D.flashCont.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

// ── OBSERVER ─────────────────────────────────────────────────
function renderObserver(state) {
  const player = state.player;
  if (!player || !player.steamid) { D.obPanel.classList.add('hidden'); return; }

  const s     = player.state || {};
  const hp    = s.health ?? 0;
  const isCT  = player.team === 'CT';
  const wpn   = findActiveWeapon(player.weapons);
  const nades = getGrenades(player.weapons);

  D.obPanel.classList.remove('hidden');
  D.obPanel.className = `obs-${isCT ? 'ct' : 't'}`;
  D.obsName.textContent = esc(player.name || '—');

  // HP
  const hpPct = Math.max(0, Math.min(100, hp));
  D.obsHpBar.style.width      = hpPct + '%';
  D.obsHpBar.style.background = hpColor(hp);
  D.obsHpVal.textContent      = hp;
  D.obsHpVal.style.color      = hpColor(hp);

  // Weapon
  D.obsWpnIcon.innerHTML  = wpn ? getWeaponIconHTML(wpn.name) : '';
  D.obsWpnName.textContent = wpn ? esc(getWeaponName(wpn.name)) : '—';

  if (wpn?.ammo_clip != null) {
    D.obsAmmo.innerHTML =
      `<span class="am-clip">${wpn.ammo_clip}</span>`+
      `<span class="am-sep">/</span>`+
      `<span class="am-res">${wpn.ammo_reserve ?? '∞'}</span>`;
  } else { D.obsAmmo.innerHTML = ''; }

  // Grenades
  D.obsNades.innerHTML = nades.map(g =>
    `<div class="obs-nade" style="background:${g.color}" title="${g.title}">${g.label}</div>`
  ).join('');

  // Armor
  if (s.armor > 0) {
    D.obsArmor.innerHTML = `${s.helmet ? '💎' : '🛡️'} <span>${s.armor}</span>`;
  } else { D.obsArmor.innerHTML = ''; }

  // Kit
  if (isCT && s.defusekit) D.obsKit.classList.remove('hidden');
  else D.obsKit.classList.add('hidden');

  // Money
  D.obsMoney.textContent = '$' + (s.money ?? 0).toLocaleString();
}

// ── RADAR ─────────────────────────────────────────────────────
let radarAnimId = null;
function renderRadar(state) {
  if (radarAnimId) cancelAnimationFrame(radarAnimId);
  radarAnimId = requestAnimationFrame(() => radar.render(state));
}

// ── Helpers ───────────────────────────────────────────────────
function hpColor(hp) {
  if (hp > 60) return 'var(--hp-h)';
  if (hp > 30) return 'var(--hp-m)';
  return 'var(--hp-l)';
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
