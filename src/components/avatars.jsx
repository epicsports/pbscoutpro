// ─── PixelAvatar — 1-bit game-style portraits + custom avatar builder ─────
// 16×16 grid, cream/skin ink on a dark disc. Deterministic from a seed
// (existing player roster) OR fully customizable via a spec (user builder).
// Axes: skin · face shape · hair style · hair color · facial hair · eyewear · headwear.
//
// Ported 1:1 from the browser prototype (Downloads/avatars.jsx). Plumbing swaps only:
//   window.PT.COLORS / window.PT.FONT → theme.js tokens (aliased AVc/AVf below)
//   window.UI.useDevice              → src/hooks/useDevice
//   window.AVATARS = {...}           → ESM named exports
//   localStorage persistence         → removed; AvatarBuilder takes initialSpec/onSave props
// The drawing logic (buildSpans/buildGarment/drawHeadwear/BACKGROUNDS/tintHex/…) is
// byte-identical to the prototype — DO NOT touch it without re-rendering the gallery.
import React, { useState } from 'react';
import { COLORS, FONT } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

const AVc = COLORS;
const AVf = FONT;
const AVmono = "'JetBrains Mono', ui-monospace, monospace";
const AV_DARK = '#14161e';     // carved features (eyes / mouth) — reads on every skin

// ── palettes ──
const SKIN = { porcelain: '#f3ead9', cream: '#ece5d4', fair: '#e6c8a8', tan: '#d9b48a', golden: '#c79a6a', brown: '#b07d56', umber: '#9a6643', deep: '#8a5a3c', espresso: '#6b4329' };
const HAIRCOL = { black: '#23211f', darkbrown: '#3f2c20', brown: '#6b4a2e', auburn: '#8a3b1e', ginger: '#c4612a', blonde: '#cba24b', ash: '#9a9384', gray: '#b3ab95', platinum: '#e3ddcf', red: '#a52f24', blue: '#3b6ea5', pink: '#c96b96' };
const ACCENT = AVc.accent || '#f97316';

// bluza (garment) neutral palette; 'team' resolves to the player's team color at render
const TOPNEUTRAL = { slate: '#5b6472', graphite: '#2f3540', bone: '#cdc6b4', navy: '#27324a', maroon: '#5e2a33', forest: '#2f4a39', white: '#e8e6df' };
function shade(hex, amt) { // amt<0 darken, >0 lighten (0..1)
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = amt < 0 ? 0 : 255, t = Math.abs(amt);
  r = Math.round(r + (f - r) * t); g = Math.round(g + (f - g) * t); b = Math.round(b + (f - b) * t);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function avHash(s) { let h = 2166136261; s = String(s || ''); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const span = (x0, x1, y, c) => ({ x: x0, y, w: x1 - x0 + 1, h: 1, c });
const px = (x, y, c) => ({ x, y, w: 1, h: 1, c });
const BR = (x, y, w, h, c) => ({ x, y, w, h, c });

// ── face shapes (skin silhouette rows; head cols ~4-11) ──
const FACE_SHAPES = {
  round:  [[5,10,3],[4,11,4],[4,11,5],[4,11,6],[4,11,7],[4,11,8],[4,11,9],[5,10,10],[6,9,11],[7,8,12]],
  oval:   [[6,9,3],[5,10,4],[5,10,5],[5,10,6],[5,10,7],[5,10,8],[5,10,9],[5,10,10],[6,9,11],[7,8,12]],
  narrow: [[6,9,3],[6,9,4],[6,9,5],[6,9,6],[6,9,7],[6,9,8],[6,9,9],[6,9,10],[6,9,11],[7,8,12]],
  wide:   [[5,10,3],[4,11,4],[3,12,5],[3,12,6],[3,12,7],[3,12,8],[3,12,9],[4,11,10],[4,11,11],[5,10,12]],
  square: [[5,10,3],[4,11,4],[4,11,5],[4,11,6],[4,11,7],[4,11,8],[4,11,9],[4,11,10],[4,11,11],[5,10,12]],
  heart:  [[4,11,3],[4,11,4],[4,11,5],[4,11,6],[5,10,7],[5,10,8],[6,9,9],[6,9,10],[7,8,11],[7,8,12]],
  diamond:[[6,9,3],[5,10,4],[4,11,5],[4,11,6],[4,11,7],[5,10,8],[5,10,9],[6,9,10],[7,8,11],[7,8,12]],
};
const NECK = [[6,9,12],[6,9,13]]; // short neck stub; shoulders + garment are drawn at 24-grid in buildGarment

// ── hair styles ── 16-grid (face = cols 4-11, rows 3-12; eyes row 6-7). The head art is
// scaled ×1.3 over the garment, so side strands at rows 13-15 land at screen y≈17-20 and
// DRAPE over the shoulders → real long/female hair. Short styles stay above the jaw.
const HAIR = {
  none: () => [],
  buzz: () => [span(5,10,3), span(5,10,4)],
  crop: () => [span(5,10,2), span(4,11,3), span(4,11,4), px(4,5), px(11,5)],
  sidepart: () => [span(5,10,2), span(4,11,3), span(7,11,4), px(4,4)],
  spiky: () => [px(5,0),px(7,0),px(9,0),px(11,0), span(5,10,1), span(4,11,2), span(5,10,3), span(5,10,4)],
  quiff: () => [span(6,10,0), span(5,11,1), span(4,11,2), span(4,11,3), px(4,4),px(11,4)],
  mohawk: () => [px(7,0),px(8,0), px(7,1),px(8,1), span(6,9,2), span(6,9,3), span(6,9,4)],
  balding: () => [px(4,4),px(11,4), px(4,5),px(11,5), px(4,6),px(11,6)],
  fringe: () => [span(5,10,1), span(4,11,2), span(4,11,3), span(5,10,4)],
  undercut: () => [span(6,9,1), span(5,10,2), span(6,9,3), px(5,4)],
  cornrows: () => [span(4,11,1), px(5,2),px(7,2),px(9,2), px(5,3),px(7,3),px(9,3), px(4,4),px(11,4)],
  topknot: () => [px(7,0),px(8,0), span(6,9,1), span(5,10,2), span(4,11,3)],
  dreads: () => [span(5,10,1), span(4,11,2), span(3,12,3), px(3,4),px(12,4), px(3,5),px(12,5), px(3,6),px(12,6), px(4,7),px(11,7), px(3,8),px(12,8), px(3,10),px(12,10), px(3,12),px(12,12)],
  afro: () => [span(5,10,0), span(4,11,1), span(2,13,2), span(2,13,3), px(2,4),px(13,4), px(2,5),px(13,5), px(2,6),px(13,6), px(3,7),px(12,7), px(3,8),px(12,8)],
  bun: () => [px(7,0),px(8,0), px(7,1),px(8,1), span(6,9,1), span(5,10,2), span(4,11,3), span(4,5,4), span(10,11,4)],
  // ── longer / female-leaning (strands drape past the jaw onto the shoulders) ──
  bob: () => { const o = [span(5,10,0), span(4,11,1), span(3,12,2), span(3,12,3)]; for (let y = 4; y <= 8; y++) o.push(px(3,y), px(12,y)); o.push(span(2,4,9),span(11,13,9),span(3,4,10),span(11,12,10)); return o; },
  lob: () => { const o = [span(5,10,0), span(4,11,1), span(3,12,2), span(3,12,3)]; for (let y = 4; y <= 10; y++) o.push(px(3,y), px(12,y)); o.push(span(2,4,11),span(11,13,11),span(2,4,12),span(11,13,12)); return o; },
  long: () => { const o = [span(5,10,0), span(4,11,1), span(3,12,2), span(3,12,3)]; for (let y = 4; y <= 13; y++) o.push(px(3,y), px(12,y)); o.push(span(2,3,12),span(12,13,12),span(2,3,13),span(12,13,13),span(2,4,14),span(11,13,14),span(2,4,15),span(11,13,15)); return o; },
  wavy: () => { const o = [span(5,10,0), span(4,11,1), span(3,12,2), span(3,12,3)]; [[3,4],[2,5],[3,6],[2,7],[3,8],[2,9],[3,10],[2,11],[3,12],[3,13],[12,4],[13,5],[12,6],[13,7],[12,8],[13,9],[12,10],[13,11],[12,12],[12,13]].forEach(([x,y]) => o.push(px(x,y))); o.push(span(2,4,14),span(11,13,14)); return o; },
  curly: () => { const o = [span(4,11,0), span(3,12,1), span(2,13,2), span(2,13,3)]; [[2,4],[13,4],[3,5],[12,5],[2,6],[13,6],[3,7],[12,7],[2,8],[13,8],[3,9],[12,9],[2,10],[13,10],[3,11],[12,11],[3,12],[12,12],[2,13],[13,13]].forEach(([x,y]) => o.push(px(x,y))); return o; },
  hime: () => { const o = [span(4,11,1), span(3,12,2), span(3,12,3), span(4,11,4)]; for (let y = 4; y <= 14; y++) o.push(px(3,y), px(12,y)); o.push(span(2,3,13),span(12,13,13),span(2,3,14),span(12,13,14),span(2,4,15),span(11,13,15)); return o; },
  halfup: () => { const o = [span(5,10,0), span(4,11,1), span(3,12,2), span(3,12,3)]; for (let y = 4; y <= 12; y++) o.push(px(3,y), px(12,y)); o.push(span(2,4,13),span(11,13,13),span(2,4,14),span(11,13,14)); return o; },
  ponytail: () => { const o = [span(5,10,1), span(4,11,2), span(4,11,3), px(4,4),px(11,4)]; o.push(span(12,13,2),span(12,14,3),span(13,14,4),span(13,14,5),span(13,14,6),px(13,7),px(14,7),px(13,8)); return o; },
  pigtails: () => { const o = [span(5,10,1), span(4,11,2), span(3,12,3), px(3,4),px(12,4)]; o.push(span(2,3,5),span(12,13,5),span(1,3,6),span(12,14,6),span(1,3,7),span(12,14,7),px(2,8),px(13,8)); return o; },
  braid: () => { const o = [span(5,10,1), span(4,11,2), span(3,12,3), px(3,4),px(12,4), px(3,5),px(12,5)]; o.push(px(12,6),px(13,7),px(12,8),px(13,9),px(12,10),px(13,11),px(12,12),px(13,13)); return o; },
  braids: () => { const o = [span(5,10,1), span(4,11,2), span(3,12,3), px(3,4),px(12,4)]; for (let y = 5; y <= 13; y++) o.push(px(y % 2 ? 2 : 3, y), px(y % 2 ? 13 : 12, y)); return o; },
  spacebuns: () => [px(4,0),px(11,0), span(3,5,1),span(10,12,1), span(3,5,2),span(10,12,2), span(5,10,2), span(4,11,3)],
  updo: () => [span(5,10,0), span(4,11,1), span(3,12,2), span(4,11,3), px(4,4),px(11,4), px(6,0),px(9,0),px(7,1),px(8,1)],
};

// ── facial hair (drawn in hair color, under the mouth/eyes layer) ──
const FACIAL = {
  none: () => [],
  stubble: () => [px(5,11),px(6,11), px(9,11),px(10,11), span(7,8,12)],
  mustache: () => [span(6,9,9)],
  goatee: () => [span(6,9,9), span(7,8,11), span(7,8,12)],
  beard: () => [px(4,7),px(11,7), px(4,8),px(11,8), span(4,11,9), span(4,11,10), span(5,10,11), span(6,9,12)],
  soulpatch: () => [span(7,8,11)],
  fullbeard: () => [px(4,6),px(11,6), px(4,7),px(11,7), px(4,8),px(11,8), span(4,11,9), span(4,11,10), span(4,11,11), span(5,10,12)],
  chinstrap: () => [px(4,7),px(11,7), px(4,8),px(11,8), px(4,9),px(11,9), px(5,10),px(10,10), span(6,9,11)],
};

// ── bluzy: drawn natively on the 24×24 frame (head art is the 16-grid, scaled ×1.25 into the
// top of the disc). Full shoulders fill the lower disc → garment occupies far more of the frame.
// tokens → map: g base · sh soft shadow · hl highlight · a deep trim/contrast · d hardware · w white trim · sk skin
// rounded-shoulder bust: narrow rounded top (row 18), widest deltoids (row 19),
// then follows the disc arc down so the bottom fills the circle edge-to-edge (no gaps).
const GBODY = [[4,19,18],[2,21,19],[3,20,20],[4,19,21],[5,18,22],[7,16,23]];
const GB = (y) => GBODY.find(r => r[2] === y) || [9,15,y];
function celRow(out, x0, x1, y, map) {
  const w = x1 - x0 + 1, t = Math.max(1, Math.round(w * 0.26));
  out.push(span(x0, x0 + t - 1, y, map.hl));
  out.push(span(x0 + t, x1 - t, y, map.g));
  out.push(span(x1 - t + 1, x1, y, map.sh));
}
function garmentDetail(top, out, map, sk) {
  const A = map.a, G_ = map.g, SH = map.sh, HL = map.hl, D = map.d, W = map.w;
  const collar = (c = A) => { out.push(span(9,14,17,c)); out.push(span(10,13,16,c)); };
  const ribHem = (c = A) => out.push(span(9,15,23,c));
  const placket = (c = A, btn) => { for (let y = 18; y <= 22; y++) out.push(span(11,12,y,c)); if (btn) out.push(px(11,19,D), px(11,21,D)); };
  const bandRow = (y, c) => { const r = GB(y); out.push(span(r[0], r[1], y, c)); };
  switch (top) {
    case 'crew': collar(); break;
    case 'scoop': out.push(span(9,14,18,sk)); out.push(px(8,18,A),px(15,18,A),px(9,19,A),px(14,19,A)); break;
    case 'vneck': out.push(span(10,13,18,sk), span(11,12,19,sk)); out.push(px(9,18,A),px(14,18,A),px(10,19,A),px(13,19,A),px(11,20,A),px(12,20,A)); break;
    case 'polo': out.push(px(8,17,A),px(9,17,A),px(14,17,A),px(15,17,A)); placket(A, true); out.push(span(10,13,16,sk)); break;
    case 'buttonup': out.push(px(8,17,A),px(9,16,A),px(14,16,A),px(15,17,A)); placket(HL); for (let y = 18; y <= 22; y += 2) out.push(px(11,y,D)); out.push(span(10,13,16,sk)); break;
    case 'hoodie': out.push(span(8,15,17,SH), span(7,16,18,SH)); out.push(span(10,13,16,sk)); out.push(px(11,19,W),px(12,19,W),px(11,20,W),px(12,20,W)); collar(SH); break;
    case 'zip': collar(A); for (let y = 16; y <= 23; y++) out.push(px(11,y,D)); out.push(px(11,16,W)); break;
    case 'bomber': collar(A); ribHem(); for (let y = 18; y <= 22; y++) out.push(px(11,y,D)); break;
    case 'raglan': collar(); out.push(span(4,6,18,A),span(2,4,19,A),span(3,5,20,A)); out.push(span(17,19,18,A),span(19,21,19,A),span(18,20,20,A)); break;
    case 'jersey': out.push(span(10,13,18,sk), span(11,12,19,sk)); out.push(px(9,18,W),px(14,18,W)); out.push(span(10,13,21,D),span(10,13,22,D)); break;
    case 'tank': for (let y = 18; y <= 20; y++) for (let x = 8; x <= 15; x++) out.push(px(x,y,sk)); out.push(span(4,6,18,G_),span(2,4,19,G_),span(3,5,20,G_)); out.push(span(17,19,18,G_),span(19,21,19,G_),span(18,20,20,G_)); out.push(px(4,18,HL),px(2,19,HL)); break;
    case 'stripe': collar(); bandRow(19,A); bandRow(21,A); bandRow(23,A); break;
    case 'turtle': for (let y = 13; y <= 17; y++) out.push(span(9,14,y,G_)); out.push(span(9,14,13,HL)); out.push(px(9,14,HL),px(9,15,HL)); break;
    case 'varsity': collar(A); ribHem(A); placket(A, true); out.push(span(4,7,18,A),span(16,19,18,A)); break;
    case 'puffer': collar(A); bandRow(19,A); bandRow(21,A); out.push(px(11,20,A),px(11,22,A)); break;
    case 'paintball': out.push(span(4,6,18,A),span(2,4,19,A),span(3,5,20,A)); out.push(span(17,19,18,A),span(19,21,19,A),span(18,20,20,A)); collar(A); out.push(span(10,13,20,W),span(10,13,21,W)); out.push(span(11,12,20,D),span(11,12,21,D)); break;
    case 'panel': GBODY.forEach(([x0,x1,y]) => { const split = Math.round((x0 + x1) / 2 + (y - 18)); for (let x = Math.max(x0, split); x <= x1; x++) out.push(px(x,y,A)); }); collar(); break;
    case 'mesh': collar(); GBODY.forEach(([x0,x1,y]) => { for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) out.push(px(x,y,A)); }); break;
    default: collar();
  }
}
function buildGarment(spec, teamColor) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const skinC = (s.skin && s.skin[0] === '#') ? s.skin : (SKIN[s.skin] || SKIN.cream);
  const topC = s.topColor === 'team' ? (teamColor || TOPNEUTRAL.slate) : ((s.topColor && s.topColor[0] === '#') ? s.topColor : (TOPNEUTRAL[s.topColor] || TOPNEUTRAL.slate));
  const map = { g: topC, sh: shade(topC, -0.18), hl: shade(topC, 0.40), a: shade(topC, -0.46), d: AV_DARK, w: '#e9edf2', sk: skinC };
  const out = [];
  out.push(span(10,13,15,skinC), span(10,13,16,skinC), span(10,13,17,skinC)); // neck under collar
  GBODY.forEach(([x0, x1, y]) => out.push(span(x0, x1, y, skinC)));            // shoulder skin under garment
  GBODY.forEach(([x0, x1, y]) => celRow(out, x0, x1, y, map));                 // cel-shaded body
  // shoulder seam lines (so the body reads as shoulders, not a uniform blob)
  [[8,18],[7,19],[6,20],[6,21]].forEach(([x,y]) => out.push(px(x,y,map.a)));
  [[15,18],[16,19],[17,20],[17,21]].forEach(([x,y]) => out.push(px(x,y,map.a)));
  garmentDetail(s.top || 'crew', out, map, skinC);
  drawChain(out, s.chain);
  return out;
}

// ── rich color palettes for the builder pickers (same swatch picker as the app) ──
const SKIN_PALETTE = ['#f3ead9','#ece5d4','#e6c8a8','#d9b48a','#c79a6a','#b07d56','#9a6643','#8a5a3c','#6b4329'];
const HAIR_PALETTE = ['#23211f','#3f2c20','#6b4a2e','#8a3b1e','#c4612a','#cba24b','#e3ddcf','#b3ab95','#a52f24','#3b6ea5','#22c55e','#8b5cf6','#ec4899','#06b6d4'];
const TOP_PALETTE = ['team','#5b6472','#2f3540','#cdc6b4','#27324a','#e8e6df','#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#a855f7','#ec4899','#5e2a33','#2f4a39','#b91c1c'];

// ── ordered keys for the builder + deterministic seed ──
const SKIN_KEYS = ['porcelain','cream','fair','tan','golden','brown','umber','deep','espresso'];
const FACE_KEYS = ['round','oval','narrow','wide','square','heart','diamond'];
const HAIR_KEYS = ['none','buzz','crop','sidepart','spiky','quiff','mohawk','balding','fringe','undercut','cornrows','dreads','topknot','bob','lob','long','wavy','curly','hime','halfup','ponytail','pigtails','braid','braids','spacebuns','bun','updo','afro'];
const HAIRCOL_KEYS = ['black','darkbrown','brown','auburn','ginger','blonde','ash','gray','platinum','red','blue','pink'];
const FACIAL_KEYS = ['none','stubble','mustache','goatee','beard','soulpatch','fullbeard','chinstrap'];
const TOP_KEYS = ['crew','vneck','scoop','polo','buttonup','hoodie','zip','bomber','raglan','jersey','tank','stripe','turtle','varsity','puffer','paintball','panel','mesh'];
const TOPCOLOR_KEYS = ['slate','graphite','bone','navy','maroon','forest','white','team'];
const EYEWEAR_KEYS = ['none','glasses','sunglasses','goggles','eyeblack'];
const HEADWEAR_KEYS = ['none','headband','cap','capback','beanie','bandana','paisley','camo','skull','flame','check'];
const HEADWEAR_PALETTE = ['#c0392b','#e8e6df','#23211f','#2f4a39','#27324a','#f59e0b','#8b5cf6','team'];
const CHAIN_KEYS = ['none','gold','silver','choker'];
const EARRING_KEYS = ['none','stud','hoop','double'];
const GENDER_KEYS = ['f','m','x'];
const AGE_KEYS = [0,1,2];

const DEFAULT_SPEC = { gender: 'm', age: 1, skin: '#ece5d4', face: 'round', hair: 'crop', hairColor: '#6b4a2e', facial: 'none', eyewear: 'none', headwear: 'none', headwearColor: '#c0392b', chain: 'none', earring: 'none', top: 'crew', topColor: 'team', bg: 'none' };

// deterministic spec from a seed (existing rosters) — keeps accessories rare/clean
function avatarSpec(seed, opts = {}) {
  const h = avHash(seed);
  const gender = opts.gender || ((h & 1) ? 'm' : 'f');
  const age = opts.age != null ? opts.age : (h >> 5) % 3; // 0 young 1 adult 2 older
  const femHair = ['long','lob','wavy','curly','hime','halfup','ponytail','pigtails','braids','bob','bun','updo'];
  const masHair = ['crop','buzz','sidepart','spiky','quiff','mohawk','balding','undercut','fringe'];
  const list = gender === 'm' ? masHair : femHair;
  const hair = list[(h >> 6) % list.length];
  let hairColor = HAIRCOL_KEYS[(h >> 9) % 7]; // natural range (black..ash)
  if (age === 2) hairColor = (h & 2) ? 'gray' : 'platinum';
  let facial = 'none';
  if (gender === 'm' && age >= 1 && hair !== 'mohawk') facial = ['stubble','mustache','goatee','beard'][(h >> 11) % 4];
  const eyewear = ((h >> 14) % 6 === 0) ? 'glasses' : 'none';
  const top = TOP_KEYS[(h >> 12) % TOP_KEYS.length];
  return { skin: SKIN_KEYS[(h >> 2) % SKIN_KEYS.length], face: FACE_KEYS[(h >> 4) % FACE_KEYS.length], hair, hairColor, facial, eyewear, headwear: 'none', headwearColor: '#c0392b', chain: 'none', earring: 'none', top, topColor: 'team', bg: 'none', gender, age };
}

function randomSpec() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  return {
    skin: pick(SKIN_PALETTE), face: pick(FACE_KEYS), hair: pick(HAIR_KEYS),
    hairColor: pick(HAIR_PALETTE), facial: pick(FACIAL_KEYS),
    top: pick(TOP_KEYS), topColor: pick(TOP_PALETTE),
    eyewear: Math.random() < 0.3 ? pick(EYEWEAR_KEYS) : 'none',
    headwear: Math.random() < 0.35 ? pick(HEADWEAR_KEYS) : 'none',
    headwearColor: pick(HEADWEAR_PALETTE),
    chain: Math.random() < 0.3 ? pick(CHAIN_KEYS) : 'none',
    earring: Math.random() < 0.3 ? pick(EARRING_KEYS) : 'none',
    bg: Math.random() < 0.55 ? pick(BG_KEYS) : 'none',
    gender: pick(GENDER_KEYS), age: pick(AGE_KEYS),
  };
}

// ── headwear (16-grid): caps, beanie, and a family of patterned bandanas (paintball batik vibe) ──
function drawHeadwear(out, key, color) {
  if (!key || key === 'none') return;
  const c = color || ACCENT, dark = shade(c, -0.3), lite = shade(c, 0.42);
  if (key === 'headband') { out.push(span(4,11,5,c), px(3,5,c), px(12,5,c)); out.push(span(4,11,4,lite)); return; }
  if (key === 'cap') { out.push(span(5,10,1,c), span(4,11,2,c), span(4,11,3,c)); out.push(span(4,11,4,dark)); out.push(span(11,14,3,dark)); return; }
  if (key === 'capback') { out.push(span(5,10,1,c), span(4,11,2,c), span(4,11,3,c)); out.push(span(4,11,3,lite)); out.push(px(7,1,dark), px(8,1,dark)); out.push(span(2,4,2,dark)); return; }
  if (key === 'beanie') { for (let y = 0; y <= 3; y++) out.push(span(4,11,y,c)); out.push(span(4,11,4,dark)); out.push(span(4,11,3,dark)); out.push(px(7,0,lite), px(8,0,lite)); return; }
  const pat = { bandana: 'plain', paisley: 'paisley', camo: 'camo', skull: 'skull', flame: 'flame', check: 'check' }[key];
  if (pat) drawBandana(out, c, pat);
}
function drawBandana(out, base, pattern) {
  const dark = shade(base, -0.32), lite = shade(base, 0.42), wht = '#f0ece2';
  for (let y = 0; y <= 3; y++) out.push(span(4,11,y,base));
  out.push(span(4,11,4,dark));                                  // tie band over the forehead
  out.push(px(11,4,base), px(12,5,base), px(12,6,dark), px(13,6,dark)); // knot + tail (right)
  if (pattern === 'paisley') [[5,0],[8,0],[10,1],[6,1],[9,2],[5,2],[11,2],[7,3]].forEach(([x,y]) => out.push(px(x,y,wht)));
  else if (pattern === 'check') { for (let y = 0; y <= 3; y++) for (let x = 4; x <= 11; x++) if ((x + y) % 2 === 0) out.push(px(x,y,wht)); }
  else if (pattern === 'camo') [[5,0,dark],[6,0,dark],[9,1,lite],[10,1,lite],[4,1,lite],[7,2,dark],[8,2,dark],[11,2,dark],[5,3,lite]].forEach(([x,y,c]) => out.push(px(x,y,c)));
  else if (pattern === 'skull') { out.push(span(6,9,1,wht), span(6,9,2,wht)); out.push(px(7,1,base), px(8,1,base)); out.push(px(6,3,wht), px(9,3,wht)); }
  else if (pattern === 'flame') [[5,3,'#f59e0b'],[7,3,'#fbbf24'],[9,3,'#f59e0b'],[11,3,'#fbbf24'],[6,2,'#f59e0b'],[10,2,'#f59e0b']].forEach(([x,y,c]) => out.push(px(x,y,c)));
}
// ── neck chain (24-grid), drawn over the garment ──
function drawChain(out, key) {
  if (!key || key === 'none') return;
  if (key === 'choker') { out.push(span(9,14,17,'#2a2320')); out.push(px(11,18,'#e8c24a'), px(12,18,'#e8c24a')); return; }
  const c = key === 'silver' ? '#d8dde3' : '#e8c24a', hl = key === 'silver' ? '#f0f3f6' : '#f6e08a';
  [[8,18],[15,18],[8,19],[15,19],[9,20],[14,20],[10,21],[13,21],[11,22],[12,22]].forEach(([x,y]) => out.push(px(x,y,c)));
  out.push(px(11,22,hl), px(12,22,hl)); // pendant
}

// build the ordered fill list (z-order: skin → facial → hair → headwear → brows → eyes → eyewear → mouth)
function buildSpans(spec, teamColor) {
  const s = { ...DEFAULT_SPEC, ...spec };
  const skinC = (s.skin && s.skin[0] === '#') ? s.skin : (SKIN[s.skin] || SKIN.cream);
  const hairC = (s.hairColor && s.hairColor[0] === '#') ? s.hairColor : (HAIRCOL[s.hairColor] || HAIRCOL.brown);
  const out = [];
  const age = typeof s.age === 'number' ? s.age : ({ young: 0, adult: 1, older: 2 }[s.age] ?? 1);
  const gender = s.gender || 'm';
  // skin (head only; short neck stub). shoulders + garment live in buildGarment at the 24-grid.
  (FACE_SHAPES[s.face] || FACE_SHAPES.round).forEach(r => out.push(span(r[0], r[1], r[2], skinC)));
  NECK.forEach(r => out.push(span(r[0], r[1], r[2], skinC)));
  // facial hair (under hair so sideburns blend)
  (FACIAL[s.facial] || FACIAL.none)().forEach(r => out.push({ ...r, c: hairC }));
  // hair
  (HAIR[s.hair] || HAIR.none)().forEach(r => out.push({ ...r, c: hairC }));
  // headwear (caps, beanie, patterned bandanas) — tinted by headwearColor
  const hwC = (s.headwearColor && s.headwearColor[0] === '#') ? s.headwearColor : (s.headwearColor === 'team' ? (teamColor || ACCENT) : '#c0392b');
  drawHeadwear(out, s.headwear, hwC);
  // brows + eyes; gender adds lashes + lip color, age adds soft lines (kept within cols 6–9 to avoid edge spill on narrow faces)
  out.push(px(6, 6, hairC), px(9, 6, hairC));
  out.push(px(6, 7, AV_DARK), px(9, 7, AV_DARK));
  if (gender === 'f') out.push(px(6, 8, AV_DARK), px(9, 8, AV_DARK));
  if (age === 2) { const wr = shade(skinC, -0.16); out.push(px(6, 9, wr), px(9, 9, wr)); }
  // eyewear (over eyes)
  if (s.eyewear === 'glasses') {
    const fr = '#e9edf2';
    out.push(span(5, 7, 6, fr), span(5, 7, 8, fr), px(5, 7, fr), px(7, 7, fr));
    out.push(span(8, 10, 6, fr), span(8, 10, 8, fr), px(8, 7, fr), px(10, 7, fr));
    out.push(px(7, 7, fr)); // bridge
  }
  if (s.eyewear === 'goggles') {
    out.push(span(4, 11, 5, ACCENT));               // strap
    out.push(span(5, 10, 6, '#0d2438'), span(5, 10, 7, '#0d2438'), span(5, 10, 8, '#0d2438')); // lens glass
    out.push(px(6, 6, '#3b6ea5'), px(7, 6, '#5a8fc7')); // glass highlight
  }
  if (s.eyewear === 'sunglasses') {
    out.push(span(5, 7, 6, AV_DARK), span(5, 7, 7, AV_DARK)); // left lens
    out.push(span(8, 10, 6, AV_DARK), span(8, 10, 7, AV_DARK)); // right lens
    out.push(px(7, 6, '#3a3f48')); // bridge
    out.push(px(5, 6, '#454b55'), px(8, 6, '#454b55')); // glints
  }
  if (s.eyewear === 'eyeblack') {
    out.push(px(5, 8, AV_DARK), px(6, 8, AV_DARK), px(9, 8, AV_DARK), px(10, 8, AV_DARK)); // under-eye strips
  }
  // earrings (gold) on the right ear (+ left for the pair)
  if (s.earring === 'stud') out.push(px(11, 9, '#e8c24a'));
  else if (s.earring === 'hoop') out.push(px(11, 9, '#e8c24a'), px(12, 10, '#e8c24a'), px(11, 11, '#e8c24a'));
  else if (s.earring === 'double') out.push(px(11, 9, '#e8c24a'), px(4, 9, '#e8c24a'));
  // mouth (rose for female, dark otherwise)
  out.push(span(7, 8, 10, gender === 'f' ? '#bd5f6e' : AV_DARK));
  return out;
}

let _gradId = 0;

// ─── Backgrounds — 24-grid pixel scenes painted behind the bust (clipped to the disc) ───
function sunDisc(cx, cy, r, c, hl) { const o = []; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x*x + y*y <= r*r + 0.5) o.push(px(cx + x, cy + y, c)); if (hl) o.push(px(cx - 1, cy - 1, hl)); return o; }
function band(o, y0, y1, c) { for (let y = y0; y <= y1; y++) o.push(span(0, 23, y, c)); }
function mtn(o, cx, peakY, baseY, c, cap) { for (let y = peakY; y <= baseY; y++) { const w = y - peakY; o.push(span(cx - w, cx + w, y, c)); } if (cap) o.push(px(cx, peakY, cap), px(cx - 1, peakY + 1, cap), px(cx, peakY + 1, cap), px(cx + 1, peakY + 1, cap)); }
const BACKGROUNDS = {
  none:      { label: 'Brak', mood: null, amt: 0, draw: () => [] },
  beach:     { label: 'Plaża', mood: '#ffd98a', amt: .12, draw() { const o = []; band(o,0,8,'#bfe6f4'); band(o,9,13,'#46b3d4'); band(o,14,15,'#6fc8e0'); band(o,16,23,'#ebd6a1'); o.push(...sunDisc(18,4,2,'#ffe9a3','#fff6d6')); o.push(span(0,23,14,'#8fd9ea')); return o; } },
  sunset:    { label: 'Zachód', mood: '#ff9e6b', amt: .16, draw() { const o = []; band(o,0,4,'#f7c777'); band(o,5,8,'#f3a878'); band(o,9,12,'#e07f86'); band(o,13,16,'#b75f86'); band(o,17,23,'#3c2a4e'); o.push(...sunDisc(12,11,4,'#ffe0a0','#fff0c8')); o.push(span(6,18,15,'#7a4a6e')); return o; } },
  mountains: { label: 'Góry', mood: '#d2e2ff', amt: .08, draw() { const o = []; band(o,0,15,'#cfe6f2'); band(o,16,23,'#6b7d5a'); mtn(o,7,5,16,'#5b6b78','#eef3f7'); mtn(o,16,8,16,'#6a7a86','#eef3f7'); o.push(...sunDisc(20,3,1,'#fff0c0')); return o; } },
  tokyo:     { label: 'Tokyo', mood: '#ff5ea8', amt: .15, draw() { const o = []; band(o,0,23,'#1c1733'); band(o,18,23,'#2a2348'); o.push(BR(2,9,3,9,'#2e2a52'),BR(7,12,3,6,'#3a2f5e'),BR(15,8,3,10,'#2e2a52'),BR(19,11,3,7,'#3a2f5e')); o.push(BR(11,4,2,14,'#c0392b'),BR(10,6,4,1,'#e0584a'),BR(11,3,2,1,'#ffd36b')); [[3,11,'#ff5ea8'],[8,14,'#43e0d0'],[16,10,'#ffd36b'],[20,13,'#ff5ea8']].forEach(([x,y,c]) => o.push(px(x,y,c),px(x+1,y+2,c))); return o; } },
  city:      { label: 'Miasto', mood: '#cdd6e0', amt: .08, draw() { const o = []; band(o,0,16,'#acd2ec'); band(o,17,23,'#7a8694'); o.push(BR(1,8,4,9,'#5f6b78'),BR(6,11,3,6,'#6e7a86'),BR(10,6,4,11,'#566270'),BR(15,10,3,7,'#6e7a86'),BR(19,7,4,10,'#5f6b78')); [[2,9],[4,11],[7,13],[11,8],[12,11],[16,12],[20,9],[21,12]].forEach(([x,y]) => o.push(px(x,y,'#ffe08a'))); return o; } },
  nightcity: { label: 'Noc', mood: '#2a3a6b', amt: .16, draw() { const o = []; band(o,0,23,'#10162e'); band(o,18,23,'#1a2240'); o.push(...sunDisc(18,4,2,'#eef0d8','#ffffff')); o.push(BR(1,9,4,9,'#1d2547'),BR(6,12,3,6,'#232c54'),BR(10,7,4,11,'#1d2547'),BR(15,11,3,7,'#232c54'),BR(19,9,4,9,'#1d2547')); [[2,11],[3,13],[7,14],[11,9],[12,12],[16,13],[20,11],[21,13]].forEach(([x,y]) => o.push(px(x,y,'#ffd86b'))); return o; } },
  forest:    { label: 'Las', mood: '#9ad6a0', amt: .10, draw() { const o = []; band(o,0,15,'#bfe2d0'); band(o,16,23,'#3f5a3a'); mtn(o,5,7,17,'#2f5a3a'); mtn(o,12,5,17,'#356a42'); mtn(o,18,8,17,'#2f5a3a'); return o; } },
  desert:    { label: 'Pustynia', mood: '#ffcf8a', amt: .14, draw() { const o = []; band(o,0,13,'#ffe1b0'); o.push(...sunDisc(7,5,3,'#ff9e5e','#ffd08a')); band(o,14,17,'#e8b673'); band(o,18,23,'#d49a5a'); o.push(span(0,23,16,'#d8a868'),span(8,23,20,'#c98a4a')); return o; } },
  snow:      { label: 'Śnieg', mood: '#e6f1ff', amt: .10, draw() { const o = []; band(o,0,15,'#bcd4ec'); band(o,16,23,'#eef5ff'); mtn(o,8,8,16,'#cfe0f0','#ffffff'); mtn(o,17,10,16,'#dfeaf6','#ffffff'); [[3,3],[12,2],[20,5],[6,8],[18,9]].forEach(([x,y]) => o.push(px(x,y,'#ffffff'))); return o; } },
  space:     { label: 'Kosmos', mood: '#8b7bff', amt: .16, draw() { const o = []; band(o,0,23,'#0a0a1e'); [[3,3],[8,6],[14,2],[19,5],[5,15],[21,12],[11,18],[16,16]].forEach(([x,y]) => o.push(px(x,y,'#ffffff'))); o.push(...sunDisc(16,16,4,'#6b5ec0','#9a8fe0')); o.push(span(11,21,16,'#c0b6f0')); return o; } },
  aurora:    { label: 'Zorza', mood: '#6affc0', amt: .14, draw() { const o = []; band(o,0,23,'#0e1430'); [[2,2],[9,4],[15,3],[20,6],[6,8]].forEach(([x,y]) => o.push(px(x,y,'#ffffff'))); o.push(span(0,23,6,'#2fd0a0'),span(0,23,7,'#43e0c0'),span(0,23,9,'#3f9ad0'),span(0,23,10,'#5fb0e0')); band(o,18,23,'#16204a'); return o; } },
  ocean:     { label: 'Ocean', mood: '#3fb6d8', amt: .14, draw() { const o = []; band(o,0,5,'#bfeaf4'); band(o,6,12,'#3fb6d8'); band(o,13,23,'#1f7fa8'); [[5,9],[15,11],[10,15],[19,16]].forEach(([x,y]) => o.push(px(x,y,'#bfeaf4'))); o.push(span(0,23,6,'#7fd4e6')); return o; } },
  volcano:   { label: 'Wulkan', mood: '#ff6a3d', amt: .18, draw() { const o = []; band(o,0,23,'#3a1a1e'); band(o,0,5,'#6e2a2a'); mtn(o,12,7,18,'#241416'); o.push(px(11,7,'#ff7a3d'),px(12,7,'#ffb03d'),px(12,8,'#ff7a3d'),px(11,9,'#ff5a2d'),px(13,9,'#ff8a3d'),px(12,10,'#ff5a2d')); band(o,19,23,'#1a0e10'); o.push(px(6,3,'#5a2424'),px(18,4,'#5a2424')); return o; } },
  canyon:    { label: 'Kanion', mood: '#ff9e6b', amt: .12, draw() { const o = []; band(o,0,5,'#9fd6e8'); band(o,6,10,'#d98a52'); band(o,11,14,'#c2703f'); band(o,15,18,'#a85a32'); band(o,19,23,'#8a4628'); o.push(span(9,14,6,'#7fc0d8')); return o; } },
  savanna:   { label: 'Sawanna', mood: '#ffcf6b', amt: .14, draw() { const o = []; band(o,0,14,'#ffd98a'); o.push(...sunDisc(16,5,3,'#ff9e4e','#ffc878')); band(o,15,23,'#b78a3f'); o.push(BR(5,5,1,10,'#3a2a18'),span(2,9,5,'#2f5a3a'),span(3,8,4,'#356a42')); return o; } },
  rain:      { label: 'Deszcz', mood: '#8fa6c0', amt: .14, draw() { const o = []; band(o,0,23,'#5a6675'); band(o,0,6,'#6e7a88'); for (let i = 0; i < 10; i++) o.push(px((i*7+2)%24, (i*5+4)%18+4, '#aeb8c6')); band(o,20,23,'#3f4754'); o.push(span(0,23,20,'#5a8fa0')); return o; } },
  pitch:     { label: 'Boisko', mood: '#9ee08a', amt: .08, draw() { const o = []; band(o,0,9,'#aee0f0'); band(o,10,23,'#3f8a3f'); for (let y = 11; y <= 23; y += 2) o.push(span(0,23,y,'#469646')); o.push(span(0,23,13,'#eaf0e0'),span(11,12,13,'#eaf0e0')); o.push(BR(9,16,6,4,'#eaf0e0'),BR(10,17,4,2,'#3f8a3f')); return o; } },
  arena:     { label: 'Arena PB', mood: '#d8c08a', amt: .08, draw() { const o = []; band(o,0,8,'#5a6e7a'); band(o,9,23,'#9a8460'); for (let x = 0; x < 24; x += 3) o.push(px(x,2,'#3f4e58'),px(x+1,4,'#3f4e58')); o.push(BR(3,12,4,6,'#c0392b'),BR(3,11,4,1,'#e0584a'),BR(16,11,4,7,'#2f6fd0'),BR(16,10,4,1,'#4a8ae0'),BR(10,14,3,4,'#e0a82f')); return o; } },
  galaxy:    { label: 'Galaktyka', mood: '#c06bff', amt: .16, draw() { const o = []; band(o,0,23,'#120a26'); o.push(span(0,23,9,'#3a1f5e'),span(0,23,10,'#5a2f8e'),span(2,21,11,'#7a3fae'),span(4,19,8,'#2f1f4e')); [[2,3],[9,5],[15,2],[20,6],[5,16],[21,14],[12,19],[17,17],[7,12]].forEach(([x,y]) => o.push(px(x,y,'#ffffff'))); return o; } },
  clouds:    { label: 'Chmury', mood: '#bfe0ff', amt: .06, draw() { const o = []; band(o,0,23,'#7fc0ec'); band(o,0,8,'#9fd0f0'); o.push(BR(3,6,6,2,'#eef6ff'),BR(4,5,4,1,'#ffffff'),BR(14,10,7,2,'#eef6ff'),BR(15,9,5,1,'#ffffff'),BR(8,15,6,2,'#eef6ff')); return o; } },
  vapor:     { label: 'Vaporwave', mood: '#ff6ad5', amt: .16, draw() { const o = []; band(o,0,12,'#3a1f6e'); band(o,0,4,'#7a2f9e'); o.push(...sunDisc(12,9,4,'#ff6ad5','#ffd36b')); o.push(span(6,18,8,'#3a1f6e'),span(6,18,10,'#3a1f6e')); band(o,13,23,'#1a1030'); for (let y = 14; y <= 23; y += 2) o.push(span(0,23,y,'#ff6ad5')); for (let x = 0; x < 24; x += 4) for (let y = 13; y <= 23; y++) o.push(px(x,y,'#ff6ad5')); return o; } },
};
const BG_KEYS = Object.keys(BACKGROUNDS);
const BG_LABELS = Object.fromEntries(BG_KEYS.map(k => [k, BACKGROUNDS[k].label]));
function tintHex(hex, mood, amt) { if (!mood || !amt || !hex || hex[0] !== '#') return hex; const n = parseInt(hex.slice(1), 16), m = parseInt(mood.slice(1), 16); let r = (n>>16)&255, g = (n>>8)&255, b = n&255; const R = (m>>16)&255, G = (m>>8)&255, B = m&255; r = Math.round(r + (R-r)*amt); g = Math.round(g + (G-g)*amt); b = Math.round(b + (B-b)*amt); return '#' + ((1<<24) + (r<<16) + (g<<8) + b).toString(16).slice(1); }
function PixelAvatar({ seed, spec, size = 48, gender: g, style: st, age: ag, ring, teamColor }) {
  const finalSpec = spec || (() => {
    const base = avatarSpec(seed || 'x', { gender: g, age: ag });
    if (st && HAIR[st]) base.hair = st; // legacy: explicit hair-style key
    return base;
  })();
  const bgDef = BACKGROUNDS[finalSpec.bg] || BACKGROUNDS.none;
  const bgr = bgDef.draw();
  const mood = bgDef.mood, amt = bgDef.amt;
  const tintR = (r) => amt ? { ...r, c: tintHex(r.c, mood, amt) } : r;
  const head = buildSpans(finalSpec, teamColor).map(tintR);   // 16-grid head art (face, hair, facial, features, accessories)
  const gar = buildGarment(finalSpec, teamColor).map(tintR);  // 24-grid garment + shoulders
  const gid = React.useMemo(() => 'avdisc' + (_gradId++), []);
  const cid = React.useMemo(() => 'avclip' + (_gradId++), []);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block', shapeRendering: 'crispEdges', borderRadius: '50%', border: ring ? `2px solid ${ring}` : 'none' }}>
      <defs>
        <radialGradient id={gid} cx="50%" cy="34%" r="75%">
          <stop offset="0%" stopColor="#3a4150" />
          <stop offset="100%" stopColor="#1f242e" />
        </radialGradient>
        <clipPath id={cid}><circle cx="12" cy="12" r="12" /></clipPath>
      </defs>
      <g clipPath={`url(#${cid})`}>
        <rect x="0" y="0" width="24" height="24" fill={`url(#${gid})`} />
        {bgr.map((r, i) => <rect key={'b' + i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />)}
        {gar.map((r, i) => <rect key={'g' + i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />)}
        <g transform="translate(1.6,0) scale(1.3)">
          {head.map((r, i) => <rect key={'h' + i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.c} />)}
        </g>
      </g>
    </svg>
  );
}

// ─── Avatar builder (user-facing creator) ─────────────────────────────────
// Panels pair a shape axis with its color axis ("wygląd + kolor") so colour
// lives next to the part it tints — no separate colour tabs.
// NOTE Stage C: this builder is EXPORTED ONLY and is not mounted on any route
// this stage. Its chrome carries Polish labels inline (ported 1:1 from the
// prototype). Before wiring it to a route, route all user-facing text through
// the i18n helper and any raw controls through ui.jsx (see brief Stage C).
const PANELS = [
  { id: 'gender', label: 'Płeć', shape: { key: 'gender', opts: GENDER_KEYS, lbl: { f: 'Kobieta', m: 'Mężczyzna', x: 'Neutralna' } } },
  { id: 'age', label: 'Wiek', shape: { key: 'age', opts: AGE_KEYS, lbl: { 0: 'Młody', 1: 'Dorosły', 2: 'Starszy' } } },
  { id: 'skin', label: 'Skóra', color: { key: 'skin', pal: SKIN_PALETTE } },
  { id: 'face', label: 'Twarz', shape: { key: 'face', opts: FACE_KEYS, lbl: { round: 'Okrągła', oval: 'Owalna', narrow: 'Szczupła', wide: 'Szeroka', square: 'Kwadrat', heart: 'Serce', diamond: 'Romb' } } },
  { id: 'hair', label: 'Włosy', shape: { key: 'hair', opts: HAIR_KEYS, lbl: { none: 'Łysy', buzz: 'Jeż', crop: 'Krótkie', sidepart: 'Przedz.', spiky: 'Kolce', quiff: 'Grzywa', mohawk: 'Irokez', balding: 'Zakola', fringe: 'Grzywka', undercut: 'Undercut', cornrows: 'Warkoczyki', dreads: 'Dredy', topknot: 'Kok góra', bob: 'Bob', lob: 'Długi bob', long: 'Długie', wavy: 'Falowane', curly: 'Kręcone', hime: 'Hime', halfup: 'Półupięte', ponytail: 'Kucyk', pigtails: 'Kucyki', braid: 'Warkocz', braids: 'Warkocze', spacebuns: 'Koczki', bun: 'Kok', updo: 'Upięcie', afro: 'Afro' } }, color: { key: 'hairColor', pal: HAIR_PALETTE } },
  { id: 'facial', label: 'Zarost', shape: { key: 'facial', opts: FACIAL_KEYS, lbl: { none: 'Brak', stubble: 'Zarost', mustache: 'Wąsy', goatee: 'Bródka', beard: 'Broda', soulpatch: 'Muszka', fullbeard: 'Bujna', chinstrap: 'Bokobr.' } } },
  { id: 'headwear', label: 'Nakrycie', shape: { key: 'headwear', opts: HEADWEAR_KEYS, lbl: { none: 'Brak', headband: 'Opaska', cap: 'Czapka', capback: 'Czapka tył', beanie: 'Zimowa', bandana: 'Bandana', paisley: 'Paisley', camo: 'Moro', skull: 'Czaszka', flame: 'Płomienie', check: 'Krata' } }, color: { key: 'headwearColor', pal: HEADWEAR_PALETTE } },
  { id: 'acc', label: 'Akcesoria', shape: { key: 'chain', opts: CHAIN_KEYS, sec: 'Na szyję', lbl: { none: 'Brak', gold: 'Złoty', silver: 'Srebrny', choker: 'Choker' } }, shape2: { key: 'earring', opts: EARRING_KEYS, sec: 'Kolczyki', lbl: { none: 'Brak', stud: 'Wpinka', hoop: 'Kółko', double: 'Para' } }, shape3: { key: 'eyewear', opts: EYEWEAR_KEYS, sec: 'Okulary', lbl: { none: 'Brak', glasses: 'Okulary', sunglasses: 'Słoneczne', goggles: 'Gogle', eyeblack: 'Eye-black' } } },
  { id: 'top', label: 'Bluza', shape: { key: 'top', opts: TOP_KEYS, lbl: { crew: 'Crew', vneck: 'V-neck', scoop: 'Dekolt U', polo: 'Polo', buttonup: 'Koszula', hoodie: 'Z kapturem', zip: 'Zip', bomber: 'Bomber', raglan: 'Raglan', jersey: 'Jersey', tank: 'Tank', stripe: 'Pasek', turtle: 'Golf', varsity: 'Varsity', puffer: 'Puchowa', paintball: 'Paintball', panel: 'Panel', mesh: 'Siatka' } }, color: { key: 'topColor', pal: TOP_PALETTE } },
  { id: 'bg', label: 'Tło', shape: { key: 'bg', opts: BG_KEYS, lbl: BG_LABELS } },
];

// AvatarBuilder({ initialSpec, onBack, onSave, teamColor }) — seeded from initialSpec
// (no localStorage). "Save" calls onSave?.(spec) then onBack(). Exported-only this stage.
function AvatarBuilder({ initialSpec, onBack = () => {}, onSave, teamColor = '#3b82f6' }) {
  const { isMobile } = useDevice();
  const [spec, setSpec] = useState(() => ({ ...DEFAULT_SPEC, ...(initialSpec || {}) }));
  const [panelId, setPanel] = useState('hair');
  const set = (k, v) => setSpec(s => ({ ...s, [k]: v }));
  const P = PANELS.find(p => p.id === panelId);

  const Preview = ({ s }) => (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', background: `radial-gradient(circle at 50% 38%, ${ACCENT}33, transparent 70%)` }} />
      <PixelAvatar spec={s} size={isMobile ? 150 : 184} ring={ACCENT} teamColor={teamColor} />
    </div>
  );

  const secLabel = (t) => <div style={{ fontFamily: AVmono, fontSize: 10.5, letterSpacing: '1.5px', color: AVc.textMuted, margin: '2px 0 11px' }}>{t}</div>;

  const shapeGrid = (sh) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(74px, 1fr))', gap: 10 }}>
      {sh.opts.map(opt => {
        const on = spec[sh.key] === opt;
        return (
          <div key={String(opt)} onClick={() => set(sh.key, opt)}
            style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 6px', borderRadius: 12, background: on ? `${ACCENT}1a` : AVc.surfaceDark, border: `1.5px solid ${on ? ACCENT : AVc.border}`, transition: 'all .12s' }}>
            <PixelAvatar spec={{ ...spec, [sh.key]: opt }} size={50} teamColor={teamColor} />
            <span style={{ fontFamily: AVf, fontSize: 11.5, fontWeight: on ? 800 : 600, color: on ? AVc.text : AVc.textMuted, textAlign: 'center', lineHeight: 1.15, wordBreak: 'break-word' }}>
              {sh.lbl ? sh.lbl[opt] : opt}
            </span>
          </div>
        );
      })}
    </div>
  );

  const colorRow = (col) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 11 }}>
      {col.pal.map(opt => {
        const on = spec[col.key] === opt;
        const hex = opt === 'team' ? teamColor : opt;
        return (
          <div key={opt} onClick={() => set(col.key, opt)} title={opt === 'team' ? 'Drużyna' : opt}
            style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, cursor: 'pointer', background: hex, transition: 'box-shadow .12s', boxShadow: on ? `0 0 0 3px ${AVc.bg}, 0 0 0 5px ${hex}` : 'inset 0 0 0 1px rgba(255,255,255,.18)' }}>
            {opt === 'team' && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AVf, fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,.55)' }}>T</span>}
          </div>
        );
      })}
    </div>
  );

  const paired = P.shape && (P.color || P.shape2 || P.shape3);
  const content = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {P.shape && <div>{(paired || P.shape.sec) && secLabel(P.shape.sec || 'Wygląd')}{shapeGrid(P.shape)}</div>}
      {P.shape2 && <div>{secLabel(P.shape2.sec || 'Więcej')}{shapeGrid(P.shape2)}</div>}
      {P.shape3 && <div>{secLabel(P.shape3.sec || 'Więcej')}{shapeGrid(P.shape3)}</div>}
      {P.color && <div>{paired && secLabel(P.color.sec || 'Kolor')}{colorRow(P.color)}</div>}
    </div>
  );

  const catBar = (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 2px 4px', WebkitOverflowScrolling: 'touch' }}>
      {PANELS.map(p => {
        const on = panelId === p.id;
        return (
          <div key={p.id} onClick={() => setPanel(p.id)}
            style={{ flexShrink: 0, cursor: 'pointer', padding: '9px 14px', borderRadius: 999, background: on ? ACCENT : AVc.surfaceDark, color: on ? '#1a1206' : AVc.textDim, border: `1px solid ${on ? ACCENT : AVc.border}`, fontFamily: AVf, fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap' }}>
            {p.label}
          </div>
        );
      })}
    </div>
  );

  const header = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderBottom: `1px solid ${AVc.border}`, flexShrink: 0 }}>
      <div onClick={onBack} style={{ color: ACCENT, fontSize: 26, fontWeight: 800, cursor: 'pointer', lineHeight: 1 }}>‹</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: AVf, fontSize: 19, fontWeight: 800, color: AVc.text }}>Twój awatar</div>
        <div style={{ fontFamily: AVmono, fontSize: 10.5, letterSpacing: '1.5px', color: AVc.textMuted }}>PIXEL · 1-BIT</div>
      </div>
      <div onClick={() => setSpec(randomSpec())}
        style={{ cursor: 'pointer', padding: '8px 14px', borderRadius: 10, background: AVc.surfaceDark, border: `1px solid ${AVc.border}`, fontFamily: AVf, fontSize: 13, fontWeight: 800, color: AVc.textDim }}>
        ⟲ Losuj
      </div>
    </div>
  );

  const saveBar = (
    <div style={{ flexShrink: 0, padding: '12px 16px', borderTop: `1px solid ${AVc.border}`, background: AVc.bg }}>
      <div onClick={() => { onSave?.(spec); onBack(); }}
        style={{ background: ACCENT, color: '#1a1206', borderRadius: 12, minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: AVf, fontSize: 17, fontWeight: 800, cursor: 'pointer' }}>
        Zapisz awatar
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', background: AVc.bg }}>
        {header}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '22px 0 18px' }}><Preview s={spec} /></div>
        <div style={{ padding: '0 16px' }}>{catBar}</div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 20px' }}>{content}</div>
        {saveBar}
      </div>
    );
  }
  // wide — preview pane left, controls right
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '100%', background: AVc.bg }}>
      {header}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <div style={{ width: 340, flexShrink: 0, borderRight: `1px solid ${AVc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', background: AVc.surfaceDark }}>
          <Preview s={spec} />
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ padding: '16px 20px 4px' }}>{catBar}</div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 20px 20px' }}>{content}</div>
        </div>
      </div>
      {saveBar}
    </div>
  );
}

export { PixelAvatar, AvatarBuilder, avatarSpec, randomSpec, DEFAULT_SPEC, BACKGROUNDS, BG_KEYS, buildSpans, SKIN_PALETTE, HAIR_PALETTE, TOP_PALETTE };
export default PixelAvatar;
