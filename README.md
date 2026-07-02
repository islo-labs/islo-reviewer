# islo-reviewer

Composite GitHub Actions for PR review, preview sandboxes, E2E verification, and CI babysitting. Runs inside [Islo](https://islo.dev) sandboxes using the Claude Agent SDK.

## Quick Start

Add an `ISLO_API_KEY` secret to your repo, then create the workflows you need:

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

That's it. These actions handle sandbox creation, script execution, and cleanup.

**`.github/workflows/islo-preview.yml`** — creates a shareable PR preview:

```yaml
name: Islo Preview
on:
  pull_request:
    types: [labeled, unlabeled, synchronize, closed]
permissions:
  contents: read
  pull-requests: write
jobs:
  deploy:
    if: >-
      (github.event.action == 'labeled' && github.event.label.name == 'preview') ||
      (github.event.action == 'synchronize' && contains(github.event.pull_request.labels.*.name, 'preview'))
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: islo-labs/islo-reviewer/preview@v1
        with:
          pr_number: ${{ github.event.pull_request.number }}
          islo_config: islo.yaml
          snapshot: my-preview-snapshot
          share_port: "3000"
          boot_command: |
            cd "/workspace/${REPO}"
            gh pr checkout "${PR_NUMBER}" --repo "${GITHUB_REPOSITORY}"
            npm ci
            nohup npm run start -- --host 0.0.0.0 --port "${SHARE_PORT}" > /tmp/islo-preview.log 2>&1 &
            for _ in $(seq 1 60); do
              curl -fsS "http://localhost:${SHARE_PORT}" >/dev/null && exit 0
              sleep 2
            done
            tail -50 /tmp/islo-preview.log
            exit 1
        env:
          ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
  cleanup:
    if: >-
      github.event.action == 'closed' ||
      (github.event.action == 'unlabeled' && github.event.label.name == 'preview')
    runs-on: ubuntu-latest
    steps:
      - uses: islo-labs/islo-reviewer/preview@v1
        with:
          pr_number: ${{ github.event.pull_request.number }}
          cleanup: "true"
        env:
          ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

Trigger by adding the `preview` label to a PR. The action posts a preview URL comment, pauses the sandbox after idle time, and deletes the sandbox when the PR closes or the label is removed.

**`.github/workflows/islo-verify.yml`** — verifies PRs work E2E against the full stack:

```yaml
name: Islo Verify
on:
  pull_request:
    types: [labeled]
  workflow_dispatch:
    inputs:
      pr_number:
        description: "PR number to verify"
        required: true
      related_prs:
        description: "Comma-separated repo:ref pairs (e.g. bear-agent:pr/423)"
        default: ""
permissions:
  pull-requests: write
jobs:
  verify:
    if: >-
      (github.event.action == 'labeled' && github.event.label.name == 'islo-verify') ||
      github.event_name == 'workflow_dispatch'
    runs-on: ubuntu-latest
    timeout-minutes: 45
    steps:
      - uses: islo-labs/islo-reviewer/verify@v1
        with:
          pr_number: ${{ github.event.pull_request.number || inputs.pr_number }}
          related_prs: ${{ inputs.related_prs || '' }}
        env:
          ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

Trigger by adding the `islo-verify` label to a PR, or manually via workflow dispatch.

## Actions

### `islo-labs/islo-reviewer/review@v1`

Automated PR code review. Reads the diff, explores the codebase, optionally runs tests, and posts a GitHub review with inline comments.

### `islo-labs/islo-reviewer/babysit@v1`

Automated CI failure fixer. Reads CI logs, fixes mechanical issues (lint, formatting, type errors, test updates), and pushes a fix commit. Does **not** change logic.

### `islo-labs/islo-reviewer/preview@v1`

Shareable PR previews. Creates or reuses an Islo sandbox, runs your boot command, shares a port, upserts a PR comment with the preview URL, pauses the sandbox after idle time, and cleans up the exact sandbox/share/comment on PR close or label removal. Set `verify: "true"` to have the agent verify the same sandbox humans will open.

### `islo-labs/islo-reviewer/verify@v1`

Empirical E2E verification. Boots a full application stack inside a sandbox, builds the PR branch, and has an agent verify the change works end-to-end. Posts a structured verification report as a PR comment with evidence. Works with any stack — configure `boot_command` and `snapshot` for your project.

## Inputs

The actions share the common sandbox and agent inputs where they apply:

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `pr_number` | **yes** (review, preview, verify) | — | PR number to review/preview/verify |
| `run_id` | **yes** (babysit) | — | Failed workflow run ID |
| `related_prs` | no (preview, verify) | `''` | Comma-separated `repo:ref` pairs for multi-repo boot and verification |
| `preview_url` | no (verify only) | `''` | Share URL for an already-running preview. Advanced use only; `preview@v1` verifies its own sandbox when `verify: "true"`. |
| `boot_command` | no (verify only) | `launch-fullstack ${LAUNCH_ARGS}` | Shell command to boot the stack. Supports `${REPO}`, `${PR_NUMBER}`, `${LAUNCH_ARGS}`, `${RELATED_PRS}` substitution. Set to `''` to skip. |
| `env_file` | no (verify only) | `/workspace/.fullstack-env` | Path to env file to source before running the agent |
| `islo_config` | no | `''` | Path to an `islo.yaml` for sandbox config. Triggers a repo checkout. |
| `snapshot` | no | `''` (`islo-fullstack` for preview and verify) | Sandbox snapshot name |
| `cpu` | no | `4` (`8` for preview and verify) | CPU cores for the sandbox |
| `memory` | no | `4096` (`16384` for preview and verify) | Memory in MB for the sandbox |
| `model` | no | `claude-opus-4-6` | Claude model to use |
| `max_turns` | no | `50` (`80` for verify) | Maximum agentic turns |
| `max_budget_usd` | no | `10` (`20` for verify) | Cost cap in USD |

Preview has additional inputs:

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `sandbox` | no | `preview-<repo>-<pr_number>` | Sandbox name to create or reuse |
| `boot_command` | no | `launch-fullstack ${LAUNCH_ARGS}` | Command to start the app inside the sandbox |
| `env_file` | no | `/workspace/.fullstack-env` | Env file inside the sandbox to source before booting or verifying |
| `share_port` | no | `3000` | Sandbox port to share |
| `share_ttl` | no | `168h` | Share URL TTL |
| `pause_after_idle_seconds` | no | `1800` | Idle time before pausing the sandbox. Leave empty to disable. |
| `comment_marker` | no | `<!-- islo-preview -->` | Marker used to upsert or delete the PR comment |
| `cleanup` | no | `false` | Set to `true` in close/unlabel jobs to delete the preview |
| `verify` | no | `false` | Run the verification agent inside the same preview sandbox after sharing the port |

## Customizing Review Context

Create a `REVIEW.md` file at the root of your repo to provide extra context to the reviewer. This file is automatically read and injected into the review/babysit prompt.

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

1. GitHub Action triggers on PR open (review), preview label/dispatch (preview), verify label/dispatch (verify), or CI failure (babysit)
2. Action installs the Islo CLI and creates an ephemeral sandbox
3. For preview: runs your `boot_command`, shares the configured port, and upserts one PR comment
4. For preview verification: optionally runs the verification agent inside that same sandbox
5. Inside the sandbox, reviewer scripts clone this repo and run the appropriate TypeScript entrypoint
6. The script uses the [Claude Agent SDK](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) to analyze code and take action
7. Review, verify, and babysit sandboxes are destroyed after the script completes; preview sandboxes stay alive until PR close or label removal

### Multi-Repo Verification

For changes that span multiple repos (e.g. an API endpoint + its consumer), use `related_prs` to build all related branches together:

```bash
# Via GitHub CLI (manual dispatch):
gh workflow run islo-verify.yml \
  -f pr_number=456 \
  -f related_prs='backend:pr/423,gateway:feat/new-policy'
```

The format is `repo-name:ref` where ref can be `pr/N`, a branch name, or a commit SHA.

### Custom Stack Configuration

The verify action works with any stack. Override `boot_command` and `snapshot` for your project:

```yaml
- uses: islo-labs/islo-reviewer/verify@v1
  with:
    pr_number: ${{ github.event.pull_request.number }}
    snapshot: my-fullstack-snapshot
    boot_command: '/workspace/scripts/boot.sh --service ${REPO} --ref pr/${PR_NUMBER}'
    env_file: '/workspace/.env'
  env:
    ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

The `boot_command` receives these variables:
- `${REPO}` — repository name (e.g. `my-backend`)
- `${PR_NUMBER}` — the PR number being verified
- `${LAUNCH_ARGS}` — pre-built `--repo ref` flags from the primary PR and `related_prs`
- `${RELATED_PRS}` — raw comma-separated string as passed by the user

Set `boot_command: ''` to skip the boot step entirely (useful if your snapshot is already running).

### Preview-only vs preview with verification

Use `preview@v1` by itself when you only need a URL for humans to test:

- label the PR with `preview`
- boot the app in an Islo sandbox
- share the app port
- post or update one PR comment
- pause the sandbox after idle time
- delete the sandbox when the PR closes or the label is removed

Set `verify: "true"` when you want an agent to exercise that same preview sandbox and post evidence. This keeps the app, database, logs, and filesystem in one place:

```yaml
- id: preview
  uses: islo-labs/islo-reviewer/preview@v1
  with:
    pr_number: ${{ github.event.pull_request.number }}
    islo_config: islo.yaml
    snapshot: my-preview-snapshot
    share_port: "3000"
    boot_command: ./scripts/preview-start.sh
    verify: "true"
  env:
    ISLO_API_KEY: ${{ secrets.ISLO_API_KEY }}
```

Use standalone `verify@v1` for non-preview full-stack verification, or for advanced cases where you deliberately want a separate verification sandbox.

See `examples/preview-only.yml` and `examples/VERIFY_AND_PREVIEW.md` for fuller templates.

## Safety

- Review triggers once per PR open, not on every push
- Preview cleans up only the exact sandbox name it created or reused
- Verify triggers only on label or manual dispatch (expensive operation)
- Babysit only fixes mechanical issues — lint, formatting, type errors, test updates
- Bot commit counter prevents infinite fix-fail-fix loops (max 3 attempts)
- Verify never modifies the PR branch — read-only verification with evidence
- `max_budget_usd` provides a hard cost cap per invocation
