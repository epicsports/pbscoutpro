#!/usr/bin/env node
/**
 * PbScoutPro UI Consistency Linter
 * Run: node scripts/lint-ui.js
 * 
 * Checks for:
 * 1. Raw HTML controls (should use shared components)
 * 2. Polish strings in UI
 * 3. Hardcoded styles that should use theme tokens
 * 4. Missing touch targets
 * 5. Sticky bars without zIndex
 * 6. Inconsistent patterns
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const SRC = 'src';
const ERRORS = [];
const WARNINGS = [];

// ── Collect all JSX files ──
function walk(dir) {
  const files = [];
  for (const f of readdirSync(dir)) {
    const full = join(dir, f);
    if (statSync(full).isDirectory()) {
      if (f === 'node_modules' || f === 'workers') continue;
      files.push(...walk(full));
    } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Domain-data words: single-word labels that are identifiers, not prose UI copy.
 * These are canonical domain/app terms that appear in the UI as-is and are NOT
 * expected to go through t('key'). Extend this set when the linter flags a
 * word that is genuinely a domain label rather than user-facing copy.
 *
 * Example additions: add 'Standings' if that label is a fixed domain term.
 */
const EN_LITERAL_DOMAIN_WORDS = new Set([
  // Paintball field zones and positions
  'Snake', 'Dorito', 'Center', 'Break', 'Settle', 'Mid', 'Wire',
  'Snake50', 'Dorito50', 'Base', 'Doritos', 'Snakes', 'Brick',
  // Game/match outcomes
  'Win', 'Loss', 'Draw', 'Timeout', 'OT',
  // Division / league identifiers (used as labels verbatim)
  'D1', 'D2', 'D3', 'D4', 'D5', 'NXL', 'PSP', 'NPPL', 'xball', 'Xball',
  'Pro', 'Semi-Pro', 'Amateur',
  // App role names (used as labels verbatim in role chips, pickers)
  'Coach', 'Scout', 'Player', 'Staff', 'Viewer', 'Admin',
  // App concepts used as section headers / tab labels
  'Tournament', 'Training', 'Match', 'Home', 'Away', 'Roster',
  'Divisions', 'Layouts', 'Analytics', 'Insights', 'Counters',
  'Overview', 'Breakdown', 'Global', 'Details',
  // Short imperative UI words that are too short to be useful signal
  // (≤6 chars, single word — these are everywhere; flagging them is too noisy)
  // NOTE: multi-word forms like "Add player" ARE flagged intentionally.
  'Add', 'Edit', 'Save', 'Close', 'Back', 'Next', 'Done',
  'Cancel', 'Delete', 'Remove', 'Reset', 'Clear', 'Search',
  'Open', 'Close', 'Send', 'Copy', 'Paste', 'Print',
]);

/**
 * isLikelyUIEnLiteral — returns true if `val` looks like a user-facing
 * hardcoded English string that should be going through t('key') instead.
 *
 * Precision over recall: we'd rather miss a few than flood with noise.
 * The domain-word allowlist above handles common single-word UI labels.
 */
function isLikelyUIEnLiteral(val) {
  if (!val || val.length < 2) return false;

  // Strip surrounding whitespace
  val = val.trim();

  // Skip empties and pure numbers
  if (!val || /^\d+$/.test(val)) return false;

  // Must contain at least one letter
  if (!/[A-Za-z]/.test(val)) return false;

  // Skip CSS-like values (px, %, #hex, rgb, var(...)
  if (/px|%|#[0-9a-fA-F]{3,8}|^rgb|^var\(/.test(val)) return false;

  // Skip URLs, paths, dotted identifiers, email-like patterns
  if (/^https?:\/\/|^\/|^sk-|@|\.[a-z]{2,4}$/.test(val)) return false;

  // Skip all-caps acronyms / short tokens (≤5 chars like W, L, OT, NXL, HERO, LIVE)
  if (/^[A-Z0-9_/\-]{1,5}$/.test(val)) return false;

  // Skip single char or punctuation-only
  if (/^[^A-Za-z0-9]+$/.test(val)) return false;

  // Skip template-literal-looking fragments (${...} only — pure interpolation)
  if (/^\$\{[^}]+\}$/.test(val)) return false;

  // Lowercase check for camelCase / identifiers (no spaces, starts lowercase = code id)
  // A true prose label usually has spaces or starts with a capital letter
  if (!/\s/.test(val) && /^[a-z]/.test(val)) return false;

  const words = val.trim().split(/\s+/);

  // Multi-word: flag if 2+ words (genuine UI prose)
  if (words.length >= 2) {
    // Skip if all words are domain words (e.g. "Snake Base", "Dorito 50", "Home Away")
    const allDomain = words.every(w => EN_LITERAL_DOMAIN_WORDS.has(w) || /^[\d.+\-:→↓↑✅×]+$/.test(w));
    if (allDomain) return false;
    // Skip if it looks like a code snippet or JSX expression fragment
    if (/[{}()=><]/.test(val)) return false;
    // Skip ternary/comparison fragments that slipped through: "? 1 : bk"
    if (/^\?|^:/.test(val.trim())) return false;
    // Skip short 2-word combinations where both are ≤2 chars (avoid "on x" etc.)
    if (words.length === 2 && words.every(w => w.length <= 2)) return false;
    return true;
  }

  // Single word: only flag if it starts with a capital letter AND is ≥4 chars
  // AND is NOT in the domain-data allowlist
  if (words.length === 1) {
    const w = words[0];
    if (w.length < 4) return false; // ≥4 chars avoids "Add", "Set" etc.
    if (!/^[A-Z]/.test(w)) return false; // must start uppercase
    if (EN_LITERAL_DOMAIN_WORDS.has(w)) return false;
    // Skip known React/JSX prop values that are identifiers
    if (/^(true|false|null|undefined)$/i.test(w)) return false;
    // Skip single-word ALL-CAPS (HERO, SURV, etc. — constant/badge labels)
    if (/^[A-Z]{2,}$/.test(w)) return false;
    return true;
  }

  return false;
}

function check(file, content, lines) {
  // Normalize to forward slashes for cross-platform path matching (Windows
  // path.relative() returns backslashes; all checks below use forward-slash patterns)
  const rel = relative('.', file).replace(/\\/g, '/');
  const isUI = rel.includes('ui.jsx');
  const isPage = rel.includes('pages/');
  const isComponent = rel.includes('components/');

  lines.forEach((line, idx) => {
    const ln = idx + 1;
    const trimmed = line.trim();

    // ── 1. Raw HTML controls ──
    // Skip ui.jsx where components are defined
    if (!isUI) {
      // Raw <select (not <Select)
      if (/<select\s/i.test(line) && !/<Select/i.test(line)) {
        ERRORS.push(`${rel}:${ln} — Raw <select> — use <Select> from ui.jsx`);
      }
      // Raw <input type="checkbox"
      if (/type=["']checkbox["']/i.test(line) && !isUI) {
        WARNINGS.push(`${rel}:${ln} — Raw checkbox — use <Checkbox> from ui.jsx`);
      }
      // Raw <input type="range"
      if (/type=["']range["']/i.test(line) && !isUI) {
        WARNINGS.push(`${rel}:${ln} — Raw range slider — use <Slider> from ui.jsx`);
      }
      // Raw <textarea
      if (/<textarea[\s>]/i.test(line) && !/<TextArea/.test(line) && !isUI) {
        WARNINGS.push(`${rel}:${ln} — Raw <textarea> — use <TextArea> from ui.jsx`);
      }
      // Raw <input without being the Input component definition
      if (/<input\s/i.test(line) && !/type=["'](checkbox|range|file|hidden)["']/i.test(line)
          && !/export function Input/i.test(line) && !isUI) {
        // Check if it's using our <Input> component or raw HTML
        if (!/<Input\s/i.test(line)) {
          WARNINGS.push(`${rel}:${ln} — Raw <input> — consider using <Input> from ui.jsx`);
        }
      }
    }

    // ── 2. Polish strings ──
    // Flag BARE hardcoded Polish in UI source (should go through t('key')). Skip:
    //   • i18n.js — it IS the dictionary; its `pl:` block values are correctly
    //     Polish (was 884 false positives, the bulk of the noise).
    //   • lines containing `t(` — a `t('k') || 'Polski'` FALLBACK is intentional
    //     (renders only if the key is missing), not debt (was 189 false positives).
    //   • comments.
    // Mirrors the EN-literal rule (2b) allowlist; leaves the real ~68-string debt.
    const isI18nDict = rel.includes('utils/i18n.js');
    //   • src/data/ — static domain-data catalogs (e.g. packingChecklist.js); the
    //     labels ARE the data (like the i18n dict), not UI debt. i18n-ing them is a
    //     parked Phase-2 follow-up (docs/PACKING_CHECKLIST.md), not a commit blocker.
    const isDataCatalog = rel.replace(/\\/g, '/').includes('src/data/');
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
    const isFallback = line.includes('t(');
    if (!isI18nDict && !isDataCatalog && !isComment && !isFallback) {
      // Polish diacritics in a string literal
      if (/['"`][^'"`]*[ąęóśźżćńłĄĘÓŚŹŻĆŃŁ][^'"`]*['"`]/.test(line)) {
        WARNINGS.push(`${rel}:${ln} — Polish string detected — wrap in t('key')`);
      }
      // Common Polish words without diacritics
      const polishWords = /['"`](Ładowanie|Sprawdzanie|Przygotowanie|Turniej|Strzały|Pozycja|Rysuj|Narysuj|Zapisz|Usuń|Edytuj|Dodaj|Szukaj|Notatki|Ksywka|Imię|Nazwisko|Drużyna|Gracz)['"`]/;
      if (polishWords.test(line)) {
        WARNINGS.push(`${rel}:${ln} — Polish word in UI string — wrap in t('key')`);
      }
    }

    // ── 2b. Hardcoded English literals (i18n regression guard) ──
    // WARN-LEVEL ONLY — too noisy to block commits, but catches genuine
    // residual hardcoded EN strings that should go through t('key') instead.
    //
    // HEURISTIC: flag user-facing string literals that are either
    //   (a) JSX text content between tags: >Some Text<
    //   (b) user-facing string props: placeholder= title= aria-label= label=
    //       text= subtitle= confirmLabel= header=
    // that contain 2+ words OR a single capitalized word ≥3 chars, contain a
    // letter, and are NOT already wrapped in a t(...) call on the same line.
    //
    // ALLOWLIST — false-positive suppressors (do NOT gut this to get zero):
    //   • t( on same line (already i18n'd)
    //   • All-caps acronyms ≤4 chars: HERO SURV LIVE PRO NXL OT W L etc.
    //   • Single symbols / emoji / punctuation
    //   • Hex colours, URLs (http, sk-, /)
    //   • data-testid / className / key= / id= props
    //   • CSS-like values (px / % / # / rgb)
    //   • Numbers only
    //   • Test/spec files (*.test.* / *.spec.*)
    //   • Canvas-draw files: src/components/field/** *Canvas* drawStrokes
    //   • Domain-data words: see EN_LITERAL_DOMAIN_WORDS in isLikelyUIEnLiteral()
    //   • Lines containing JS comparison operators (ternaries, arrow fns — code not JSX)
    //
    // To suppress a legitimate literal (e.g. a canonical domain label), add
    // it to EN_LITERAL_DOMAIN_WORDS in isLikelyUIEnLiteral() above.
    if ((isPage || isComponent)) {
      // Skip canvas-draw files and test files
      const isCanvasFile = rel.includes('field/') || rel.includes('Canvas') || rel.includes('drawStrokes');
      const isTestFile = /\.(test|spec)\./.test(rel);
      if (!isCanvasFile && !isTestFile && !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
        // Skip if t( appears on same line (already i18n'd or fallback pattern)
        if (!line.includes('t(')) {
          // Pattern A: JSX text content >SomeText< (between > and <)
          // Captures text nodes that are direct string children of JSX elements.
          // Skip lines with JS ternary/comparison operators that could produce
          // false matches like "> ak ? 1 : bk <" being parsed as JSX text.
          const hasJSOp = /[?:=]/.test(trimmed) && /\breturn\b|=>|&&|\|\|/.test(trimmed);
          if (!hasJSOp) {
            const jsxTextMatches = line.matchAll(/>\s*([A-Za-z][^<>{}\n]{1,80}?)\s*</g);
            for (const m of jsxTextMatches) {
              const val = m[1].trim();
              if (isLikelyUIEnLiteral(val)) {
                WARNINGS.push(`${rel}:${ln} — EN literal (JSX text): "${val.substring(0, 60)}" — wrap in t('key')`);
                break; // one warning per line
              }
            }
          }

          // Pattern B: user-facing string props
          // placeholder= title= aria-label= label= text= subtitle= confirmLabel= header=
          // Uses separate patterns for single-quoted and double-quoted to handle
          // apostrophes in double-quoted values (e.g. "Couldn't load this team")
          const propNames = '(?:placeholder|title|aria-label|label|text|subtitle|confirmLabel|header)';
          // Double-quoted values: allow apostrophes inside
          const propPatternDbl = new RegExp(`${propNames}\\s*=\\s*"([^"]{2,120})"`, 'g');
          // Single-quoted values: no apostrophes allowed (would break string)
          const propPatternSgl = new RegExp(`${propNames}\\s*=\\s*'([^']{2,120})'`, 'g');
          for (const propPattern of [propPatternDbl, propPatternSgl]) {
            const propMatches = line.matchAll(propPattern);
            for (const m of propMatches) {
              const val = m[1].trim();
              if (isLikelyUIEnLiteral(val)) {
                WARNINGS.push(`${rel}:${ln} — EN literal (prop): "${val.substring(0, 60)}" — wrap in t('key')`);
                break; // one warning per line
              }
            }
          }
        }
      }
    }

    // ── 3. Hardcoded styles ──
    // Font family not using FONT token
    if (/fontFamily:\s*['"](?!var)/.test(line) && !/FONT/.test(line) && !trimmed.startsWith('//')) {
      WARNINGS.push(`${rel}:${ln} — Hardcoded fontFamily — use FONT from theme.js`);
    }
    // Hardcoded amber/accent colors (should use COLORS.accent)
    if (/#f59e0b|#fbbf24|#d97706/i.test(line) && !/theme\.js/.test(rel) && !trimmed.startsWith('//')) {
      WARNINGS.push(`${rel}:${ln} — Hardcoded accent color — use COLORS.accent from theme.js`);
    }

    // ── 4. Touch target violations ──
    if (/minHeight:\s*(\d+)/.test(line)) {
      const h = parseInt(RegExp.$1);
      if (h > 0 && h < 36 && (isPage || isComponent)) {
        // Only flag interactive elements
        if (/button|btn|click|tap|select|input/i.test(line) || /cursor:\s*['"]pointer/i.test(line)) {
          WARNINGS.push(`${rel}:${ln} — minHeight: ${h}px < 36px — touch target too small`);
        }
      }
    }
    // Width/height on interactive elements
    if (/width:\s*(\d+),\s*height:\s*(\d+)/.test(line)) {
      const w = parseInt(RegExp.$1), h = parseInt(RegExp.$2);
      if (w < 28 && h < 28 && /onClick|cursor.*pointer/i.test(line)) {
        WARNINGS.push(`${rel}:${ln} — ${w}×${h}px interactive element — may be too small`);
      }
    }

    // ── 5. Sticky without zIndex ──
    if (/position:\s*['"]?sticky/i.test(line)) {
      // Check next 3 lines for zIndex
      const context = lines.slice(idx, idx + 4).join(' ');
      if (!/zIndex/.test(context)) {
        WARNINGS.push(`${rel}:${ln} — sticky position without zIndex — add zIndex: 20`);
      }
    }

    // ── 6. Inconsistent header patterns ──
    if (isPage && /padding:\s*['"]?8px 16px/i.test(line) && /sticky/.test(lines.slice(idx, idx + 3).join(' '))) {
      WARNINGS.push(`${rel}:${ln} — Header padding 8px — should be 10px 16px for consistency`);
    }

    // ── 7. CSS modules / Tailwind (forbidden) ──
    if (/className=/.test(line) && !/fade-in|slide-up|slide-in|print-area/.test(line)) {
      WARNINGS.push(`${rel}:${ln} — className used — use inline JSX styles with theme tokens`);
    }

    // ── 8. Non-sticky bottom bars ──
    if (isPage && /bottom.*0|paddingBottom.*safe-area/.test(line)) {
      const context = lines.slice(Math.max(0, idx - 5), idx + 1).join(' ');
      if (!/sticky|fixed/.test(context) && /ModeTab|ActionBar|action.*bar/i.test(context)) {
        WARNINGS.push(`${rel}:${ln} — Bottom bar not sticky — add position: sticky, bottom: 0`);
      }
    }
  });
}

// ── Run ──
console.log('🔍 PbScoutPro UI Lint\n');

const files = walk(SRC);
let fileCount = 0;

for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const lines = content.split('\n');
  check(file, content, lines);
  fileCount++;
}

// ── Report ──
if (ERRORS.length === 0 && WARNINGS.length === 0) {
  console.log(`✅ ${fileCount} files checked — all clean!\n`);
} else {
  if (ERRORS.length > 0) {
    console.log(`❌ ERRORS (${ERRORS.length}) — must fix:\n`);
    ERRORS.forEach(e => console.log(`  ${e}`));
    console.log('');
  }
  if (WARNINGS.length > 0) {
    console.log(`⚠️  WARNINGS (${WARNINGS.length}) — should fix:\n`);
    WARNINGS.forEach(w => console.log(`  ${w}`));
    console.log('');
  }
  console.log(`📊 ${fileCount} files | ${ERRORS.length} errors | ${WARNINGS.length} warnings\n`);
}

process.exit(ERRORS.length > 0 ? 1 : 0);
