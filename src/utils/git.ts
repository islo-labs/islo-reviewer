import { execSync } from "child_process";
import { existsSync } from "fs";

export function ensureRepo(repo: string, cwd: string): void {
  if (existsSync(cwd)) {
    return;
  }
  const parentDir = cwd.substring(0, cwd.lastIndexOf("/"));
  console.log(`Repo not found at ${cwd}, cloning...`);
  execSync(`git clone "https://github.com/${repo}.git" "${cwd}"`, {
    cwd: parentDir,
    stdio: "inherit",
  });
}

export function checkoutPR(
  cwd: string,
  headRef: string,
  baseRef: string
): void {
  // Snapshot repos are shallow clones (--depth=1), so we can't just
  // git fetch origin and expect all branches. Fetch the specific branch.
  execSync(`git fetch origin "${headRef}"`, { cwd, stdio: "inherit" });
  execSync(`git checkout -B "${headRef}" FETCH_HEAD`, {
    cwd,
    stdio: "inherit",
  });
}
