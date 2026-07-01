# Preview verification guide

Use the preview URL from the workflow input as the app entrypoint. Open it first, then pick a small set of checks that match the PR.

## App access

- Preview URL: supplied by `islo-reviewer/preview@v1` through the `preview_url` input.
- Login: describe test credentials here, or state that the preview uses seeded/fake data and does not need login.
- Useful logs: `/tmp/islo-preview.log` inside the preview sandbox.

## What to verify

- Load the preview URL and confirm the app renders without a fatal error.
- Exercise the changed route, form, button, API call, or workflow from the PR.
- Check one regression path that is close to the changed code.
- Capture evidence. Use screenshots, DOM text, HTTP responses, or log excerpts.

## Report format

Post one PR comment with `PASSED`, `FAILED`, or `PARTIAL` at the top.

For each scenario, include:

- What you tested.
- The exact command, browser action, or URL.
- The observed result.
- Evidence in a short code block or `<details>` block.
