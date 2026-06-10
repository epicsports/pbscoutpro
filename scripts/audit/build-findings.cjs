#!/usr/bin/env node
/**
 * build-findings.cjs — turns audit/findings.json (from the cross-device crawler)
 * into audit/FINDINGS.md: a prioritizable discrepancy register grouped by
 * archetype, with suggested severities (P0/P1/P2), a summary, the 10 worst
 * screens, systemic patterns, and the exclusion + baseline-calibration notes.
 *
 * Severity is a SUGGESTION — final triage is Jacek + Opus.
 * Run: node scripts/audit/build-findings.cjs
 */
const fs = require('fs');
const path = require('path');

const OUT = 'audit';
const data = JSON.parse(fs.readFileSync(path.join(OUT, 'findings.json'), 'utf8'));
const TOKEN_BG = 'rgb(10, 14, 23)'; // COLORS.bg #0a0e17

// Assign flags (each = {sev, check, detail}) per record.
function flagsFor(r) {
  const f = [];
  if (r.error) f.push({ sev: 'P0', check: 'render-error', detail: r.error });
  else if ((r.bodyText ?? 0) < 10) f.push({ sev: 'P0', check: 'blank-screen', detail: `innerText length ${r.bodyText} (route may not have rendered / bad seed id)` });
  if (r.hScroll > 2) f.push({ sev: 'P0', check: 'h-scroll', detail: `documentElement overflows viewport by ${r.hScroll}px` });
  if (r.offRight > 0 && r.worstRight > 4) f.push({ sev: 'P1', check: 'off-viewport', detail: `${r.offRight} element(s) spill right; worst +${r.worstRight}px` });
  if (r.tooWide > 0) f.push({ sev: 'P1', check: 'wider-than-viewport', detail: `${r.tooWide} element(s) wider than viewport (fixed-width smell)` });
  if (r.smallTargets > 0) f.push({ sev: 'P1', check: 'touch<44', detail: `${r.smallTargets} interactive <44px — e.g. ${(r.smallSamples || []).join(' · ')}` });
  // Check 5 — canvas hero rule. Achievable ≈100% only at phone-landscape; the
  // side-rail + 1.6 field aspect inherently yields <95% on tablet/desktop
  // landscape (§113 geometry, sanctioned) → record there as P2/info, NOT P0.
  if (r.canvas && r.orient === 'landscape' && r.canvasH != null) {
    const pct = Math.round((r.canvasH / r.vh) * 100);
    if (pct < 95) {
      if (r.viewport === 'phone-landscape') f.push({ sev: 'P0', check: 'hero<95%@phone-ls', detail: `field ${pct}% of viewport height (hero-rule violation on a phone)${r.baseline ? ' — BASELINE: if this fails the harness is miscalibrated' : ''}` });
      else f.push({ sev: 'P2', check: `hero ${pct}%@${r.viewport}`, detail: `field ${pct}% height — side-rail/aspect geometry (sanctioned edge case), informational` });
    }
  }
  if (r.canvas && r.orient === 'landscape' && r.canvasH == null && !r.error) f.push({ sev: 'P1', check: 'no-canvas', detail: 'canvas screen rendered no <canvas> in landscape (did it activate the shell?)' });
  if (r.bodyBg !== TOKEN_BG && r.rootBg !== TOKEN_BG) f.push({ sev: 'P1', check: 'bg≠token', detail: `body=${r.bodyBg} root=${r.rootBg} (expected ${TOKEN_BG})` });
  if (r.textOverflow > 0) f.push({ sev: 'P2', check: 'text-clip', detail: `${r.textOverflow} leaf text node(s) scrollWidth>clientWidth (often intentional ellipsis — verify)` });
  return f;
}

const rank = { P0: 0, P1: 1, P2: 2 };
const all = data.findings.map(r => ({ ...r, flags: flagsFor(r) }));

// Counts
const counts = { P0: 0, P1: 0, P2: 0 };
for (const r of all) for (const fl of r.flags) counts[fl.sev]++;

// Worst screens (route×viewport) by weighted flag score
const scored = all.map(r => ({ r, score: r.flags.reduce((s, fl) => s + (fl.sev === 'P0' ? 100 : fl.sev === 'P1' ? 10 : 1), 0) }))
  .filter(x => x.score > 0).sort((a, b) => b.score - a.score);

// Systemic patterns — a check that fires across most viewports of an archetype
const byArch = {};
for (const r of all) { (byArch[r.archetype] ||= []).push(r); }
const systemic = [];
for (const [arch, rows] of Object.entries(byArch)) {
  const checkHits = {};
  for (const r of rows) for (const fl of r.flags) (checkHits[fl.check.replace(/\d+%|@\S+/g, '').trim()] ||= new Set()).add(r.route);
  for (const [check, routes] of Object.entries(checkHits)) {
    if (routes.size >= 3) systemic.push(`**${arch}** · \`${check}\` hits ${routes.size} routes (${[...routes].slice(0, 6).join(', ')}${routes.size > 6 ? '…' : ''}) — likely ONE archetype-level fix.`);
  }
}

// Baseline calibration
const basePL = all.find(r => r.baseline && r.viewport === 'phone-landscape');
const basePct = basePL && basePL.canvasH ? Math.round((basePL.canvasH / basePL.vh) * 100) : null;
const baseStatus = basePct == null ? '⚠️ baseline not captured' : basePct >= 95 ? `✅ HitabilityPage @phone-landscape = ${basePct}% (≥95% — harness calibrated)` : `🔴 HitabilityPage @phone-landscape = ${basePct}% (<95% — HARNESS MISCALIBRATED, fix harness not app)`;

// ── Render ──
let md = `# Cross-device render audit — FINDINGS\n\n`;
md += `_Generated from \`audit/findings.json\` · ${data.routeCount} routes × ${data.viewports.length} viewports = ${all.length} screenshots._\n`;
md += `_Severity is a SUGGESTION — final triage = Jacek + Opus. Screenshots: \`audit/screenshots/<route>__<viewport>.png\`._\n\n`;
md += `## Summary\n- **P0 (broken/unusable):** ${counts.P0}\n- **P1 (ugly/wasteful but usable):** ${counts.P1}\n- **P2 (polish / informational):** ${counts.P2}\n\n`;
md += `**Baseline calibration:** ${baseStatus}\n\n`;
md += `**Viewport matrix:** ${data.viewports.map(v => `${v.name} ${v.width}×${v.height}`).join(' · ')}\n\n`;

md += `## 10 worst screens\n\n| # | route | viewport | score | flags |\n|---|---|---|---|---|\n`;
scored.slice(0, 10).forEach((x, i) => {
  md += `| ${i + 1} | ${x.r.route} | ${x.r.viewport} | ${x.score} | ${x.r.flags.map(fl => `${fl.sev} ${fl.check}`).join('; ')} |\n`;
});
md += `\n`;

md += `## Systemic patterns (one fix → many screens)\n\n`;
md += systemic.length ? systemic.map(s => `- ${s}`).join('\n') + '\n\n' : '_None detected (≥3 routes per archetype sharing a check)._\n\n';

md += `## Register — by archetype → route → viewport\n\n`;
for (const arch of ['List', 'Detail', 'Canvas', 'Form']) {
  const rows = (byArch[arch] || []).filter(r => r.flags.length);
  md += `### ${arch}\n\n`;
  if (!rows.length) { md += `_No flags._\n\n`; continue; }
  // group by route
  const byRoute = {};
  for (const r of rows) (byRoute[r.route] ||= []).push(r);
  for (const [route, rrs] of Object.entries(byRoute)) {
    md += `**${route}** \`${rrs[0].url}\`\n\n`;
    md += `| viewport | sev | check | detail |\n|---|---|---|---|\n`;
    rrs.sort((a, b) => Math.min(...a.flags.map(f => rank[f.sev])) - Math.min(...b.flags.map(f => rank[f.sev])));
    for (const r of rrs) for (const fl of r.flags.sort((a, b) => rank[a.sev] - rank[b.sev])) {
      md += `| ${r.viewport} | ${fl.sev} | ${fl.check} | ${fl.detail.replace(/\|/g, '\\|')} |\n`;
    }
    md += `\n`;
  }
}

md += `## Exclusions (not in the matrix run)\n`;
md += `- **super_admin-only:** \`/admin/leagues\` \`/admin/players\` \`/admin/teams\` \`/admin/workspaces\` \`/admin/layouts\` — need the SUPER_ACCOUNT + their own data; run as a separate super pass if wanted.\n`;
md += `- **not-seeded params:** TacticPage (\`/…/tactic/:tacticId\` — no tactic seeded) · training-matchup MatchPage (\`/training/:t/matchup/:m\` — no matchup seeded). MatchPage canvas archetype IS covered via match-review / match-scout.\n`;
md += `- **Kiosk:** an in-flow overlay (post-save / lobby), not a standalone route.\n\n`;
md += `## Check legend\n`;
md += `1 h-scroll · 2 off-viewport/wider-than-viewport · 3 touch<44 (§27) · 4 text-clip (P2, ellipsis-noisy) · 5 canvas hero<95% in landscape (P0 only @phone-landscape; tablet/desktop = sanctioned geometry, P2) · 6 fixed-width>viewport (=wider-than-viewport) · 7 bg≠token (\`${TOKEN_BG}\`).\n`;

fs.writeFileSync(path.join(OUT, 'FINDINGS.md'), md);
console.log(`FINDINGS.md written — P0:${counts.P0} P1:${counts.P1} P2:${counts.P2}; ${scored.length} flagged screens. ${baseStatus}`);
