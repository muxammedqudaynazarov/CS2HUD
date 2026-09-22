/* ═══════════════════════════════════════════════════════
   CS2HUD — Weapon Data: Names · Icons (real SVG files)
   Icons: /icons/weapon_*.svg  (55 real CS:GO/CS2 icons)
   ═══════════════════════════════════════════════════════ */

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

// Internal name → SVG filename in /icons/
const ICON_MAP = {
  weapon_ak47:'weapon_ak47', weapon_m4a1:'weapon_m4a1',
  weapon_m4a1_silencer:'weapon_m4a1_silencer', weapon_aug:'weapon_aug',
  weapon_awp:'weapon_awp', weapon_famas:'weapon_famas',
  weapon_galilar:'weapon_galilar', weapon_sg556:'weapon_sg556',
  weapon_scar20:'weapon_scar20', weapon_g3sg1:'weapon_g3sg1',
  weapon_ssg08:'weapon_ssg08',
  weapon_mp5sd:'weapon_mp9', weapon_mp7:'weapon_mp7', weapon_mp9:'weapon_mp9',
  weapon_bizon:'weapon_bizon', weapon_mac10:'weapon_mac10',
  weapon_ump45:'weapon_ump45', weapon_p90:'weapon_p90',
  weapon_deagle:'weapon_deagle', weapon_elite:'weapon_elite',
  weapon_fiveseven:'weapon_fiveseven', weapon_glock:'weapon_glock',
  weapon_hkp2000:'weapon_hkp2000', weapon_p250:'weapon_p250',
  weapon_tec9:'weapon_tec9', weapon_usp_silencer:'weapon_usp_silencer',
  weapon_cz75a:'weapon_cz75a', weapon_revolver:'weapon_revolver',
  weapon_nova:'weapon_nova', weapon_sawedoff:'weapon_sawedoff',
  weapon_mag7:'weapon_mag7', weapon_xm1014:'weapon_xm1014',
  weapon_m249:'weapon_m249', weapon_negev:'weapon_negev',
  weapon_knife:'weapon_knife', weapon_knife_t:'weapon_knife_t',
  weapon_knife_ct:'weapon_bayonet', weapon_bayonet:'weapon_bayonet',
  weapon_c4:'weapon_c4',
  weapon_hegrenade:'weapon_hegrenade', weapon_flashbang:'weapon_flashbang',
  weapon_smokegrenade:'weapon_smokegrenade', weapon_molotov:'weapon_molotov',
  weapon_incgrenade:'weapon_incgrenade', weapon_decoy:'weapon_decoy',
  weapon_taser:'weapon_taser',
};

const NADE_DATA = {
  weapon_hegrenade:    { label:'HE',  color:'#e85420', title:'HE Grenade' },
  weapon_flashbang:    { label:'FL',  color:'#d4b84a', title:'Flashbang'  },
  weapon_smokegrenade: { label:'SM',  color:'#7a8f9c', title:'Smoke'      },
  weapon_molotov:      { label:'MO',  color:'#d44214', title:'Molotov'    },
  weapon_incgrenade:   { label:'INC', color:'#d44214', title:'Incendiary' },
  weapon_decoy:        { label:'DC',  color:'#607080', title:'Decoy'      },
};

function getWeaponName(internal) {
  if (!internal) return '—';
  return WEAPON_NAMES[internal]
    || internal.replace('weapon_','').replace(/_/g,' ').toUpperCase();
}

/**
 * Returns a <span> using CSS mask to display the real weapon SVG icon.
 * Color comes from the parent's CSS `color` property (currentColor).
 */
function getWeaponIconHTML(internal, cls = '') {
  const file = ICON_MAP[internal];
  if (!file) return `<span class="wpn-mask wpn-none ${cls}"></span>`;
  return `<span class="wpn-mask ${cls}" style="--wi:url('/icons/${file}.svg')" title="${getWeaponName(internal)}"></span>`;
}

// Alias for legacy calls
function getWeaponIcon(internal) { return getWeaponIconHTML(internal); }

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
