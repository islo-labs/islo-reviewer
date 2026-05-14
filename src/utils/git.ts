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
