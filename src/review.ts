import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ensureRepo, checkoutPR } from "./utils/git.js";
import { getPRInfo } from "./utils/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [repo, prNumber, model, maxTurnsStr, maxBudgetStr] = process.argv.slice(2);
if (!repo || !prNumber) {
  console.error("Usage: tsx src/review.ts <owner/repo> <pr-number> [model] [max-turns] [max-budget-usd]");
  process.exit(1);
}

const repoShort = repo.split("/")[1];
const cwd = `/workspace/${repoShort}`;

console.log(`Reviewing PR #${prNumber} in ${repo}`);

const { headRef, baseRef } = getPRInfo(repo, prNumber);
console.log(`Branch: ${headRef} -> ${baseRef}`);

ensureRepo(repo, cwd);
checkoutPR(cwd, headRef, baseRef);

const promptTemplate = readFileSync(
  join(__dirname, "prompts", "review.md"),
  "utf-8"
);

let contextSection = "";
const contextPath = join(cwd, "REVIEW.md");
if (existsSync(contextPath)) {
  contextSection = readFileSync(contextPath, "utf-8");
}

const prompt = promptTemplate
  .replaceAll("{{REPO}}", repo)
  .replaceAll("{{PR_NUMBER}}", prNumber)
  .replaceAll("{{HEAD_REF}}", headRef)
  .replaceAll("{{BASE_REF}}", baseRef)
  .replaceAll("{{CONTEXT_SECTION}}", contextSection);

for await (const message of query({
  prompt,
  options: {
    cwd,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: maxTurnsStr ? parseInt(maxTurnsStr, 10) : 50,
    model: model || "claude-opus-4-6",
    ...(maxBudgetStr ? { maxBudgetUsd: parseFloat(maxBudgetStr) } : {}),
  },
})) {
  if (message.type === "assistant") {
    process.stdout.write(".");
  }
}

console.log("\nReview complete.");
