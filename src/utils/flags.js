// Premium inline-SVG country flags — the 2nd tier of the team-identity fallback
// (logo → FLAG → color+initials). Ported 1:1 from the design prototype
// (`_HANDOFF_CC_crest/prototype/redesign.jsx` rdFlagSvg/rdFlagUri/RD_COUNTRY).
// No image assets, no network — each flag is a tiny data-URI SVG so the Crest
// renders it instantly and tints/masks it like the logo path.

// Supported country codes (the form's picker + the catalog data). Order = picker order.
export const COUNTRY_NAMES = {
  US: 'Stany Zjednoczone', FR: 'Francja', RU: 'Rosja', TH: 'Tajlandia', DE: 'Niemcy',
  PL: 'Polska', IT: 'Włochy', NL: 'Holandia', BE: 'Belgia', ES: 'Hiszpania',
  SE: 'Szwecja', FI: 'Finlandia', BR: 'Brazylia',
};

export const COUNTRY_CODES = Object.keys(COUNTRY_NAMES);

function flagSvg(code) {
  const W = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 60 40'>";
  switch (code) {
    case 'FR': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='20' height='40' fill='#0b4ea2'/><rect x='40' width='20' height='40' fill='#e1000f'/></svg>`;
    case 'IT': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='20' height='40' fill='#008c45'/><rect x='40' width='20' height='40' fill='#cd212a'/></svg>`;
    case 'BE': return `${W}<rect width='60' height='40' fill='#000'/><rect x='20' width='20' height='40' fill='#fae042'/><rect x='40' width='20' height='40' fill='#ed2939'/></svg>`;
    case 'RU': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='13.34' width='60' height='13.33' fill='#0039a6'/><rect y='26.67' width='60' height='13.33' fill='#d52b1e'/></svg>`;
    case 'NL': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect width='60' height='13.34' fill='#ae1c28'/><rect y='26.66' width='60' height='13.34' fill='#21468b'/></svg>`;
    case 'DE': return `${W}<rect width='60' height='40' fill='#000'/><rect y='13.34' width='60' height='13.33' fill='#dd0000'/><rect y='26.67' width='60' height='13.33' fill='#ffce00'/></svg>`;
    case 'PL': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect y='20' width='60' height='20' fill='#dc143c'/></svg>`;
    case 'ES': return `${W}<rect width='60' height='40' fill='#aa151b'/><rect y='10' width='60' height='20' fill='#f1bf00'/></svg>`;
    case 'TH': return `${W}<rect width='60' height='40' fill='#a51931'/><rect y='6.67' width='60' height='26.66' fill='#f4f5f8'/><rect y='13.34' width='60' height='13.33' fill='#2d2a4a'/></svg>`;
    case 'SE': return `${W}<rect width='60' height='40' fill='#006aa7'/><rect x='17' width='7' height='40' fill='#fecc00'/><rect y='16.5' width='60' height='7' fill='#fecc00'/></svg>`;
    case 'FI': return `${W}<rect width='60' height='40' fill='#f4f5f8'/><rect x='17' width='7' height='40' fill='#003580'/><rect y='16.5' width='60' height='7' fill='#003580'/></svg>`;
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
