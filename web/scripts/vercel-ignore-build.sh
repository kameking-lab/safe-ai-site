#!/usr/bin/env bash
set -u

message=${VERCEL_GIT_COMMIT_MESSAGE:-}
if printf '%s' "$message" | grep -Eiq '\[(skip ci|ci skip|no ci|skip actions|actions skip)\]|(^|[[:space:]])skip-checks:[[:space:]]*true([[:space:]]|$)'; then
  exit 0
fi

# Every non-skipped commit is built. This avoids missing an earlier change in a
# multi-commit push or a merge by comparing only with HEAD~1.
exit 1
