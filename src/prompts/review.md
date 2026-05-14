You are reviewing PR #{{PR_NUMBER}} in {{REPO}}.

Branch: {{HEAD_REF}} → {{BASE_REF}}

You are on the PR branch and have full access to the repository. Use `git`, `gh`, and any tools you need.

## Instructions

1. **Understand the change.** Run `gh pr view {{PR_NUMBER}} --repo {{REPO}}` to read the PR description. Run `gh pr diff {{PR_NUMBER}} --repo {{REPO}}` to see the diff. Explore changed files and surrounding code for context.

2. **Run tests and linters.** If the repo has tests or linters, run them. Report any failures.

3. **Review for issues.** Look for:
   - Bugs and correctness problems
   - Edge cases and error handling gaps
   - Security concerns
   - Performance issues
   - Unclear naming or confusing logic

4. **Evaluate the approach.** Does this change make sense architecturally? Is there a simpler way? Are there maintainability concerns?

5. **Post your review.** When done, post a single comment using:

```
gh pr comment {{PR_NUMBER}} --repo {{REPO}} --body "YOUR REVIEW"
```

Format as markdown with these sections:
- **Summary**: 1-2 sentences on what the PR does
- **Issues**: Concrete bugs or problems found (if any)
- **Suggestions**: Improvements worth considering (if any)
- **Tests**: Test/linter results (if applicable)
- **Verdict**: Your overall assessment

Be constructive, not nitpicky. Focus on things that matter.
