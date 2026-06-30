#!/usr/bin/env node
/**
 * gen-app-map.cjs — regenerates the AUTOGEN blocks in APP_MAP.md from code.
 *
 *   node scripts/gen-app-map.cjs           writes APP_MAP.md (§2/§3/§5 blocks)
 *   node scripts/gen-app-map.cjs --check   exits 1 if APP_MAP.md would change
 *
 * It owns ONLY the regions between
 *   <!-- AUTOGEN:<name> START -->  …  <!-- AUTOGEN:<name> END -->
 * markers (names: routes, ui, tokens, flags). Everything else in APP_MAP.md is
 * hand-maintained and never touched. A block whose marker pair is absent is
 * skipped (with a warning) — so the generator works against any skeleton that
 * carries some/all of the four markers.
 *
 * No external deps — best-effort regex/brace-balanced parsing of four source
 * files. Parses it could NOT do cleanly are emitted as a "> ⚠ parse note: …"
 * line inside the relevant block so the doc stays honest about its own gaps.
 *
 * Sources:
 *   routes  ← src/App.jsx              (<Route path=… element=…>)
 *   ui      ← src/components/ui.jsx     (export function X({ …props }))
 *   tokens  ← src/utils/theme.js        (curated list of export const groups)
 *   flags   ← src/utils/featureFlags.js (STATIC_FLAGS + DYNAMIC_FLAG_DEFAULTS)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const APP_MAP = path.join(ROOT, 'APP_MAP.md');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// ── Generic helpers ───────────────────────────────────────────────────────

/**
 * From `text` with `open` pointing at an opening bracket, return the index of
 * the matching close bracket. Respects nesting + single/double/backtick quotes.
 * Returns -1 if unbalanced.
 */
function matchBracket(text, open) {
  const pairs = { '(': ')', '{': '}', '[': ']' };
  if (!pairs[text[open]]) return -1;
  let depth = 0;
  let quote = null;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/**
 * Split `body` (inside-braces text) on TOP-LEVEL commas, ignoring commas inside
 * nested ()/{}/[] or quotes.
 */
function splitTopLevel(body) {
  const out = [];
  let depth = 0, quote = null, start = 0;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      if (c === '\\') { i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '(' || c === '{' || c === '[') depth++;
    else if (c === ')' || c === '}' || c === ']') depth--;
    else if (c === ',' && depth === 0) { out.push(body.slice(start, i)); start = i + 1; }
  }
  if (body.slice(start).trim()) out.push(body.slice(start));
  return out;
}

const escapePipe = (s) => String(s).replace(/\|/g, '\\|');

/**
 * Strip `// line` and block comments from JS source, quote/template-aware so a
 * `//` or `/* *​/` inside a string literal is preserved. A `/` not followed by
 * `/` or `*` (regex delimiter, division) is left untouched. Needed before
 * brace-matching/object-parsing: trailing line-comments otherwise swallow the
 * next object key, and an apostrophe inside a comment desyncs the quote tracker.
 */
function stripComments(text) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    const n = text[i + 1];
    if (quote) {
      out += c;
      if (c === '\\') { out += n; i++; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
    if (c === '/' && n === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    if (c === '/' && n === '*') {
      i += 2;
      while (i < text.length && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i++; // land on '/'
      continue;
    }
    out += c;
  }
  return out;
}

// ── §2 routes ──────────────────────────────────────────────────────────────

function genRoutes() {
  const src = read('src/App.jsx');
  const notes = [];

  // lazy(() => import('./pages/Foo')) → component name set
  const lazySet = new Set();
  const lazyRe = /const\s+(\w+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(/g;
  let m;
  while ((m = lazyRe.exec(src))) lazySet.add(m[1]);

  const GUARDS = ['RouteGuard', 'AdminGuard', 'SuperAdminGuard'];
  const rows = [];
  let idx = 0;
  while ((idx = src.indexOf('<Route', idx)) !== -1) {
    const tagEnd = src.indexOf('>', idx);
    const head = src.slice(idx, tagEnd + 1);

    // path — "..." or {expr}
    let routePath = null;
    const pm = head.match(/\bpath=("([^"]*)"|\{([^}]*)\})/);
    if (pm) routePath = pm[2] != null ? pm[2] : `{${pm[3].trim()}}`;

    // element={ … } — brace-balanced from the `{` after element=
    let element = '';
    const elKey = head.indexOf('element=');
    if (elKey !== -1) {
      const braceAbs = src.indexOf('{', idx + elKey);
      const close = matchBracket(src, braceAbs);
      if (close !== -1) element = src.slice(braceAbs + 1, close);
    }

    if (routePath != null) {
      const guard = GUARDS.find((g) => element.includes(`<${g}`)) || 'none';
      let component = '?';
      const compRe = /<([A-Z]\w+)/g;
      let cm;
      while ((cm = compRe.exec(element))) {
        if (!GUARDS.includes(cm[1])) { component = cm[1]; break; }
      }
      if (component === '?') notes.push(`could not resolve component for path ${routePath}`);
      const lazy = lazySet.has(component) ? 'yes' : 'no';
      const before = src.slice(Math.max(0, idx - 80), idx).trim();
      const conditional = /&&$/.test(before) ? ' ⚑cond' : '';
      rows.push(
        `| \`${escapePipe(routePath)}\` | ${component}${conditional} | ${guard} | ${lazy} |`
      );
    }
    idx = tagEnd + 1;
  }

  const out = [];
  out.push(`_${rows.length} routes parsed from \`src/App.jsx\`. \`⚑cond\` = route mounted behind a build-time condition (e.g. emulator-only)._`);
  out.push('');
  out.push('| path | component | guard | lazy |');
  out.push('|---|---|---|---|');
  out.push(...rows);
  if (notes.length) { out.push(''); notes.forEach((n) => out.push(`> ⚠ parse note: ${n}`)); }
  return { text: out.join('\n'), count: rows.length };
}

// ── §3 ui catalog ─────────────────────────────────────────────────────────

function genUi() {
  const src = read('src/components/ui.jsx');
  const notes = [];
  const rows = [];

  const fnRe = /export\s+function\s+(\w+)\s*\(/g;
  let m;
  while ((m = fnRe.exec(src))) {
    const name = m[1];
    const parenOpen = src.indexOf('(', m.index + m[0].length - 1);
    const parenClose = matchBracket(src, parenOpen);
    if (parenClose === -1) { notes.push(`could not balance params for ${name}()`); continue; }
    const params = src.slice(parenOpen + 1, parenClose).trim();

    let props;
    if (params.startsWith('{')) {
      const braceClose = matchBracket(params, 0);
      const body = params.slice(1, braceClose);
      props = splitTopLevel(body)
        .map((p) => {
          const t = p.trim();
          const rest = t.match(/^\.\.\.\s*(\w+)/);
          if (rest) return `...${rest[1]}`;
          return (t.match(/^([A-Za-z_$][\w$]*)/) || [])[1];
        })
        .filter(Boolean);
    } else if (params === '') {
      props = [];
    } else {
      props = [`(positional: ${params.replace(/\s+/g, ' ')})`];
      notes.push(`${name}() takes positional params, not a destructure`);
    }

    rows.push(`| \`${name}\` | ${props.length ? props.map((p) => `\`${escapePipe(p)}\``).join(', ') : '—'} |`);
  }

  const constRe = /export\s+const\s+(\w+)\s*=/g;
  const otherExports = [];
  while ((m = constRe.exec(src))) otherExports.push(m[1]);

  const out = [];
  out.push(`_${rows.length} exported components parsed from \`src/components/ui.jsx\` (props = destructured signature names)._`);
  out.push('');
  out.push('| component | props |');
  out.push('|---|---|');
  out.push(...rows);
  if (otherExports.length) {
    out.push('');
    out.push(`> Non-function exports (not parsed for props): ${otherExports.map((e) => `\`${e}\``).join(', ')}`);
  }
  if (notes.length) { out.push(''); notes.forEach((n) => out.push(`> ⚠ parse note: ${n}`)); }
  return { text: out.join('\n'), count: rows.length };
}

// ── §5 design tokens ───────────────────────────────────────────────────────

// Curated group list (per APP_MAP §5 spec). Each is an `export const NAME = …`.
const TOKEN_GROUPS = [
  'COLORS', 'ELEV', 'FONT', 'FONT_COND', 'FONT_SIZE',
  'RADIUS', 'SPACE', 'TOUCH', 'TEAM_COLORS', 'TRACKING', 'TYPE', 'TNUM',
];

function isPrimitiveValue(v) {
  const t = v.trim().replace(/,?\s*$/, '');
  if (/[{([]/.test(t)) return false;        // object / array / call
  if (/`[^`]*\$\{/.test(t)) return false;   // template w/ interpolation
  return /^['"`].*['"`]$/.test(t) || /^-?[\d.]+$/.test(t) || /^#[0-9a-fA-F]+$/.test(t);
}

function parseObjectKeys(objText) {
  return splitTopLevel(objText)
    .map((entry) => {
      const e = entry.trim();
      if (!e) return null;
      // key may be `name`, `name:`, `'name':`, or a method `name(...)`
      const km = e.match(/^['"]?([A-Za-z_$][\w$]*)['"]?\s*[:(]/);
      if (!km) return null;
      const key = km[1];
      const isMethod = e[km[0].length - 1] === '(';
      const valueRaw = isMethod ? '' : e.slice(km[0].length).trim();
      return { key, value: isPrimitiveValue(valueRaw) ? valueRaw.trim() : null };
    })
    .filter(Boolean);
}

function genTokens() {
  const src = stripComments(read('src/utils/theme.js'));
  const notes = [];
  const out = [];
  let groupCount = 0;

  for (const name of TOKEN_GROUPS) {
    const declRe = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*`, 'g');
    const dm = declRe.exec(src);
    if (!dm) { notes.push(`export const ${name} not found`); continue; }
    const valStart = dm.index + dm[0].length;

    if (src[valStart] === '{') {
      const close = matchBracket(src, valStart);
      const body = src.slice(valStart + 1, close);
      const keys = parseObjectKeys(body);
      groupCount++;
      out.push(`**${name}** (${keys.length} keys): ` + keys
        .map((k) => (k.value != null ? `\`${k.key}\`=${escapePipe(k.value)}` : `\`${k.key}\``))
        .join(' · '));
      out.push('');
    } else {
      const semi = src.indexOf(';', valStart);
      const raw = src.slice(valStart, semi).trim();
      groupCount++;
      out.push(`**${name}**: \`${escapePipe(raw)}\``);
      out.push('');
    }
  }

  const header = `_${groupCount} token groups parsed from \`src/utils/theme.js\`. Object values shown where primitive (hex / number / string); computed values (gradients, functions, arrays) show the key only._\n`;
  if (notes.length) { out.push(''); notes.forEach((n) => out.push(`> ⚠ parse note: ${n}`)); }
  return { text: header + '\n' + out.join('\n').trim(), count: groupCount };
}

// ── flags ──────────────────────────────────────────────────────────────────

function objBodyOf(src, name) {
  const declRe = new RegExp(`export\\s+const\\s+${name}\\s*=\\s*`, 'g');
  const dm = declRe.exec(src);
  if (!dm) return null;
  const valStart = dm.index + dm[0].length;
  if (src[valStart] !== '{') return null;
  const close = matchBracket(src, valStart);
  return src.slice(valStart + 1, close);
}

function genFlags() {
  const src = stripComments(read('src/utils/featureFlags.js'));
  const notes = [];

  const staticBody = objBodyOf(src, 'STATIC_FLAGS');
  const dynBody = objBodyOf(src, 'DYNAMIC_FLAG_DEFAULTS');

  const out = [];

  // Static flags — key + raw default expression.
  const staticRows = [];
  if (staticBody == null) {
    notes.push('STATIC_FLAGS object not found');
  } else {
    for (const entry of splitTopLevel(staticBody)) {
      const e = entry.trim();
      const km = e.match(/^(\w+)\s*:/);
      if (!km) continue;
      const raw = e.slice(km[0].length).trim();
      staticRows.push(`| \`${km[1]}\` | \`${escapePipe(raw)}\` |`);
    }
  }

  // Dynamic flags — key + enabled + audience parsed from the nested object.
  const dynRows = [];
  if (dynBody == null) {
    notes.push('DYNAMIC_FLAG_DEFAULTS object not found');
  } else {
    for (const entry of splitTopLevel(dynBody)) {
      const e = entry.trim();
      const km = e.match(/^(\w+)\s*:/);
      if (!km) continue;
      const enabled = (e.match(/enabled\s*:\s*(true|false)/) || [])[1] || '?';
      const audience = (e.match(/audience\s*:\s*['"]([^'"]+)['"]/) || [])[1] || '?';
      dynRows.push(`| \`${km[1]}\` | ${enabled} | ${audience} |`);
    }
  }

  out.push(`_${staticRows.length} static + ${dynRows.length} dynamic flags parsed from \`src/utils/featureFlags.js\`._`);
  out.push('');
  out.push('**Static** (hardcoded; change = deploy)');
  out.push('');
  out.push('| flag | default |');
  out.push('|---|---|');
  out.push(...staticRows);
  out.push('');
  out.push('**Dynamic** (Firestore `/workspaces/{slug}/config/featureFlags`; per-`audience`)');
  out.push('');
  out.push('| flag | enabled | audience |');
  out.push('|---|---|---|');
  out.push(...dynRows);
  if (notes.length) { out.push(''); notes.forEach((n) => out.push(`> ⚠ parse note: ${n}`)); }
  return { text: out.join('\n'), count: staticRows.length + dynRows.length };
}

// ── Block replacement ──────────────────────────────────────────────────────

// Replace the content between an AUTOGEN marker pair. Returns the new doc, or
// null if the marker pair is absent (caller skips that block).
function replaceBlock(doc, name, body) {
  const start = `<!-- AUTOGEN:${name} START -->`;
  const end = `<!-- AUTOGEN:${name} END -->`;
  const si = doc.indexOf(start);
  const ei = doc.indexOf(end);
  if (si === -1 || ei === -1) return null;
  return doc.slice(0, si + start.length) + '\n' + body + '\n' + doc.slice(ei);
}

function main() {
  const check = process.argv.includes('--check');
  const original = fs.readFileSync(APP_MAP, 'utf8');

  const blocks = [
    ['routes', genRoutes()],
    ['ui', genUi()],
    ['tokens', genTokens()],
    ['flags', genFlags()],
  ];

  let next = original;
  const filled = [];
  for (const [name, result] of blocks) {
    const replaced = replaceBlock(next, name, result.text);
    if (replaced == null) {
      console.warn(`  ⚠ AUTOGEN:${name} markers not found — block skipped.`);
      continue;
    }
    next = replaced;
    filled.push(`${name}: ${result.count}`);
  }

  if (check) {
    if (next !== original) {
      console.error('✗ APP_MAP.md is STALE — run `npm run app-map` and commit the result.');
      process.exit(1);
    }
    console.log('✓ APP_MAP.md AUTOGEN blocks are up to date.');
    return;
  }

  if (next !== original) {
    fs.writeFileSync(APP_MAP, next);
    console.log('✓ APP_MAP.md regenerated.');
  } else {
    console.log('✓ APP_MAP.md already up to date (no change).');
  }
  console.log('  ' + filled.join('  ·  '));
}

main();
