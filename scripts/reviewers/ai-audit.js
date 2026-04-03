/**
 * PbScoutPro — AI Usage Auditor
 * Analyzes prompts, API calls, and AI-related code for efficiency.
 * Run: ANTHROPIC_API_KEY=xxx node scripts/reviewers/ai-audit.js
 * 
 * Checks:
 * 1. Prompt quality in ScheduleImport and OCR components
 * 2. API call patterns (batching, caching, error handling)
 * 3. Worker thread efficiency
 * 4. Token usage estimation
 * 
 * Output: scripts/reviewers/ai-audit-report.md
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const REPORT_PATH = join(import.meta.dirname, 'ai-audit-report.md');
const API_KEY = process.env.ANTHROPIC_API_KEY;

if (!API_KEY) { console.error('Set ANTHROPIC_API_KEY env var'); process.exit(1); }

// Find all files that interact with AI APIs or workers
function findAIFiles() {
  const files = [];
  function walk(dir) {
    for (const f of readdirSync(dir)) {
      const full = join(dir, f);
      if (statSync(full).isDirectory()) {
        if (f === 'node_modules') continue;
        walk(full);
      } else if ((f.endsWith('.jsx') || f.endsWith('.js')) && f !== 'ai-audit.js') {
        const content = readFileSync(full, 'utf8');
        // Files that mention AI, API, Claude, prompts, workers, or fetch
        if (/anthropic|claude|openai|prompt|system.*message|api.*key|Worker|postMessage|\.fetch\(/i.test(content)) {
          files.push({ path: relative('.', full), content, lines: content.split('\n').length });
        }
      }
    }
  }
  walk('src');
  walk('scripts');
  return files;
}

const AI_SYSTEM_PROMPT = `You are an AI efficiency auditor reviewing a paintball scouting app that uses:
1. Claude API for OCR bunker detection and schedule import
2. Web Workers for ballistics computation
3. Firebase Firestore for data storage

Review the provided code and analyze:

## Prompt Engineering
- Are system prompts clear, specific, and well-structured?
- Are there unnecessary instructions inflating token count?
- Could prompts use examples (few-shot) to improve accuracy?
- Are output formats specified clearly (JSON schema, XML tags)?
- Is the model selection appropriate? (e.g. using Opus where Haiku would suffice)

## API Call Efficiency
- Are results cached to avoid redundant calls?
- Is error handling robust (retries, fallbacks, timeouts)?
- Are large inputs chunked appropriately?
- Could batch API be used instead of sequential calls?
- Are API keys properly managed (not hardcoded, env vars)?

## Token Economy
- Estimate tokens per typical API call (input + output)
- Identify calls that could use a smaller/cheaper model
- Flag any prompts that send unnecessary context
- Suggest prompt compression techniques where applicable

## Worker Thread Efficiency
- Is the worker doing computation that could be cached?
- Are messages between main thread and worker minimized?
- Is the worker initialized lazily or eagerly?
- Are there race conditions or message ordering issues?

## Cost Optimization
- Estimate monthly API cost at typical usage (10 tournaments, 50 matches)
- Identify the most expensive operation
- Suggest top 3 cost reduction strategies

Output format:
For each file, list issues as:
[PROMPT|API|TOKENS|WORKER|COST] impact(HIGH/MED/LOW) — description → fix

End with:
## Cost Estimate
- Current estimated cost per [operation]
- Suggested optimizations with savings estimate

## Top 5 Efficiency Wins
Ranked by cost/complexity ratio (biggest savings for least effort).`;

async function main() {
  const files = findAIFiles();
  console.log(`\n🤖 PbScoutPro AI Audit — ${files.length} AI-related files\n`);

  if (files.length === 0) {
    console.log('No AI-related files found.');
    process.exit(0);
  }

  // Concatenate all AI files
  let combined = '';
  for (const f of files) {
    combined += `\n${'='.repeat(60)}\n// FILE: ${f.path} (${f.lines} lines)\n${'='.repeat(60)}\n${f.content}\n`;
  }
  if (combined.length > 120000) {
    combined = combined.slice(0, 120000) + '\n\n// ... (truncated)';
  }

  console.log(`  Files: ${files.map(f => f.path).join(', ')}`);
  console.log('  Analyzing...');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: AI_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Audit these AI-related files from PbScoutPro:\n\n${combined}`,
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const review = data.content[0]?.text || '(no response)';

  const report = [
    '# AI Usage Audit Report',
    `**Date:** ${new Date().toISOString().split('T')[0]}`,
    `**Files audited:** ${files.length}`,
    `**Files:** ${files.map(f => f.path).join(', ')}`,
    '',
    '---',
    '',
    review,
  ].join('\n');

  writeFileSync(REPORT_PATH, report);
  console.log(`\n✅ Report saved: ${REPORT_PATH}\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
