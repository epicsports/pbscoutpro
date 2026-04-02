# Development Setup

## Claude Code (AI dev agent)

Claude Code runs in your terminal, reads the codebase, writes code, and pushes to git.

### Install
```bash
# macOS / Linux (recommended: native installer)
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex

# Verify
claude --version
```

### Requirements
- Claude Pro ($20/month) or Claude Max subscription
- No Node.js needed for native installer

### Use
```bash
cd pbscoutpro
claude
```

Claude Code reads `CLAUDE.md` automatically and knows the project structure.

Example commands:
```
> fix the aspect ratio bug in FieldCanvas
> add a "delete all points" button to MatchPage
> the bunker type selector is too wide on iPhone SE, fix it
> run the playwright tests and fix any failures
```

### Git setup (inside Claude Code session)
```
> configure git: user "Claude Code", email code@pbscoutpro.dev
> set git remote to use token github_pat_... (I'll give you the token)
```

---

## Playwright (E2E tests)

### Install
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Run
```bash
# All tests, all viewports
PBSCOUT_PASSWORD=your_workspace_password npx playwright test

# Just smoke tests
PBSCOUT_PASSWORD=xxx npx playwright test smoke

# Just responsive screenshots
PBSCOUT_PASSWORD=xxx npx playwright test responsive-audit

# Visual UI mode
PBSCOUT_PASSWORD=xxx npx playwright test --ui
```

### View report
```bash
npx playwright show-report tests/report
```

### What tests do

**smoke.spec.js** — core flows that must never break:
- Login works
- All pages navigate correctly
- Canvas renders without crash
- No console errors
- Touch targets ≥ 44px on mobile

**responsive-audit.spec.js** — screenshots of every screen on:
- iPhone SE (375×667)
- iPhone 15 (393×852)
- iPad (810×1080)
- Android Pixel 7 (412×915)
- Desktop (1440×900)

Screenshots saved in `tests/screenshots/{device}/`.

---

## Workflow

```
You (Product Owner): "I want feature X"
    ↓
Claude Code (terminal): writes code, runs tests, pushes
    ↓
Playwright: validates nothing broke
    ↓
GitHub Pages: auto-deploy on push
```
