/* ═══════════════════════════════════════════════════════
   CS2HUD — Weapon Data: Names · Icons · Types
   ═══════════════════════════════════════════════════════ */

// ── Display names ────────────────────────────────────────
const WEAPON_NAMES = {
  weapon_ak47:'AK-47', weapon_m4a1:'M4A4', weapon_m4a1_silencer:'M4A1-S',
  weapon_aug:'AUG', weapon_awp:'AWP', weapon_famas:'FAMAS',
  weapon_galilar:'Galil AR', weapon_sg556:'SG 553', weapon_scar20:'SCAR-20',
  weapon_g3sg1:'G3SG1', weapon_ssg08:'SSG 08',
  weapon_mp5sd:'MP5-SD', weapon_mp7:'MP7', weapon_mp9:'MP9',
  weapon_p90:'P90', weapon_bizon:'PP-Bizon', weapon_mac10:'MAC-10', weapon_ump45:'UMP-45',
  weapon_deagle:'Desert Eagle', weapon_elite:'Dual Berettas',
  weapon_fiveseven:'Five-SeveN', weapon_glock:'Glock-18',
  weapon_hkp2000:'P2000', weapon_p250:'P250', weapon_tec9:'Tec-9',
  weapon_usp_silencer:'USP-S', weapon_cz75a:'CZ75-Auto', weapon_revolver:'R8 Revolver',
  weapon_nova:'Nova', weapon_sawedoff:'Sawed-Off', weapon_mag7:'MAG-7',
  weapon_xm1014:'XM1014', weapon_m249:'M249', weapon_negev:'Negev',
  weapon_hegrenade:'HE Grenade', weapon_flashbang:'Flashbang',
  weapon_smokegrenade:'Smoke', weapon_molotov:'Molotov',
  weapon_incgrenade:'Incendiary', weapon_decoy:'Decoy',
  weapon_c4:'C4', weapon_knife:'Knife', weapon_knife_t:'Knife',
  weapon_knife_ct:'Knife', weapon_taser:'Zeus x27',
};

// ── Weapon categories ─────────────────────────────────────
const WEAPON_TYPE = {
  pistol:  ['weapon_glock','weapon_hkp2000','weapon_usp_silencer','weapon_p250',
            'weapon_fiveseven','weapon_tec9','weapon_cz75a','weapon_elite','weapon_revolver'],
  deagle:  ['weapon_deagle'],
  rifle:   ['weapon_m4a1','weapon_m4a1_silencer','weapon_aug','weapon_famas','weapon_galilar'],
  ak47:    ['weapon_ak47','weapon_sg556'],
  sniper:  ['weapon_awp','weapon_ssg08','weapon_scar20','weapon_g3sg1'],
  smg:     ['weapon_mp5sd','weapon_mp7','weapon_mp9','weapon_bizon','weapon_mac10','weapon_ump45'],
  p90:     ['weapon_p90'],
  heavy:   ['weapon_nova','weapon_sawedoff','weapon_mag7','weapon_xm1014','weapon_m249','weapon_negev'],
  knife:   ['weapon_knife','weapon_knife_t','weapon_knife_ct'],
  grenade: ['weapon_hegrenade','weapon_flashbang','weapon_smokegrenade',
            'weapon_molotov','weapon_incgrenade','weapon_decoy'],
  bomb:    ['weapon_c4'],
};

// ── Weapon type lookup ────────────────────────────────────
const WEAPON_TYPE_MAP = {};
for (const [type, names] of Object.entries(WEAPON_TYPE))
  for (const n of names) WEAPON_TYPE_MAP[n] = type;

// ── SVG Weapon icons (64×20 viewBox, currentColor fill) ──
const WPN_SVG = {
  pistol: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="2" y="7" width="28" height="8" rx="2.5"/>
    <rect x="30" y="8.5" width="18" height="5" rx="2.5"/>
    <rect x="8" y="15" width="14" height="5" rx="2"/>
  </svg>`,
  deagle: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="2" y="5" width="32" height="11" rx="3"/>
    <rect x="34" y="7" width="24" height="7" rx="3.5"/>
    <rect x="10" y="16" width="18" height="4" rx="2"/>
    <rect x="2" y="5" width="10" height="5" rx="2" opacity="0.7"/>
  </svg>`,
  ak47: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="8" width="46" height="5" rx="2"/>
    <polygon points="22,13 28,20 20,20 14,13"/>
    <rect x="46" y="9" width="18" height="3" rx="1.5"/>
    <rect x="0" y="7" width="12" height="7" rx="2.5"/>
  </svg>`,
  rifle: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="8" width="44" height="5" rx="2"/>
    <rect x="22" y="13" width="10" height="6" rx="1.5"/>
    <rect x="44" y="9" width="20" height="3" rx="1.5"/>
    <rect x="0" y="7" width="12" height="7" rx="2.5"/>
    <rect x="42" y="9" width="4" height="3" rx="0" opacity="0.6"/>
  </svg>`,
  sniper: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="8" width="34" height="5" rx="2"/>
    <rect x="12" y="3" width="16" height="6" rx="1.5"/>
    <rect x="34" y="9" width="30" height="3" rx="1.5"/>
    <rect x="0" y="7" width="12" height="7" rx="2.5"/>
    <rect x="22" y="13" width="8" height="5" rx="1.5"/>
  </svg>`,
  smg: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="8" width="34" height="5" rx="2"/>
    <rect x="18" y="13" width="8" height="6" rx="1.5"/>
    <rect x="34" y="9" width="18" height="3" rx="1.5"/>
    <rect x="0" y="7" width="10" height="7" rx="2"/>
  </svg>`,
  p90: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="9" width="48" height="7" rx="3"/>
    <rect x="6" y="2" width="28" height="8" rx="2"/>
    <rect x="48" y="10" width="16" height="4" rx="2"/>
  </svg>`,
  heavy: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="7" width="36" height="7" rx="3"/>
    <rect x="36" y="8.5" width="28" height="4" rx="2"/>
    <rect x="0" y="6" width="14" height="9" rx="3"/>
  </svg>`,
  knife: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="0" y="8.5" width="18" height="4" rx="2"/>
    <polygon points="18,7 62,9.5 62,10.5 18,13"/>
    <rect x="0" y="7" width="10" height="7" rx="1.5"/>
  </svg>`,
  bomb: `<svg viewBox="0 0 64 20" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
    <rect x="6" y="3" width="36" height="14" rx="3"/>
    <rect x="42" y="6" width="18" height="3" rx="1.5"/>
    <rect x="42" y="12" width="12" height="3" rx="1.5"/>
    <rect x="14" y="10" width="16" height="1.5" rx="0.75" opacity="0.5"/>
  </svg>`,
};

// ── Grenade badges ────────────────────────────────────────
const NADE_DATA = {
  weapon_hegrenade:    { label:'HE',  color:'#e85420', title:'HE Grenade' },
  weapon_flashbang:    { label:'FL',  color:'#d4b84a', title:'Flashbang'  },
  weapon_smokegrenade: { label:'SM',  color:'#7a8f9c', title:'Smoke'      },
  weapon_molotov:      { label:'MO',  color:'#d44214', title:'Molotov'    },
  weapon_incgrenade:   { label:'INC', color:'#d44214', title:'Incendiary' },
  weapon_decoy:        { label:'DC',  color:'#607080', title:'Decoy'      },
};

// ── Public helpers ────────────────────────────────────────
function getWeaponName(internal) {
  if (!internal) return '—';
  return WEAPON_NAMES[internal]
    || internal.replace('weapon_','').replace(/_/g,' ').toUpperCase();
}

function getWeaponIcon(internal) {
  const type = WEAPON_TYPE_MAP[internal] || 'pistol';
  return WPN_SVG[type] || WPN_SVG.pistol;
}

function getWeaponIconHTML(internal, cls = '') {
  const type  = WEAPON_TYPE_MAP[internal] || 'pistol';
  const svg   = WPN_SVG[type] || WPN_SVG.pistol;
  return `<span class="wpn-icon wpn-${type} ${cls}">${svg}</span>`;
}

function findActiveWeapon(weapons) {
  if (!weapons) return null;
  for (const w of Object.values(weapons)) if (w.state === 'active') return w;
  const prio = ['SniperRifle','Rifle','Submachine Gun','Shotgun','Machine Gun','Pistol'];
  for (const t of prio) for (const w of Object.values(weapons)) if (w.type === t) return w;
  return null;
}

function getGrenades(weapons) {
  if (!weapons) return [];
  return Object.values(weapons)
    .filter(w => NADE_DATA[w.name])
    .map(w => ({ ...NADE_DATA[w.name], internal: w.name }));
}

function getGrenadeBadge(internal) {
  return NADE_DATA[internal] || null;
}
