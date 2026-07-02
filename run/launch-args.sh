#!/usr/bin/env bash

build_launch_args() {
  LAUNCH_ARGS="--${REPO} pr/${PR_NUMBER}"
  if [ -n "${RELATED_PRS:-}" ]; then
    IFS=',' read -ra PAIRS <<< "${RELATED_PRS}"
    for pair in "${PAIRS[@]}"; do
      repo_name="${pair%%:*}"
      ref="${pair#*:}"
      LAUNCH_ARGS="${LAUNCH_ARGS} --${repo_name} ${ref}"
    done
  fi
  export LAUNCH_ARGS
}
