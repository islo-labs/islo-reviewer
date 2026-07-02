#!/usr/bin/env bash
set -euo pipefail

if command -v islo >/dev/null 2>&1; then
  exit 0
fi

curl -fsSL https://islo.dev/install.sh | sh
