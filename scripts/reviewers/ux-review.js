/**
 * PbScoutPro — UX Reviewer
 * Analyzes screenshots against Material Design 3 + Apple HIG guidelines.
 * Run: ANTHROPIC_API_KEY=xxx node scripts/reviewers/ux-review.js
 * 
 * Prerequisites: run capture-screens.js first to generate screenshots.
 * Output: scripts/reviewers/ux-review-report.md
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const SCREENSHOTS_DIR = join(import.meta.dirname, 'screenshots');
const REPORT_PATH = join(import.meta.dirname, 'ux-review-report.md');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) { console.error('Set ANTHROPIC_API_KEY env var'); process.exit(1); }

const UX_SYSTEM_PROMPT = `You are a senior UX reviewer for a mobile-first paintball scouting app (PbScoutPro).
The app uses a dark theme with amber (#f59e0b) accent, JetBrains Mono font, React 18 inline styles.

Review each screenshot against these guidelines:

## Material Design 3 principles
- Touch targets: minimum 48dp (44px at 1x), with 8dp spacing between targets
- Visual hierarchy: clear primary/secondary/tertiary text levels
- Consistent elevation and containment (cards, sheets, dialogs)
- Predictable navigation patterns (bottom nav for top-level, back arrows for detail)
- Content spacing: 16dp horizontal margins, 8dp between related elements

## Apple HIG principles  
- 44pt minimum tappable area
- Information density appropriate for device (don't cram desktop UI on mobile)
- Consistent header/back patterns (large title or inline title)
- Bottom sheets for contextual actions (not modal dialogs)
- Safe area respect (notch, home indicator)

## App-specific rules (design-contract.js)
- Headers: 10px 16px padding, sticky top, FONT fontBase (14px) title
- Bottom bars: sticky bottom, flex:1 tabs, safe-area padding
- Form controls: 44px minHeight on mobile, borderRadius 8
- Canvas toolbar: icon toggle buttons (not checkboxes)
- All text must be in English

For EACH screenshot, output:
1. SCREEN NAME
2. PASS/WARN/FAIL rating
3. Specific issues found (max 5 per screen, prioritized by impact)
4. Each issue: [SEVERITY] description → concrete fix

Severity levels:
- [CRITICAL] — broken functionality, can't complete task
- [MAJOR] — poor usability, confusing interaction, accessibility fail
- [MINOR] — cosmetic inconsistency, polish issue
- [NOOP] — everything looks good

Format each issue as a single actionable line that a developer can implement directly.
Reference specific components (PageHeader, ModeTabBar, FieldEditor, etc.) when applicable.
Don't repeat issues across screens — note "same as Screen X" if applicable.`;

async function analyzeScreenshot(filename, imageBase64) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: UX_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/png', data: imageBase64 },
          },
          {
            type: 'text',
            text: `Review this screenshot: ${filename}\nProvide specific, actionable UX issues.`,
          },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content[0]?.text || '(no response)';
}

async function main() {
  const files = readdirSync(SCREENSHOTS_DIR)
    .filter(f => f.endsWith('.png'))
    .sort();

  if (files.length === 0) {
    console.error('No screenshots found. Run capture-screens.js first.');
    process.exit(1);
  }

  console.log(`\n🔍 PbScoutPro UX Review — ${files.length} screens\n`);

  const sections = [];
  sections.push(`# UX Review Report`);
  sections.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  sections.push(`**Screens reviewed:** ${files.length}`);
  sections.push(`**Viewport:** 375×812 (iPhone SE, 2x)`);
  sections.push('');

  let criticalCount = 0, majorCount = 0, minorCount = 0;

  for (const file of files) {
    const screenName = file.replace('.png', '').replace(/^\d+-/, '');
    console.log(`  Reviewing ${screenName}...`);

    const imgPath = join(SCREENSHOTS_DIR, file);
    const imgBase64 = readFileSync(imgPath).toString('base64');

    try {
      const review = await analyzeScreenshot(screenName, imgBase64);
      sections.push(`---\n\n## ${screenName}\n`);
      sections.push(review);
      sections.push('');

      // Count severities
      criticalCount += (review.match(/\[CRITICAL\]/g) || []).length;
      majorCount += (review.match(/\[MAJOR\]/g) || []).length;
      minorCount += (review.match(/\[MINOR\]/g) || []).length;
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
      sections.push(`---\n\n## ${screenName}\n\n_Review failed: ${e.message}_\n`);
    }
  }

  // Summary
  const summary = `
---

## Summary

| Severity | Count |
|----------|-------|
| CRITICAL | ${criticalCount} |
| MAJOR | ${majorCount} |
| MINOR | ${minorCount} |

### Next steps
1. Fix all CRITICAL issues immediately
2. Address MAJOR issues in next sprint
3. MINOR issues go to backlog
`;
  sections.splice(4, 0, summary); // Insert after header

  const report = sections.join('\n');
  writeFileSync(REPORT_PATH, report);
  console.log(`\n✅ Report saved: ${REPORT_PATH}`);
  console.log(`   ${criticalCount} critical | ${majorCount} major | ${minorCount} minor\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
