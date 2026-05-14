CI has failed for PR #{{PR_NUMBER}} in {{REPO}}. Your job is to fix the failure and get CI green.

## CI Failure Logs

{{CI_LOGS}}

## Instructions

You have full access to the repository at your current working directory.

1. **Read the logs.** Understand exactly what failed and why.

2. **Fix only mechanical issues.** You may fix:
   - Lint and formatting errors
   - Type errors
   - Test failures caused by the PR's changes (update assertions, fix imports, etc.)
   - Missing dependencies or build errors

3. **Do NOT change logic or architecture.** If the failure requires a design change, a new approach, or touching business logic — do NOT fix it. Instead, post a comment explaining what's wrong and let the author handle it.

4. **Push the fix.** Commit and push your changes:

```
git add -A
git commit -m "fix: <brief description of what was fixed>"
git push
```

5. **Post an update.** After pushing (or if you can't fix the issue), post a comment:

```
gh pr comment {{PR_NUMBER}} --repo {{REPO}} --body "YOUR UPDATE"
```

If you fixed something, briefly describe what you changed. If you couldn't fix it, explain what the issue is and why it needs the author's attention.

Keep changes minimal and scoped. The goal is to get CI green, not to improve the code.
