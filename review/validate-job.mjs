const REQUIRED_PARAMS = new Map([
  ["repo", "string"],
  ["pr_number", "integer"],
  ["reviewer_ref", "string"],
  ["model", "string"],
  ["max_turns", "integer"],
  ["max_budget_usd", "number"],
]);

export function validateReviewJob(job) {
  const errors = [];

  if (!job || typeof job !== "object" || Array.isArray(job)) {
    return ["expected `islo job get` to return a JSON object"];
  }

  if (!job.latest_version) {
    errors.push("job has no deployed version");
  }

  const params = Array.isArray(job.params) ? job.params : [];
  const paramsByName = new Map(
    params
      .filter((param) => param && typeof param === "object")
      .map((param) => [param.name, param]),
  );

  for (const [name, expectedType] of REQUIRED_PARAMS) {
    const param = paramsByName.get(name);
    if (!param) {
      errors.push(`missing required param '${name}'`);
      continue;
    }
    if (param.type !== expectedType) {
      errors.push(
        `param '${name}' must be type '${expectedType}', got '${param.type}'`,
      );
    }
  }

  return errors;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  let job;
  try {
    job = JSON.parse(await readStdin());
  } catch (error) {
    console.error(
      `Failed to parse \`islo job get\` JSON: ${error.message ?? error}`,
    );
    process.exit(1);
  }

  const errors = validateReviewJob(job);
  if (errors.length > 0) {
    console.error("The deployed islo-review job is not compatible:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    console.error("Deploy a compatible islo-review job from the Islo UI.");
    process.exit(1);
  }

  console.log("The deployed islo-review job is compatible.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
