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

function check(file, content, lines) {
  const rel = relative('.', file);
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
    // Check for Polish diacritics in JSX strings (not comments)
    if (/['"`][^'"`]*[ąęóśźżćńłĄĘÓŚŹŻĆŃŁ][^'"`]*['"`]/.test(line)) {
      // Exclude comments
      if (!trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('/*')) {
        WARNINGS.push(`${rel}:${ln} — Polish string detected — translate to English`);
      }
    }
    // Common Polish words that don't have diacritics
    const polishWords = /['"`](Ładowanie|Sprawdzanie|Przygotowanie|Turniej|Strzały|Pozycja|Rysuj|Narysuj|Zapisz|Usuń|Edytuj|Dodaj|Szukaj|Notatki|Ksywka|Imię|Nazwisko|Drużyna|Gracz)['"`]/;
    if (polishWords.test(line) && !trimmed.startsWith('//')) {
      WARNINGS.push(`${rel}:${ln} — Polish word in UI string — translate to English`);
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
