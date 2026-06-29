// Premium inline-SVG country flags — the 2nd tier of the team-identity fallback
// (logo → FLAG → color+initials). Originally ported 1:1 from the design prototype
// (`_HANDOFF_CC_crest/prototype/redesign.jsx` rdFlagSvg/rdFlagUri/RD_COUNTRY).
// No image assets, no network — each flag is a tiny data-URI SVG so the Crest
// renders it instantly and tints/masks it like the logo path.
//
// Coverage: all 27 EU member states + the original non-EU codes already present
// in the catalog (US, RU, TH, BR). Order = picker order (alphabetical by PL name,
// Polish collation so Ł sorts after L).

// Supported country codes (the form's picker + the catalog data). Order = picker order.
export const COUNTRY_NAMES = {
  AT: 'Austria', BE: 'Belgia', BR: 'Brazylia', BG: 'Bułgaria', HR: 'Chorwacja',
  CY: 'Cypr', CZ: 'Czechy', DK: 'Dania', EE: 'Estonia', FI: 'Finlandia',
  FR: 'Francja', GR: 'Grecja', ES: 'Hiszpania', NL: 'Holandia', IE: 'Irlandia',
  LT: 'Litwa', LU: 'Luksemburg', LV: 'Łotwa', MT: 'Malta', DE: 'Niemcy',
  PL: 'Polska', PT: 'Portugalia', RU: 'Rosja', RO: 'Rumunia', SK: 'Słowacja',
  SI: 'Słowenia', US: 'Stany Zjednoczone', SE: 'Szwecja', TH: 'Tajlandia',
  HU: 'Węgry', IT: 'Włochy',
};

export const COUNTRY_CODES = Object.keys(COUNTRY_NAMES);

function flagSvg(code) {
  const W = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'>";
  switch (code) {
    // ── EU member states ──────────────────────────────────────────────
    case 'AT': return `${W}<rect width='60' height='40' fill='#ed2939'/><rect y='13.33' width='60' height='13.34' fill='#f4f5f8'/></svg>`;
    case 'BE': return `${W}<rect width='60' height='40' fill='#000'/><rect x='20' width='20' height='40' fill='#fae042'/><rect x='40' width='20' height='40' fill='#ed2939'/></svg>`;
    case 'BG': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='13.33' width='60' height='13.34' fill='#00966e'/><rect y='26.67' width='60' height='13.33' fill='#d62612'/></svg>`;
    case 'HR': return `${W}<rect width='60' height='40' fill='#ff0000'/><rect y='13.33' width='60' height='13.34' fill='#f4f5f8'/><rect y='26.67' width='60' height='13.33' fill='#171796'/></svg>`;
    case 'CY': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><ellipse cx='30' cy='17' rx='14' ry='5' fill='#d57800'/><path d='M23 24 q3 4 6 1' stroke='#4e5b31' stroke-width='1.4' fill='none'/><path d='M37 24 q-3 4 -6 1' stroke='#4e5b31' stroke-width='1.4' fill='none'/></svg>`;
    case 'CZ': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='20' width='60' height='20' fill='#d7141a'/><polygon points='0,0 30,20 0,40' fill='#11457e'/></svg>`;
    case 'DK': return `${W}<rect width='60' height='40' fill='#c8102e'/><rect x='18' width='8' height='40' fill='#f4f5f8'/><rect y='16' width='60' height='8' fill='#f4f5f8'/></svg>`;
    case 'EE': return `${W}<rect width='60' height='40' fill='#0072ce'/><rect y='13.33' width='60' height='13.34' fill='#000'/><rect y='26.67' width='60' height='13.33' fill='#f4f5f8'/></svg>`;
    case 'FI': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect x='17' width='7' height='40' fill='#003580'/><rect y='16.5' width='60' height='7' fill='#003580'/></svg>`;
    case 'FR': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='20' height='40' fill='#0b4ea2'/><rect x='40' width='20' height='40' fill='#e1000f'/></svg>`;
    case 'GR': return `${W}<rect width='60' height='40' fill='#0d5eaf'/><rect y='4.44' width='60' height='4.44' fill='#f4f5f8'/><rect y='13.33' width='60' height='4.44' fill='#f4f5f8'/><rect y='22.22' width='60' height='4.44' fill='#f4f5f8'/><rect y='31.11' width='60' height='4.44' fill='#f4f5f8'/><rect width='22.22' height='22.22' fill='#0d5eaf'/><rect x='8.88' width='4.44' height='22.22' fill='#f4f5f8'/><rect y='8.88' width='22.22' height='4.44' fill='#f4f5f8'/></svg>`;
    case 'ES': return `${W}<rect width='60' height='40' fill='#aa151b'/><rect y='10' width='60' height='20' fill='#f1bf00'/></svg>`;
    case 'NL': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='60' height='13.34' fill='#ae1c28'/><rect y='26.66' width='60' height='13.34' fill='#21468b'/></svg>`;
    case 'IE': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='20' height='40' fill='#169b62'/><rect x='40' width='20' height='40' fill='#ff883e'/></svg>`;
    case 'LT': return `${W}<rect width='60' height='40' fill='#fdb913'/><rect y='13.33' width='60' height='13.34' fill='#006a44'/><rect y='26.67' width='60' height='13.33' fill='#c1272d'/></svg>`;
    case 'LU': return `${W}<rect width='60' height='40' fill='#ed2939'/><rect y='13.33' width='60' height='13.34' fill='#f4f5f8'/><rect y='26.67' width='60' height='13.33' fill='#00a1de'/></svg>`;
    case 'LV': return `${W}<rect width='60' height='40' fill='#9e3039'/><rect y='16' width='60' height='8' fill='#f4f5f8'/></svg>`;
    case 'MT': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect x='30' width='30' height='40' fill='#cf142b'/></svg>`;
    case 'DE': return `${W}<rect width='60' height='40' fill='#000'/><rect y='13.34' width='60' height='13.33' fill='#dd0000'/><rect y='26.67' width='60' height='13.33' fill='#ffce00'/></svg>`;
    case 'PL': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='20' width='60' height='20' fill='#dc143c'/></svg>`;
    case 'PT': return `${W}<rect width='60' height='40' fill='#da291c'/><rect width='24' height='40' fill='#046a38'/><circle cx='24' cy='20' r='5' fill='#ffe000'/></svg>`;
    case 'RO': return `${W}<rect width='60' height='40' fill='#002b7f'/><rect x='20' width='20' height='40' fill='#fcd116'/><rect x='40' width='20' height='40' fill='#ce1126'/></svg>`;
    case 'SK': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='13.33' width='60' height='13.34' fill='#0b4ea2'/><rect y='26.67' width='60' height='13.33' fill='#ee1c25'/><path d='M10 11 h12 v9 q0 5 -6 8 q-6 -3 -6 -8 z' fill='#ee1c25' stroke='#f4f5f8' stroke-width='1'/><path d='M16 14 v9 M13 17 h6 M14 20 h4' stroke='#f4f5f8' stroke-width='1.2' fill='none'/></svg>`;
    case 'SI': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='13.33' width='60' height='13.34' fill='#0000a0'/><rect y='26.67' width='60' height='13.33' fill='#de0000'/><path d='M6 4 h12 v8 q0 4 -6 6 q-6 -2 -6 -6 z' fill='#0000a0' stroke='#f4f5f8' stroke-width='1'/><polygon points='12,6.5 9,12 15,12' fill='#f4f5f8'/></svg>`;
    case 'SE': return `${W}<rect width='60' height='40' fill='#006aa7'/><rect x='17' width='7' height='40' fill='#fecc00'/><rect y='16.5' width='60' height='7' fill='#fecc00'/></svg>`;
    case 'HU': return `${W}<rect width='60' height='40' fill='#cd2a3e'/><rect y='13.33' width='60' height='13.34' fill='#f4f5f8'/><rect y='26.67' width='60' height='13.33' fill='#436f4d'/></svg>`;
    case 'IT': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='20' height='40' fill='#008c45'/><rect x='40' width='20' height='40' fill='#cd212a'/></svg>`;
    // ── Non-EU (original catalog codes) ───────────────────────────────
    case 'RU': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='13.34' width='60' height='13.33' fill='#0039a6'/><rect y='26.67' width='60' height='13.33' fill='#d52b1e'/></svg>`;
    case 'TH': return `${W}<rect width='60' height='40' fill='#a51931'/><rect y='6.67' width='60' height='26.66' fill='#f4f5f8'/><rect y='13.34' width='60' height='13.33' fill='#2d2a4a'/></svg>`;
    case 'BR': return `${W}<rect width='60' height='40' fill='#009b3a'/><polygon points='30,4 55,20 30,36 5,20' fill='#ffdf00'/><circle cx='30' cy='20' r='8' fill='#002776'/></svg>`;
    case 'US':
    default: {
      let s = '';
      for (let i = 1; i < 13; i += 2) s += `<rect y='${(i * 40 / 13).toFixed(2)}' width='60' height='${(40 / 13).toFixed(2)}' fill='#f4f5f8'/>`;
      let st = '';
      for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) { const cx = 2.6 + (r % 2 ? 1.85 : 0) + c * 3.7; if (cx > 22.4) continue; st += `<circle cx='${cx.toFixed(2)}' cy='${(2.4 + r * 4.1).toFixed(2)}' r='0.85' fill='#f4f5f8'/>`; }
      return `${W}<rect width='60' height='40' fill='#b22234'/>${s}<rect width='24' height='${(7 * 40 / 13).toFixed(2)}' fill='#3c3b6e'/>${st}</svg>`;
    }
  }
}

// True when we render a real flag for this code (US is the SVG default but we only
// treat it as a flag when explicitly set — callers pass a real country code).
export function hasFlag(code) {
  return !!code && typeof code === 'string' && (code in COUNTRY_NAMES);
}

export function flagDataUri(code) {
  return `data:image/svg+xml,${encodeURIComponent(flagSvg(code))}`;
}
