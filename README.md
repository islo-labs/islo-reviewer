# islo-reviewer

Composite GitHub Actions for automated PR review and CI babysitting. Runs inside [Islo](https://islo.dev) sandboxes using the Claude Agent SDK.

## Quick Start

Add an `ISLO_API_KEY` secret to your repo, then create two workflow files:

**`.github/workflows/islo-review.yml`** — reviews PRs on open:

```yaml
name: PR Review
on:
  pull_request:
    types: [opened, reopened]
jobs:
  review:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: islo-labs/islo-reviewer/review@v1
        with:
          pr_number: ${{ github.event.pull_request.number }}
        env:
          ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

**`.github/workflows/islo-babysit.yml`** — fixes CI failures automatically:

```yaml
name: Babysit CI
on:
  workflow_run:
    workflows: ["CI"]  # replace with your CI workflow name(s)
    types: [completed]
jobs:
  babysit:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    if: >
      github.event.workflow_run.conclusion == 'failure' &&
      github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.head_repository.full_name == github.event.workflow_run.repository.full_name
    steps:
      - uses: islo-labs/islo-reviewer/babysit@v1
        with:
          run_id: ${{ github.event.workflow_run.id }}
        env:
          ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

That's it. Both actions handle sandbox creation, script execution, and cleanup.

## Actions

### `islo-labs/islo-reviewer/review@v1`

Automated PR code review. Reads the diff, explores the codebase, optionally runs tests, and posts a GitHub review with inline comments.

### `islo-labs/islo-reviewer/babysit@v1`

Automated CI failure fixer. Reads CI logs, fixes mechanical issues (lint, formatting, type errors, test updates), and pushes a fix commit. Does **not** change logic.

## Inputs

Both actions share the same configuration inputs (except `pr_number` vs `run_id`):

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `pr_number` | **yes** (review) | — | PR number to review |
| `run_id` | **yes** (babysit) | — | Failed workflow run ID |
| `islo_config` | no | `''` | Path to an `islo.yaml` for sandbox config (e.g., `.github/islo-review.yaml`). Triggers a repo checkout so the file is available. |
| `snapshot` | no | `''` | Sandbox snapshot name. Use to restore a pre-built environment. |
| `cpu` | no | `4` | CPU cores for the sandbox |
| `memory` | no | `4096` | Memory in MB for the sandbox |
| `model` | no | `claude-opus-4-6` | Claude model to use (e.g., `claude-sonnet-4` for lower cost) |
| `max_turns` | no | `50` | Maximum agentic turns (tool-use round trips) |
| `max_budget_usd` | no | `''` | Cost cap in USD. Empty = unlimited. |

## Customizing Review Context

Create a `REVIEW.md` file at the root of your repo to provide extra context to the reviewer. This file is automatically read and injected into the review/babysit prompt. (`.github/islo-reviewer.md` is also supported for backward compatibility.)

Example:

```markdown
## Architecture

React frontend using Vite, React Router, and TanStack Query.

## Cross-repo context

The full stack is available at `/workspace/`:
- `/workspace/backend` -- Python/FastAPI backend (this app consumes its API)

## Review focus areas

- Component structure and React patterns
- API client changes (must match backend contract)
- Accessibility and responsive design
```

## Advanced Configuration

### Using an islo.yaml config

If your sandbox needs sources, setup scripts, or other config from an `islo.yaml`, point the action at it:

```yaml
- uses: islo-labs/islo-reviewer/review@v1
  with:
    pr_number: ${{ github.event.pull_request.number }}
    islo_config: .github/islo-review.yaml
  env:
    ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

This checks out your repo on the runner so the config file is available, then passes `--config .github/islo-review.yaml` to `islo use`.

### Cost control

Use `model` and `max_budget_usd` to control spend:

```yaml
- uses: islo-labs/islo-reviewer/review@v1
  with:
    pr_number: ${{ github.event.pull_request.number }}
    model: claude-sonnet-4
    max_budget_usd: '2.00'
  env:
    ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

### Manual trigger

Both workflow examples above support `workflow_dispatch` for manual reruns. For review, add:

```yaml
on:
  pull_request:
    types: [opened, reopened]
  workflow_dispatch:
    inputs:
      pr_number:
        description: "PR number to review"
        required: true
```

Then use `${{ github.event.pull_request.number || inputs.pr_number }}` as the `pr_number` input.

## How It Works

1. GitHub Action triggers on PR open (review) or CI failure (babysit)
2. Action installs the Islo CLI and creates an ephemeral sandbox
3. Inside the sandbox, it clones this repo and runs the appropriate script
4. The script uses the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) to analyze code and take action
5. Sandbox is destroyed after the script completes

## Safety

- Babysit only fixes mechanical issues — lint, formatting, type errors, test updates
- Bot commit counter prevents infinite fix-fail-fix loops (max 3 attempts)
- Review triggers once per PR open, not on every push
- `max_budget_usd` provides a hard cost cap per invocation
