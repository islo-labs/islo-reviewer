import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { ensureRepo, checkoutPR } from "./utils/git.js";
import { getPRFromRun, getCILogs, getRecentBotCommits } from "./utils/github.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const [repo, runId] = process.argv.slice(2);
if (!repo || !runId) {
  console.error("Usage: tsx src/babysit.ts <owner/repo> <run-id>");
  process.exit(1);
}

const repoShort = repo.split("/")[1];
const cwd = `/workspace/${repoShort}`;

console.log(`Babysitting CI failure for run ${runId} in ${repo}`);

const { prNumber, headRef, baseRef } = getPRFromRun(repo, runId);
console.log(`PR #${prNumber}, branch: ${headRef} -> ${baseRef}`);

ensureRepo(repo, cwd);
checkoutPR(cwd, headRef, baseRef);

const botCommits = getRecentBotCommits(cwd);
if (botCommits >= 3) {
  console.log(
    `Bot has already made ${botCommits} fix attempts. Stopping to avoid infinite loop.`
  );
  process.exit(0);
}

const ciLogs = getCILogs(repo, runId);
console.log(`CI log size: ${ciLogs.length} chars`);

const promptTemplate = readFileSync(
  join(__dirname, "prompts", "babysit.md"),
  "utf-8"
);
const prompt = promptTemplate
  .replaceAll("{{REPO}}", repo)
  .replaceAll("{{PR_NUMBER}}", prNumber)
  .replaceAll("{{CI_LOGS}}", ciLogs);

for await (const message of query({
  prompt,
  options: {
    cwd,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    maxTurns: 15,
  },
})) {
  if (message.type === "assistant") {
    process.stdout.write(".");
  }
}

console.log("\nBabysit complete.");
