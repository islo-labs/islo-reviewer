import { query } from "@anthropic-ai/claude-agent-sdk";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
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

function sessionStatePath(repo: string, prNumber: string): string {
  const key = `${repo}-${prNumber}`.replace(/[^a-zA-Z0-9_.-]/g, "-");
  return join("/workspace/.islo-reviewer/sessions", `${key}.json`);
}

function readSessionId(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    return typeof parsed.session_id === "string" ? parsed.session_id : undefined;
  } catch (error) {
    console.warn(`Ignoring unreadable review session state at ${path}: ${error}`);
    return undefined;
  }
}

function writeSessionId(path: string, sessionId: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        repo,
        pr_number: prNumber,
        session_id: sessionId,
        updated_at: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
  );
}

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

const sessionPath = sessionStatePath(repo, prNumber);
const previousSessionId = readSessionId(sessionPath);
let sessionId = previousSessionId;

if (previousSessionId) {
  console.log(`Resuming Claude review session ${previousSessionId}`);
}

try {
  for await (const message of query({
    prompt,
    options: {
      cwd,
      permissionMode: "bypassPermissions",
      allowDangerouslySkipPermissions: true,
      maxTurns: maxTurnsStr ? parseInt(maxTurnsStr, 10) : 50,
      model: model || "claude-opus-4-6",
      ...(maxBudgetStr ? { maxBudgetUsd: parseFloat(maxBudgetStr) } : {}),
      ...(previousSessionId ? { resume: previousSessionId } : {}),
    },
  })) {
    if (
      message.type === "system" &&
      message.subtype === "init" &&
      typeof message.session_id === "string"
    ) {
      sessionId = message.session_id;
    }
    if (message.type === "result" && typeof message.session_id === "string") {
      sessionId = message.session_id;
    }
    if (message.type === "assistant") {
      process.stdout.write(".");
    }
  }
} finally {
  if (sessionId) {
    writeSessionId(sessionPath, sessionId);
  }
}

console.log("\nReview complete.");
