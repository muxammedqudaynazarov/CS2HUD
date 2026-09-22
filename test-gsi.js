/**
 * CS2HUD — Fake GSI sender (test uchun)
 * CS2 o'rnatilmagan bo'lsa ham HUD'ni sinab ko'rish uchun ishlatiladi.
 *
 * Ishlatish:
 *   node test-gsi.js                      # default localhost:3000
 *   node test-gsi.js http://189.74.98.124:3000
 *
 *   Scenariylar:
 *   node test-gsi.js --scene bomb         # bomba ssenariyasi
 *   node test-gsi.js --scene defuse       # defuse ssenariyasi
 *   node test-gsi.js --scene halftime     # halftime
 */

const http    = require('http');
const https   = require('https');
const { URL } = require('url');

const target  = process.argv.find(a => a.startsWith('http')) || 'http://localhost:3000';
const scene   = (process.argv.find(a => a.startsWith('--scene='))?.split('=')[1])
             || (process.argv[process.argv.indexOf('--scene') + 1])
             || 'live';

const GSI_URL = target + '/gsi';
console.log(`\n🎮 CS2HUD Test GSI Sender`);
console.log(`   Yuborilmoqda: ${GSI_URL}`);
console.log(`   Ssenariy: ${scene}`);
console.log(`   To'xtatish: Ctrl+C\n`);

// ── Base state ───────────────────────────────────────────────
function makeState(opts = {}) {
  const { round = 8, ctScore = 5, tScore = 3,
          phase = 'live', bomb = null, bombCd = 40,
          mapPhase = 'live' } = opts;

  return {
    provider: { name: 'Counter-Strike: Global Offensive', appid: 730,
                version: 13840, steamid: '76561198046158574', timestamp: Math.floor(Date.now()/1000) },
    map: {
      mode: 'competitive', name: 'de_mirage', phase: mapPhase,
      round: round - 1,
      team_ct: { score: ctScore, name: 'Team Vitality' },
      team_t:  { score: tScore,  name: 'Natus Vincere' },
      round_wins: {
        1:'ct_win_defuse', 2:'t_win_bomb', 3:'ct_win_elimination',
        4:'t_win_elimination', 5:'ct_win_defuse', 6:'ct_win_elimination',
        7:'t_win_bomb', 8:'ct_win_elimination',
      },
    },
    round: {
      phase,
      ...(bomb ? { bomb } : {}),
    },
    player: {
      steamid: '76561198046158574', name: 'ZywOo',
      observer_slot: 1, team: 'CT', activity: 'playing',
      state: { health: 87, armor: 100, helmet: true, defusekit: false,
               money: 4250, flashed: 0, burning: 0, smoked: 0,
               round_kills: 1, round_killhs: 0, equip_value: 6700 },
      weapons: {
        weapon_0: { name:'weapon_knife',  type:'Knife',       state:'holstered' },
        weapon_1: { name:'weapon_deagle', type:'Pistol',      state:'holstered' },
        weapon_2: { name:'weapon_awp',    type:'SniperRifle', ammo_clip:7, ammo_reserve:20, state:'active' },
        weapon_3: { name:'weapon_hegrenade',    type:'Grenade', state:'holstered' },
        weapon_4: { name:'weapon_smokegrenade', type:'Grenade', state:'holstered' },
      },
      match_stats: { kills:12, assists:2, deaths:2, mvps:3, score:25 },
      position: '-800, -500, 0', forward: '0.8, 0.6, 0',
    },
    allplayers: {
      '76561198046158574': makePlayer('ZywOo', 1,'CT', 87,  100,true,  4250,'weapon_awp',    'SniperRifle',7,20,  12,2,2,  '-800,-500,0'),
      '76561198046158575': makePlayer('apEX',  2,'CT', 85,  100,false, 2000,'weapon_m4a1_silencer','Rifle',25,75, 7,4,4,  '-600,-400,0'),
      '76561198046158576': makePlayer('XTQZZZ',3,'CT', 40,   50,false,  800,'weapon_glock',  'Pistol',    20,60,  3,5,5,  '-900,-300,0'),
      '76561198046158577': makePlayer('misutaaa',4,'CT',100, 100,true,  3400,'weapon_sg556', 'Rifle',     30,90,  8,3,3, '-1100,-200,0'),
      '76561198046158578': makePlayer('Magisk', 5,'CT',  0,    0,false, 4700,'weapon_knife', 'Knife',     0, 0,    5,6,6,  '-700,-600,0'),
      '76561198046158579': makePlayer('s1mple', 6,'T', 100, 100,true,  6000,'weapon_awp',    'SniperRifle',10,30, 14,2,2, '200,500,0'),
      '76561198046158580': makePlayer('electronic',7,'T',75, 100,true,  3800,'weapon_ak47',  'Rifle',     28,90,  9,3,3,  '400,300,0'),
      '76561198046158581': makePlayer('b1t',    8,'T',   0,    0,false, 2200,'weapon_knife', 'Knife',     0, 0,    6,5,5,  '300,600,0'),
      '76561198046158582': makePlayer('Boombl4',9,'T',  60,  100,false, 1500,'weapon_ak47',  'Rifle',     20,60,  4,5,5,  '100,700,0'),
      '76561198046158583': makePlayer('perfecto',10,'T',100, 100,true,  4200,'weapon_ak47',  'Rifle',     30,90,  7,3,3,  '500,400,0'),
    },
    ...(bomb ? {
      bomb: {
        state: bomb === 'planted' ? 'planted' : 'defusing',
        countdown: String(bombCd.toFixed(1)),
        player: '76561198046158579',
        position: '200, 500, 50',
        site: 'B',
      }
    } : {}),
    grenades: {
      '101': { owner:'76561198046158580', position:'350,350,0', velocity:'0,0,0', lifetime:'8', type:'smoke' },
      '102': { owner:'76561198046158582', position:'150,600,0', velocity:'0,0,0', lifetime:'2', type:'inferno' },
    },
    auth: { token: 'cs2hud_2024' },
  };
}

function makePlayer(name, slot, team, hp, armor, helmet, money, wpnName, wpnType,
                   clip, reserve, kills, assists, deaths, pos) {
  const dead = hp <= 0;
  return {
    name, observer_slot: slot, team,
    state: { health: hp, armor: dead ? 0 : armor, helmet: !dead && helmet,
             defusekit: false, money, flashed: 0, burning: 0, smoked: 0 },
    weapons: dead ? {} : {
      weapon_0: { name: 'weapon_knife_t', type: 'Knife', state: 'holstered' },
      weapon_1: { name: wpnName, type: wpnType, ammo_clip: clip,
                  ammo_clip_max: clip, ammo_reserve: reserve, state: 'active' },
    },
    match_stats: { kills, assists, deaths, mvps: 0, score: kills * 2 + assists },
    position: pos,
    forward: team === 'CT' ? '0.8,0.6,0' : '-0.7,-0.7,0',
  };
}

// ── Scenarios ────────────────────────────────────────────────
function getStateForScene(scene, tick) {
  switch(scene) {
    case 'bomb': {
      const cd = Math.max(0, 40 - (tick * 0.5));
      return makeState({ bomb:'planted', bombCd: cd, phase:'live' });
    }
    case 'defuse': {
      const cd = Math.max(0, 10 - (tick * 0.5));
      return makeState({ bomb:'defusing', bombCd: cd, phase:'live' });
    }
    case 'halftime':
      return makeState({ phase:'live', mapPhase:'intermission', ctScore:12, tScore:3 });
    case 'buytime':
      return makeState({ phase:'freezetime', round:9 });
    default: // live
      return makeState({ phase:'live' });
  }
}

// ── HTTP sender ──────────────────────────────────────────────
function send(data) {
  const body = JSON.stringify(data);
  const u    = new URL(GSI_URL);
  const mod  = u.protocol === 'https:' ? https : http;

  const req = mod.request({
    hostname: u.hostname,
    port:     u.port || (u.protocol === 'https:' ? 443 : 80),
    path:     u.pathname,
    method:   'POST',
    headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
  }, res => {
    process.stdout.write(`\r[GSI] Yuborildi → ${res.statusCode}  tick:${tick.toString().padStart(4)}  scene:${scene}`);
  });

  req.on('error', e => process.stdout.write(`\r[GSI] Xato: ${e.message}`));
  req.write(body);
  req.end();
}

// ── Loop ─────────────────────────────────────────────────────
let tick = 0;
function loop() {
  send(getStateForScene(scene, tick++));
}

loop();
const interval = setInterval(loop, 200);  // CS2 sends ~200ms intervals

process.on('SIGINT', () => {
  clearInterval(interval);
  console.log('\n\n✓ To\'xtatildi.\n');
  process.exit(0);
});
