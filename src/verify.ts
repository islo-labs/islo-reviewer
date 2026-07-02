import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { getPRInfo } from "./utils/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [repo, prNumber, model, maxTurnsStr, maxBudgetStr, relatedPrsStr] =
  process.argv.slice(2);

if (!repo || !prNumber) {
  console.error(
    "Usage: tsx src/verify.ts <owner/repo> <pr-number> [model] [max-turns] [max-budget-usd] [related-prs]"
  );
  process.exit(1);
}

const repoShort = repo.split("/")[1];
const cwd = `/workspace/${repoShort}`;

console.log(`Verifying PR #${prNumber} in ${repo}`);

const { headRef, baseRef, title } = getPRInfo(repo, prNumber);
console.log(`PR: "${title}"`);
console.log(`Branch: ${headRef} → ${baseRef}`);

if (relatedPrsStr) {
  console.log(`Related PRs: ${relatedPrsStr}`);
}

const promptTemplate = readFileSync(
  join(__dirname, "prompts", "verify.md"),
  "utf-8"
);

let contextSection = "";
for (const name of ["REVIEW.md", "VERIFY.md"]) {
  const p = join(cwd, name);
  if (existsSync(p)) contextSection += readFileSync(p, "utf-8") + "\n";
}

const prompt = promptTemplate
  .replaceAll("{{REPO}}", repo)
  .replaceAll("{{REPO_SHORT}}", repoShort)
  .replaceAll("{{PR_NUMBER}}", prNumber)
  .replaceAll("{{HEAD_REF}}", headRef)
  .replaceAll("{{BASE_REF}}", baseRef)
  .replaceAll("{{PR_TITLE}}", title)
  .replaceAll("{{RELATED_PRS}}", relatedPrsStr || "none")
  .replaceAll("{{CONTEXT_SECTION}}", contextSection);

console.log("Starting verification agent...");

for await (const message of query({
  prompt,
  options: {
    cwd,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: maxTurnsStr ? parseInt(maxTurnsStr, 10) : 80,
    model: model || "claude-opus-4-6",
    ...(maxBudgetStr ? { maxBudgetUsd: parseFloat(maxBudgetStr) } : {}),
  },
})) {
  if (message.type === "assistant") {
    process.stdout.write(".");
  }
}

console.log("\nVerification complete.");
