import { execSync } from "child_process";

export function checkoutPR(
  cwd: string,
  headRef: string,
  baseRef: string
): void {
  execSync(`git fetch origin "${headRef}:${headRef}" "${baseRef}:${baseRef}"`, {
    cwd,
    stdio: "inherit",
  });
  execSync(`git checkout "${headRef}"`, { cwd, stdio: "inherit" });
}

export function getDiff(
  cwd: string,
  baseRef: string,
  headRef: string
): string {
  return execSync(`git diff "origin/${baseRef}...${headRef}"`, {
    cwd,
    maxBuffer: 10 * 1024 * 1024,
  }).toString();
}
