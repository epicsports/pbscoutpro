#!/usr/bin/env node
/**
 * build-findings-full.cjs — wave-2 register. Reads audit/findings-full.json
 * (5-role stress crawl) + audit/findings.json (wave-1, for novelty diff) and
 * writes audit/FINDINGS_FULL.md: summary by severity AND novelty, 10 worst,
 * systemic patterns, per-role exclusive sections, archetype register, plus
 * wave-1 findings that DISAPPEARED on stress data (suspicious).
 *
 * Severity = SUGGESTION (triage = Jacek + Opus). Run: node scripts/audit/build-findings-full.cjs
 */
const fs = require('fs');
const path = require('path');
const OUT = 'audit';
const TOKEN_BG = 'rgb(10, 14, 23)';
const full = JSON.parse(fs.readFileSync(path.join(OUT, 'findings-full.json'), 'utf8'));
// Watchdog abort marker (GUARD #2): a synthetic record means the run was killed
// mid-flight for staleness — the register is PARTIAL. Pull it out of the data
// rows (it carries no real flags) and surface it as a banner.
const abortRec = (full.findings || []).find(r => r.novelty === 'RUN-ABORTED-WATCHDOG');
full.findings = (full.findings || []).filter(r => r.novelty !== 'RUN-ABORTED-WATCHDOG');
full.roles = full.roles || [...new Set(full.findings.map(r => r.role))];
full.viewports = full.viewports || [...new Set(full.findings.map(r => r.viewport))];
full.routeCount = full.routeCount || new Set(full.findings.map(r => r.route)).size;
let wave1 = null;
try { wave1 = JSON.parse(fs.readFileSync(path.join(OUT, 'findings.json'), 'utf8')); } catch (_) {}

// Flag extractor — shared shape (records carry the check fields).
// check #8 (crash-state): a captured crash is NOT a layout finding. If the route
// rendered the Sentry "Crash Report" fallback (crashUI / contentStatus
// FAILED-CONTENT), emit ONLY the crash flag and SKIP every geometry check — a dead
// React tree has bogus widths/heights that would pollute the layout register
// (this was the wave-1-INVALID root cause: the crash screen measured as findings).
function flagsFor(r) {
  const f = [];
  if (r.crashUI || r.contentStatus === 'FAILED-CONTENT') {
    f.push({ sev: 'P0', check: 'crash-screen', detail: `Sentry Crash Report rendered${r.consoleErrors ? ` · ${r.consoleErrors} console err` : ''}${(r.consoleErrSample || []).length ? ` · e.g. ${(r.consoleErrSample || []).join(' | ')}` : ''}` });
    return f; // crash dominates — do not measure a dead tree
  }
  // A FAILED capture (login-blocked / not-ready / per-route timeout / watchdog
  // abort) is a COVERAGE GAP, not a layout finding — the route never rendered, so
  // its geometry is meaningless. Surfaced in the "Failed / blocked captures"
  // roll-up + coverage banner, NOT as a P0 that inflates the layout register
  // (e.g. a login-blocked role would otherwise emit one render-error per route).
  if (r.novelty === 'FAILED' || r.novelty === 'RUN-ABORTED-WATCHDOG') return f;
  if (r.error) f.push({ sev: 'P0', check: 'render-error', detail: r.error });
  else if ((r.bodyText ?? 0) < 10 && !r.redirected) f.push({ sev: 'P0', check: 'blank-screen', detail: `innerText ${r.bodyText}` });
  if (r.hScroll > 2) f.push({ sev: 'P0', check: 'h-scroll', detail: `+${r.hScroll}px` });
  if (r.offRight > 0 && r.worstRight > 4) f.push({ sev: 'P1', check: 'off-viewport', detail: `${r.offRight} el; worst +${r.worstRight}px` });
  if (r.tooWide > 0) f.push({ sev: 'P1', check: 'wider-than-viewport', detail: `${r.tooWide} el` });
  if (r.vClip > 0) f.push({ sev: 'P1', check: 'v-overflow-clip', detail: `${r.vClip} fixed-height container(s) clip content` });
  if (r.smallTargets > 0) f.push({ sev: 'P1', check: 'touch<44', detail: `${r.smallTargets}× e.g. ${(r.smallSamples || []).join(' · ')}` });
  if (r.textBrokenClip > 0) f.push({ sev: 'P1', check: 'text-broken-clip', detail: `${r.textBrokenClip} text node(s) clipped w/o ellipsis (broken wrap on stress name)` });
  if (r.canvas && r.orient === 'landscape' && r.canvasH != null) {
    const pct = Math.round((r.canvasH / r.vh) * 100);
    if (pct < 95) f.push(r.viewport === 'phone-landscape' ? { sev: 'P0', check: 'hero<95%@phone-ls', detail: `${pct}%` } : { sev: 'P2', check: `hero ${pct}%@${r.viewport}`, detail: 'geometry (sanctioned)' });
  }
  if (r.bodyBg && r.bodyBg !== TOKEN_BG) f.push({ sev: 'P1', check: 'bg≠token', detail: r.bodyBg });
  if (r.textEllipsis > 0) f.push({ sev: 'P2', check: 'text-ellipsis', detail: `${r.textEllipsis} (by-design — verify)` });
  // console errors WITHOUT a crash screen = soft signal (the UI rendered, but
  // something threw/logged-error in the background — worth an eyeball, not a P0).
  if ((r.consoleErrors ?? 0) > 0) f.push({ sev: 'P2', check: 'console-error', detail: `${r.consoleErrors}× e.g. ${(r.consoleErrSample || []).join(' | ') || '(no sample)'}` });
  return f;
}
const rank = { P0: 0, P1: 1, P2: 2 };
const ckey = (route, viewport, check) => `${route}|${viewport}|${check.replace(/\d+%?|@\S+/g, '').trim()}`;

const rows = full.findings.map(r => ({ ...r, flags: flagsFor(r) }));
const coach = rows.filter(r => r.role === 'coach');
const others = rows.filter(r => r.role !== 'coach');

// Novelty vs wave-1 (match coach by route|viewport|check).
const w1set = new Set();
if (wave1) for (const r of wave1.findings) for (const fl of flagsFor(r)) w1set.add(ckey(r.route, r.viewport, fl.check));
const coachSet = new Set();
for (const r of coach) for (const fl of r.flags) coachSet.add(ckey(r.route, r.viewport, fl.check));

const counts = { sev: { P0: 0, P1: 0, P2: 0 }, nov: { 'carried-from-wave1': 0, 'new-on-stress': 0, 'new-role-specific': 0 } };
// coach findings → carried vs new-on-stress
for (const r of coach) for (const fl of r.flags) {
  counts.sev[fl.sev]++;
  counts.nov[w1set.has(ckey(r.route, r.viewport, fl.check)) ? 'carried-from-wave1' : 'new-on-stress']++;
}
// non-coach delta findings → new-role-specific
const roleFindings = others.filter(r => r.delta && r.flags.length);
for (const r of roleFindings) for (const fl of r.flags) { counts.sev[fl.sev]++; counts.nov['new-role-specific']++; }

// disappeared = wave-1 flags not present in coach wave-2
const disappeared = [...w1set].filter(k => !coachSet.has(k));

// check #8 roll-up: crash screens + soft console-error captures (across ALL roles).
const crashCaps = rows.filter(r => r.crashUI || r.contentStatus === 'FAILED-CONTENT');
const consoleCaps = rows.filter(r => !crashCaps.includes(r) && (r.consoleErrors ?? 0) > 0);
// FAILED captures (coverage gaps): login-blocked / not-ready / per-route timeout.
// Grouped so a whole-role block reads as one line, not N route lines.
const failedCaps = rows.filter(r => r.novelty === 'FAILED');
const failedByRole = {};
for (const r of failedCaps) (failedByRole[r.role] ||= []).push(r);

// worst (coach + role findings)
const scored = [...coach, ...roleFindings].map(r => ({ r, score: r.flags.reduce((s, fl) => s + (fl.sev === 'P0' ? 100 : fl.sev === 'P1' ? 10 : 1), 0) })).filter(x => x.score > 0).sort((a, b) => b.score - a.score);

// systemic (coach)
const byArch = {}; for (const r of coach) (byArch[r.archetype] ||= []).push(r);
const systemic = [];
for (const [arch, rs] of Object.entries(byArch)) {
  const hits = {}; for (const r of rs) for (const fl of r.flags) (hits[fl.check.replace(/\d+%?|@\S+/g, '').trim()] ||= new Set()).add(r.route);
  for (const [c, routes] of Object.entries(hits)) if (routes.size >= 3) systemic.push(`**${arch}** · \`${c}\` × ${routes.size} routes (${[...routes].slice(0, 6).join(', ')})`);
}

// per-role: exclusive (role-exclusive novelty) + differs + blocked counts
const roleSummary = {};
for (const R of full.roles) {
  if (R === 'coach') continue;
  const rr = others.filter(r => r.role === R);
  roleSummary[R] = {
    exclusive: rr.filter(r => r.novelty === 'role-exclusive'),
    differs: rr.filter(r => r.novelty === 'differs-from-coach'),
    blocked: new Set(rr.filter(r => r.novelty === 'blocked').map(r => r.route)).size,
    same: rr.filter(r => r.novelty === 'same-as-coach').length,
  };
}

let md = `# Cross-device render audit — FINDINGS_FULL **v2** (wave 2: stress data × 5-role matrix)\n\n`;
md += `> **⛔ v1 of this file (prior git revision) is INVALID — do not triage from it.** v1 was generated\n> before the generateInsights \`zoneShots\` crash was fixed; a hash-only \`goto\` left a dead React tree,\n> so most v1 captures measured the Sentry "Crash Report" fallback as if it were the screen. v2 was\n> produced on the fixed code + harness (crash guard, \`about:blank\` cascade isolation, check #8). The v1\n> text is kept in git history only. See \`docs/ops/AUDIT_RUNBOOK.md\` for the discipline that follows.\n\n`;
md += `_${full.roles.length} roles × ${full.routeCount} routes × ${full.viewports.length} viewports = ${rows.length} captures. Coach = full baseline; other roles report exclusive + differs-from-coach only. Severity & novelty are SUGGESTIONS — triage = Jacek + Opus._\n`;
md += `_Screenshots: \`audit/screenshots-full/<role>/<route>__<viewport>.png\`. This file REPLACES FINDINGS.md as the living register._\n\n`;
// Coverage: a role is "captured" if it has ≥1 non-FAILED record, else "blocked/partial".
const captured = full.roles.filter(R => rows.some(r => r.role === R && r.novelty !== 'FAILED'));
const blockedRoles = full.roles.filter(R => !captured.includes(R));
md += `## Run coverage & caveats\n`;
if (abortRec) md += `- **⛔ RUN ABORTED BY WATCHDOG — this register is PARTIAL.** ${abortRec.error}. Captures below cover only what completed before the abort. Diagnose the wedge (last completed capture named in the reason), fix, and re-run before triage.\n`;
md += `- **Captured roles:** ${captured.join(', ') || 'none'}.\n`;
if (blockedRoles.length) md += `- **NOT captured (automated):** ${blockedRoles.join(', ')} — non-admin auto-enter never resolved ("Preparing your workspace…"; the blocking member-write logged as a backlog perf item). Their **access deltas are in \`audit/REACHABILITY_MAP.md\`** (guard-derived, authoritative); their allowed-route RENDER ≈ coach baseline (shared components, no role-branched layout). Re-run is role-fail-fast (records them as login-blocked + continues, no hang).\n`;
md += `- **"Disappeared since wave-1" is mostly EXPECTED, not regressions:** wave-1's touch<44 cluster was FIXED (fix/audit-touch-spill, in this branch) and the spill was escalated; wave-2 also uses a different stress fixture (lay-stress w/ fieldImage vs base-demo null). Verify the few non-touch entries; ignore the touch<44 ones.\n\n`;
md += `## Crash / error state (check #8)\n`;
md += `- **Crash screens (Sentry "Crash Report" rendered ⇒ FAILED-CONTENT, excluded from layout flags):** ${crashCaps.length}`;
if (crashCaps.length) md += `\n` + crashCaps.map(r => `  - ${r.role} · ${r.route} · ${r.viewport}${r.consoleErrors ? ` (${r.consoleErrors} console err)` : ''}`).join('\n');
md += `\n- **Captures with console errors but NO crash screen (soft signal — eyeball):** ${consoleCaps.length}`;
if (consoleCaps.length) md += `\n` + consoleCaps.slice(0, 12).map(r => `  - ${r.role} · ${r.route} · ${r.viewport}: ${r.consoleErrors}×`).join('\n') + (consoleCaps.length > 12 ? `\n  - …+${consoleCaps.length - 12} more` : '');
md += `\n- **NOTE:** A crash capture is NOT a layout finding. If this count is >0, fix the crash and RE-RUN before trusting any layout numbers below (a dead React tree measures garbage — the wave-1 INVALID lesson).\n\n`;
md += `## Failed / blocked captures (coverage gaps — NOT layout findings)\n`;
md += `- **Total FAILED captures:** ${failedCaps.length}`;
if (failedCaps.length) {
  md += `\n` + Object.entries(failedByRole).map(([role, rs]) => {
    const n = rs.length, total = full.viewports.length * full.routeCount;
    const sample = rs[0]?.error || '';
    const whole = n >= total ? ' (WHOLE ROLE — not captured)' : '';
    return `  - **${role}** — ${n} failed${whole}: ${sample}`;
  }).join('\n');
}
md += `\n- These never rendered, so they carry NO geometry flags (excluded from the layout register). Per-route timeouts inside a captured role mean that route is unverified.\n\n`;
md += `## Summary\n**By severity:** P0 ${counts.sev.P0} · P1 ${counts.sev.P1} · P2 ${counts.sev.P2}\n\n`;
md += `**By novelty:** carried-from-wave1 ${counts.nov['carried-from-wave1']} · new-on-stress-data ${counts.nov['new-on-stress']} · new-role-specific ${counts.nov['new-role-specific']}\n\n`;
md += `**Disappeared since wave-1 (SUSPICIOUS — verify the screen, not just the metric):** ${disappeared.length}${disappeared.length ? '\n' + disappeared.map(d => `  - ${d}`).join('\n') : ''}\n\n`;
md += `## 10 worst (role · route · viewport)\n\n| # | role | route | viewport | score | flags |\n|---|---|---|---|---|---|\n`;
scored.slice(0, 10).forEach((x, i) => { md += `| ${i + 1} | ${x.r.role} | ${x.r.route} | ${x.r.viewport} | ${x.score} | ${x.r.flags.map(f => `${f.sev} ${f.check}`).join('; ')} |\n`; });
md += `\n## Systemic patterns (coach baseline)\n\n${systemic.length ? systemic.map(s => '- ' + s).join('\n') : '_none ≥3 routes_'}\n\n`;

md += `## Per-role (vs coach baseline)\n\n`;
for (const [R, s] of Object.entries(roleSummary)) {
  md += `### ${R}\n- exclusive routes (not in coach set): ${s.exclusive.length ? [...new Set(s.exclusive.map(r => r.route))].join(', ') : 'none'}\n- routes rendering DIFFERENT from coach: ${s.differs.length ? [...new Set(s.differs.map(r => r.route))].join(', ') : 'none'}\n- blocked/redirected routes: ${s.blocked} · same-as-coach captures: ${s.same}\n`;
  const rf = roleFindings.filter(r => r.role === R);
  if (rf.length) { md += `- flags on exclusive/differing screens:\n`; for (const r of rf) for (const fl of r.flags) md += `  - ${r.route} ${r.viewport}: ${fl.sev} ${fl.check} — ${fl.detail.replace(/\|/g, '\\|')}\n`; }
  md += `\n`;
}

md += `## Archetype register (coach baseline — full matrix)\n\n`;
for (const arch of ['List', 'Detail', 'Canvas', 'Form', 'Admin']) {
  const rs = (byArch[arch] || []).filter(r => r.flags.length);
  md += `### ${arch}\n\n`;
  if (!rs.length) { md += `_no flags._\n\n`; continue; }
  const byRoute = {}; for (const r of rs) (byRoute[r.route] ||= []).push(r);
  for (const [route, rrs] of Object.entries(byRoute)) {
    md += `**${route}** \`${rrs[0].url || ''}\`\n\n| viewport | sev | check | detail |\n|---|---|---|---|\n`;
    for (const r of rrs) for (const fl of r.flags.sort((a, b) => rank[a.sev] - rank[b.sev])) md += `| ${r.viewport} | ${fl.sev} | ${fl.check} | ${fl.detail.replace(/\|/g, '\\|')} |\n`;
    md += `\n`;
  }
}
md += `## Re-run\n\`JAVA_HOME=… npx playwright test --config playwright.audit-stress.config.js\` then \`node scripts/audit/build-findings-full.cjs\`. Reachability: \`audit/REACHABILITY_MAP.md\`.\n`;

fs.writeFileSync(path.join(OUT, 'FINDINGS_FULL.md'), md);
console.log(`FINDINGS_FULL.md — P0:${counts.sev.P0} P1:${counts.sev.P1} P2:${counts.sev.P2} | carried:${counts.nov['carried-from-wave1']} new-stress:${counts.nov['new-on-stress']} role:${counts.nov['new-role-specific']} | disappeared:${disappeared.length} | crash-screens:${crashCaps.length} console-err:${consoleCaps.length}`);
if (crashCaps.length) console.log(`  ⚠️  ${crashCaps.length} crash capture(s) — fix + re-run before trusting layout numbers.`);
