# islo-reviewer

Automated PR review and CI babysit agent for islo-labs repositories. Runs inside [Islo](https://islo.dev) sandboxes, triggered by GitHub Actions.

## Scripts

### `review.ts` — PR Review

One-shot code review. Reads the PR diff, explores the codebase, runs tests/linters, and posts a review comment.

```bash
npx tsx src/review.ts <owner/repo> <pr-number>
```

Triggered by `islo-review.yml` on PR open.

### `babysit.ts` — CI Fix

One-shot CI failure fixer. Reads CI logs, fixes mechanical issues (lint, types, test updates), and pushes. Does NOT change logic.

```bash
npx tsx src/babysit.ts <owner/repo> <run-id>
```

Triggered by `islo-babysit.yml` on CI failure.

## How It Works

1. GitHub Action triggers on PR open (review) or CI failure (babysit)
2. Action creates an ephemeral Islo sandbox from the `islo-stack` snapshot
3. Sandbox clones this repo, runs the appropriate script
4. Script uses the Claude Agent SDK to analyze code and take action
5. Sandbox is destroyed after the script completes

## Safety

- Babysit only fixes mechanical issues — lint, formatting, type errors, test updates
- Bot commit counter prevents infinite fix-fail-fix loops (max 3 attempts)
- Review triggers once per PR open, not on every push
