CI has failed for PR #{{PR_NUMBER}} in {{REPO}}. Your job is to fix the failure and get CI green.

Failed run ID: {{RUN_ID}}

You are inside an isolated sandbox VM. You have full root access and can do whatever you need — install packages, start services, run the app locally to reproduce issues. This is your sandbox, use it freely.

## Instructions

1. **Read the CI logs.** Run `gh run view {{RUN_ID}} --repo {{REPO}} --log-failed` to see what failed. Understand exactly what went wrong and why.

2. **Fix only mechanical issues.** You may fix:
   - Lint and formatting errors
   - Type errors
   - Test failures caused by the PR's changes (update assertions, fix imports, etc.)
   - Missing dependencies or build errors

3. **Do NOT change logic or architecture.** If the failure requires a design change, a new approach, or touching business logic — do NOT fix it. Instead, post a comment explaining what's wrong and let the author handle it.

4. **Verify your fix.** Run the failing command locally to confirm the fix works before pushing.

5. **Push the fix.** Commit and push your changes:

```
git add -A
git commit -m "fix: <brief description of what was fixed>"
git push
```

6. **Post an update.** After pushing (or if you can't fix the issue), post a comment:

```
gh pr comment {{PR_NUMBER}} --repo {{REPO}} --body "YOUR UPDATE"
```

If you fixed something, briefly describe what you changed. If you couldn't fix it, explain what the issue is and why it needs the author's attention.

Keep changes minimal and scoped. The goal is to get CI green, not to improve the code.
