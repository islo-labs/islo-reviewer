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
  execSync(`git fetch origin`, { cwd, stdio: "inherit" });
  execSync(`git checkout "${headRef}"`, { cwd, stdio: "inherit" });
}
