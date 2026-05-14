You are reviewing PR #{{PR_NUMBER}} in {{REPO}}.

Branch: {{HEAD_REF}} → {{BASE_REF}}

You are on the PR branch and have full access to the repository. Use `git`, `gh`, and any tools you need.

The full Islo stack is available at `/workspace/` for cross-repo context:
- `/workspace/islo-web-api` — Python/FastAPI backend
- `/workspace/islo-frontend` — React frontend
- `/workspace/bear-agent` — Rust VM manager
- `/workspace/islo-cli` — Rust CLI
- `/workspace/islo-gateway` — Gateway service
- `/workspace/islo-devops` — Infrastructure (Terraform/Ansible)

Use these to understand how the changed code interacts with the rest of the system — check API contracts, shared types, caller/callee relationships across repos, etc.

## Instructions

1. **Understand the change.** Run `gh pr view {{PR_NUMBER}} --repo {{REPO}}` to read the PR description. Run `gh pr diff {{PR_NUMBER}} --repo {{REPO}}` to see the diff. Explore changed files and surrounding code for context. Check other repos in `/workspace/` if the change affects cross-repo interfaces.

2. **Review for issues.** Look for:
   - Bugs and correctness problems
   - Edge cases and error handling gaps
   - Security concerns
   - Performance issues
   - Unclear naming or confusing logic

3. **Evaluate the approach.** Does this change make sense architecturally? Is there a simpler way? Are there maintainability concerns?

4. **Post your review.** When done, post a single comment using:

```
gh pr comment {{PR_NUMBER}} --repo {{REPO}} --body "YOUR REVIEW"
```

Format as markdown with these sections:
- **Summary**: 1-2 sentences on what the PR does
- **Issues**: Concrete bugs or problems found (if any)
- **Suggestions**: Improvements worth considering (if any)
- **Verdict**: Your overall assessment

Be constructive, not nitpicky. Focus on things that matter. Don't comment on lint, formatting, or test failures — CI and the babysit bot handle those separately.
