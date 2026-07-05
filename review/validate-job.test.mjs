import assert from "node:assert/strict";
import test from "node:test";

import { validateReviewJob } from "./validate-job.mjs";

function validJob(overrides = {}) {
  const job = {
    latest_version: {
      manifest: {
        run: {
          sandbox: {
            mode: "ensure",
            name: "{{sandbox_name}}",
            lifecycle: {
              pause_after_idle: 1800,
              delete_after: 604800,
            },
          },
        },
      },
    },
    params: [
      { name: "repo", type: "string", required: true },
      { name: "pr_number", type: "integer", required: true },
      { name: "sandbox_name", type: "string", required: true },
      { name: "reviewer_ref", type: "string", required: true },
      { name: "model", type: "string" },
      { name: "max_turns", type: "integer" },
      { name: "max_budget_usd", type: "number" },
    ],
  };

  return {
    ...job,
    ...overrides,
  };
}

test("accepts a compatible review job", () => {
  assert.deepEqual(validateReviewJob(validJob()), []);
});

test("requires sandbox_name to drive sandbox routing", () => {
  const job = validJob({
    latest_version: {
      manifest: {
        run: {
          sandbox: {
            mode: "ensure",
            name: "hardcoded-sandbox",
            lifecycle: { pause_after_idle: 1800 },
          },
        },
      },
    },
  });

  assert.match(
    validateReviewJob(job).join("\n"),
    /run\.sandbox\.name must be '\{\{sandbox_name\}\}'/,
  );
});

test("requires idle pause lifecycle", () => {
  const job = validJob({
    latest_version: {
      manifest: {
        run: {
          sandbox: {
            mode: "ensure",
            name: "{{sandbox_name}}",
            lifecycle: { pause_after: 1800 },
          },
        },
      },
    },
  });

  const errors = validateReviewJob(job).join("\n");
  assert.match(errors, /pause_after_idle is required/);
  assert.match(errors, /must use pause_after_idle, not pause_after/);
});
