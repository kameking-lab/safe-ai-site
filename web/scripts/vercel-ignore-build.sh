#!/usr/bin/env bash
set -u

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! node "$script_dir/storage-deployment-guard.mjs" --committed-tree; then
  printf '%s\n' 'Committed source failed the deployment storage guard; keeping the current production deployment.' >&2
  exit 0
fi

# Storage-gate candidate refs are immutable transport only. Skip their Preview;
# the same accepted commit is built when it is fast-forwarded to main.
if [[ "${VERCEL_GIT_COMMIT_REF:-}" =~ ^automation/storage-gate/[0-9]+-[0-9]+-[1-3]$ ]]; then
  exit 0
fi

# Every safe commit is built. Neither a commit message nor a first-parent diff
# proves that all earlier commits in the same push were already deployed.
exit 1
