/**
 * PbScoutPro — Code Reviewer
 * Analyzes code for performance, security, and best practices.
 * Run: ANTHROPIC_API_KEY=xxx node scripts/reviewers/code-review.js
 * 
 * Output: scripts/reviewers/code-review-report.md
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const REPORT_PATH = join(import.meta.dirname, 'code-review-report.md');
const API_KEY = process.env.ANTHROPIC_API_KEY;
const SRC = 'src';

if (!API_KEY) { console.error('Set ANTHROPIC_API_KEY env var'); process.exit(1); }

// Collect files, grouped by role
function collectFiles() {
  const groups = {
    pages: [],
    components: [],
    hooks: [],
    services: [],
    utils: [],
  };

  function walk(dir) {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) {
        if (f === 'node_modules' || f === 'workers') continue;
        walk(full);
      } else if (f.endsWith('.jsx') || f.endsWith('.js')) {
        const rel = relative('.', full);
        const content = readFileSync(full, 'utf8');
        const lines = content.split('\n').length;
        const entry = { path: rel, content, lines };

        if (rel.includes('pages/')) groups.pages.push(entry);
        else if (rel.includes('components/')) groups.components.push(entry);
        else if (rel.includes('hooks/')) groups.hooks.push(entry);
        else if (rel.includes('services/')) groups.services.push(entry);
        else if (rel.includes('utils/')) groups.utils.push(entry);
      }
    }
  }
  walk(SRC);
  return groups;
}

const CODE_SYSTEM_PROMPT = `You are a senior React code reviewer for PbScoutPro, a mobile-first paintball scouting app.
Stack: React 18 + Vite + Firebase Firestore. No TypeScript. Inline JSX styles only.

Review the provided code files and check for:

## Performance
- Unnecessary re-renders (missing useMemo/useCallback on expensive computations)
- Large components that should be split (>300 lines)
- Missing React.memo on pure display components
- Firestore subscription leaks (missing unsubscribe in useEffect cleanup)
- Canvas rendering in main thread that could use OffscreenCanvas
- Bundle size concerns (lazy loading, dynamic imports)

## Security
- User input not sanitized before Firestore write
- Firestore rules bypass attempts (client-side admin checks without server validation)
- API keys or secrets in source code
- XSS vectors (dangerouslySetInnerHTML, innerHTML)
- Auth state checked client-side only

## Best Practices
- Props drilling that should use context
- State that should be derived (computed from other state)
- Effects that should be event handlers
- Missing error boundaries
- Missing loading/error states
- Accessibility: missing aria labels, keyboard navigation

## React 18 Specific
- useEffect with missing dependencies
- State updates in loops without batching
- Stale closures in event handlers

Output format for each issue:
[PERF|SEC|QUALITY|A11Y] severity(HIGH/MED/LOW) — file:line — description → fix

Group by file. Max 5 issues per file, prioritized by impact.
At the end, provide a "Top 5 Fixes" section with the highest-impact changes across all files.`;

async function reviewBatch(files, batchName) {
  // Concatenate files with clear separators, truncate if too long
  let combined = '';
  for (const f of files) {
    const truncated = f.lines > 200
      ? f.content.split('\n').slice(0, 200).join('\n') + `\n// ... (${f.lines - 200} more lines truncated)`
      : f.content;
    combined += `\n${'='.repeat(60)}\n// FILE: ${f.path} (${f.lines} lines)\n${'='.repeat(60)}\n${truncated}\n`;
  }

  // Limit to ~100k chars to stay within token limits
  if (combined.length > 100000) {
    combined = combined.slice(0, 100000) + '\n\n// ... (truncated due to size)';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000,
      system: CODE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        text: undefined,
        content: `Review these ${batchName} files:\n\n${combined}`,
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
  const groups = collectFiles();
  const totalFiles = Object.values(groups).flat().length;
  const totalLines = Object.values(groups).flat().reduce((s, f) => s + f.lines, 0);

  console.log(`\n🔍 PbScoutPro Code Review — ${totalFiles} files, ${totalLines} lines\n`);

  const sections = [];
  sections.push(`# Code Review Report`);
  sections.push(`**Date:** ${new Date().toISOString().split('T')[0]}`);
  sections.push(`**Files:** ${totalFiles} | **Lines:** ${totalLines}`);
  sections.push('');

  for (const [groupName, files] of Object.entries(groups)) {
    if (files.length === 0) continue;
    const lineCount = files.reduce((s, f) => s + f.lines, 0);
    console.log(`  Reviewing ${groupName} (${files.length} files, ${lineCount} lines)...`);

    try {
      const review = await reviewBatch(files, groupName);
      sections.push(`---\n\n## ${groupName.charAt(0).toUpperCase() + groupName.slice(1)} (${files.length} files)\n`);
      sections.push(review);
      sections.push('');
    } catch (e) {
      console.error(`  ✗ Failed: ${e.message}`);
      sections.push(`---\n\n## ${groupName}\n\n_Review failed: ${e.message}_\n`);
    }
  }

  const report = sections.join('\n');
  writeFileSync(REPORT_PATH, report);
  console.log(`\n✅ Report saved: ${REPORT_PATH}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
