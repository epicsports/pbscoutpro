/**
 * CI helper: parse the Playwright JSON report and emit each failed test as a
 * GitHub ::error:: annotation (readable via the check-runs annotations API
 * without log access). Runs only on suite failure.
 */
const fs = require('fs');
let data;
try {
  data = JSON.parse(fs.readFileSync('tests/e2e-results.json', 'utf8'));
} catch (e) {
  console.log('::error::could not read tests/e2e-results.json: ' + e.message);
  process.exit(0);
}
const fails = [];
function walk(suite) {
  (suite.suites || []).forEach(walk);
  (suite.specs || []).forEach(sp => {
    (sp.tests || []).forEach(t => {
      if (t.status && t.status !== 'expected' && t.status !== 'skipped') {
        const last = (t.results || []).slice(-1)[0] || {};
        const msg = (((last.error && last.error.message) || t.status || 'failed'))
          .replace(/\[[0-9;]*m/g, '').replace(/\s+/g, ' ').slice(0, 400);
        fails.push(`${sp.title} [${t.status}] ${msg}`);
      }
    });
  });
}
(data.suites || []).forEach(walk);
if (!fails.length) {
  console.log('::error::e2e suite failed but no failed test parsed (webServer/seed/boot error before results)');
}
fails.forEach(f => console.log('::error::E2E FAIL: ' + f));
