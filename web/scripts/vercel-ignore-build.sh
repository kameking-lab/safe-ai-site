#!/usr/bin/env bash
set -u

# Preview deployments are not used by CI or reviewers; building every PR push
# only adds Vercel build minutes. Production (main) is never skipped here.
if [ "${VERCEL_ENV:-}" = "preview" ]; then
  printf '%s\n' 'Preview build skipped to save build minutes; production builds are unaffected.' >&2
  exit 0
fi

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
if ! node "$script_dir/storage-deployment-guard.mjs" --committed-tree; then
  printf '%s\n' 'Committed source failed the deployment storage guard; keeping the current production deployment.' >&2
  exit 0
fi

# Every safe commit is built. Neither a commit message nor a first-parent diff
# proves that all earlier commits in the same push were already deployed.
exit 1
