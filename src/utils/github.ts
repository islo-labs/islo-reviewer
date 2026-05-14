import { execSync } from "child_process";

interface PRInfo {
  headRef: string;
  baseRef: string;
  title: string;
}

interface PRFromRun {
  prNumber: string;
  headRef: string;
  baseRef: string;
}

export function getPRInfo(repo: string, prNumber: string): PRInfo {
  const json = execSync(
    `gh pr view ${prNumber} --repo ${repo} --json headRefName,baseRefName,title`,
    { maxBuffer: 1024 * 1024 }
  ).toString();
  const data = JSON.parse(json);
  return {
    headRef: data.headRefName,
    baseRef: data.baseRefName,
    title: data.title,
  };
}

export function getPRFromRun(repo: string, runId: string): PRFromRun {
  const json = execSync(
    `gh run view ${runId} --repo ${repo} --json headBranch,event`,
    { maxBuffer: 1024 * 1024 }
  ).toString();
  const runData = JSON.parse(json);
  const headRef = runData.headBranch;

  // Find the PR for this branch
  const prJson = execSync(
    `gh pr list --repo ${repo} --head "${headRef}" --json number,baseRefName --limit 1`,
    { maxBuffer: 1024 * 1024 }
  ).toString();
  const prs = JSON.parse(prJson);

  if (prs.length === 0) {
    throw new Error(`No PR found for branch ${headRef} in ${repo}`);
  }

  return {
    prNumber: String(prs[0].number),
    headRef,
    baseRef: prs[0].baseRefName,
  };
}

export function getRecentBotCommits(cwd: string): number {
  try {
    const log = execSync(
      `git log --oneline --author="islo-reviewer" -10`,
      { cwd, maxBuffer: 1024 * 1024 }
    ).toString();
    return log.trim().split("\n").filter((line) => line.length > 0).length;
  } catch {
    return 0;
  }
}
