/**
 * CS2 Weapon Internal-Name → Display-Name Lookup
 * ─────────────────────────────────────────────────
 * CS2 GSI reports weapon names as "weapon_ak47" etc.
 * This map converts them to human-readable labels.
 */

/* global WEAPON_NAMES */
const WEAPON_NAMES = {
  // ── Rifles ──────────────────────────────────────────
  weapon_ak47:          'AK-47',
  weapon_m4a1:          'M4A4',
  weapon_m4a1_silencer: 'M4A1-S',
  weapon_aug:           'AUG',
  weapon_awp:           'AWP',
  weapon_famas:         'FAMAS',
  weapon_galilar:       'Galil AR',
  weapon_sg556:         'SG 553',
  weapon_scar20:        'SCAR-20',
  weapon_g3sg1:         'G3SG1',
  weapon_ssg08:         'SSG 08',

  // ── SMGs ─────────────────────────────────────────────
  weapon_mp5sd:         'MP5-SD',
  weapon_mp7:           'MP7',
  weapon_mp9:           'MP9',
  weapon_p90:           'P90',
  weapon_bizon:         'PP-Bizon',
  weapon_mac10:         'MAC-10',
  weapon_ump45:         'UMP-45',

  // ── Pistols ──────────────────────────────────────────
  weapon_deagle:        'Desert Eagle',
  weapon_elite:         'Dual Berettas',
  weapon_fiveseven:     'Five-SeveN',
  weapon_glock:         'Glock-18',
  weapon_hkp2000:       'P2000',
  weapon_p250:          'P250',
  weapon_tec9:          'Tec-9',
  weapon_usp_silencer:  'USP-S',
  weapon_cz75a:         'CZ75-Auto',
  weapon_revolver:      'R8 Revolver',

  // ── Heavy ────────────────────────────────────────────
  weapon_nova:          'Nova',
  weapon_sawedoff:      'Sawed-Off',
  weapon_mag7:          'MAG-7',
  weapon_xm1014:        'XM1014',
  weapon_m249:          'M249',
  weapon_negev:         'Negev',

  // ── Grenades ─────────────────────────────────────────
  weapon_hegrenade:     'HE Grenade',
  weapon_flashbang:     'Flashbang',
  weapon_smokegrenade:  'Smoke',
  weapon_molotov:       'Molotov',
  weapon_incgrenade:    'Incendiary',
  weapon_decoy:         'Decoy',

  // ── Equipment ────────────────────────────────────────
  weapon_c4:            'C4',
  weapon_knife:         'Knife',
  weapon_knife_t:       'Knife',
  weapon_knife_ct:      'Knife',
  weapon_taser:         'Zeus x27',
  weapon_bumpmine:      'Bump Mine',
};

/**
 * Get a display name for a weapon.
 * @param {string} internalName  e.g. "weapon_ak47"
 * @returns {string}             e.g. "AK-47"
 */
function getWeaponName(internalName) {
  if (!internalName) return '—';
  return WEAPON_NAMES[internalName]
    || internalName.replace('weapon_', '').replace(/_/g, ' ').toUpperCase();
}

/**
 * Returns the short badge label for a grenade type.
 * @param {string} weaponName  internal weapon name
 * @returns {string|null}      e.g. "HE", "SM", or null
 */
const GRENADE_BADGE = {
  weapon_hegrenade:    'HE',
  weapon_flashbang:    'FL',
  weapon_smokegrenade: 'SM',
  weapon_molotov:      'MO',
  weapon_incgrenade:   'IN',
  weapon_decoy:        'DC',
};

function getGrenadeBadge(weaponName) {
  return GRENADE_BADGE[weaponName] || null;
}
