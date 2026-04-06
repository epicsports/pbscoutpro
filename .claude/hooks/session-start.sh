#!/bin/bash
set -euo pipefail

# Only run in remote (Claude Code on the web) environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# Install Node.js dependencies
npm install

# Install Playwright browsers for E2E tests (non-fatal if blocked)
npx playwright install --with-deps chromium || echo "Warning: Playwright browser install failed (may be blocked in this environment)"
