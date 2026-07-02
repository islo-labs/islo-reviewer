#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "${SCRIPT_DIR}/install-islo.sh"

if [ "${CLEANUP:-false}" = "true" ]; then
  islo rm "$SANDBOX" --force || true
  exit 0
fi

sandbox_args=(islo use "$SANDBOX")
if [ -n "${ISLO_CONFIG:-}" ]; then
  sandbox_args+=(--config "$ISLO_CONFIG")
else
  sandbox_args+=(--no-config)
fi
if [ -n "${SNAPSHOT:-}" ]; then
  sandbox_args+=(--snapshot "$SNAPSHOT")
fi
sandbox_args+=(--cpu "$CPU" --memory "$MEMORY")
if [ -n "${PAUSE_AFTER_IDLE_SECONDS:-}" ]; then
  sandbox_args+=(--pause-after-idle "$PAUSE_AFTER_IDLE_SECONDS" --auto-resume on_activity)
fi
sandbox_args+=(-- echo "Sandbox ready")
"${sandbox_args[@]}"

if [ -z "${BOOT_COMMAND:-}" ]; then
  exit 0
fi

RESOLVED_CMD=$(envsubst '${REPO} ${PR_NUMBER} ${LAUNCH_ARGS} ${RELATED_PRS} ${SHARE_PORT}' <<< "$BOOT_COMMAND")

echo "Running boot command: ${RESOLVED_CMD}"
islo use --no-config "$SANDBOX" -- bash -c "
  source ~/.bashrc 2>/dev/null || true
  ${RESOLVED_CMD}
"
