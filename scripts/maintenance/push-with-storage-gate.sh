#!/usr/bin/env bash
set -euo pipefail
export GIT_NO_REPLACE_OBJECTS=1

# Push a trusted scheduled-data commit through the same immutable storage gate
# required for human pull requests. The candidate is first made reachable on a
# short-lived branch, scanned by the default-branch workflow, and only then
# fast-forwarded to main after GitHub Actions has published the required status.

target_branch="${TARGET_BRANCH:-main}"
storage_workflow="${STORAGE_WORKFLOW:-storage-budget.yml}"
repository="${GITHUB_REPOSITORY:-}"
server_url="${GITHUB_SERVER_URL:-https://github.com}"
run_id="${GITHUB_RUN_ID:-}"
run_attempt="${GITHUB_RUN_ATTEMPT:-1}"
allowed_path_list="${STORAGE_ALLOWED_PATHS:-}"
status_context="repository-hygiene-target"
staging_branch=""
remote_url=""
remote_tracking_ref=""

if [[ -z "${GH_TOKEN:-}" || ! "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ || ! "$run_id" =~ ^[0-9]+$ || ! "$run_attempt" =~ ^[0-9]+$ ]]; then
  echo "::error::Trusted GitHub Actions identity metadata is missing."
  exit 1
fi
if [[ "$server_url" != "https://github.com" ]]; then
  echo "::error::Unexpected GitHub server URL."
  exit 1
fi
if ! git check-ref-format --branch "$target_branch" >/dev/null 2>&1; then
  echo "::error::Invalid target branch."
  exit 1
fi
IFS=':' read -r -a allowed_paths <<< "$allowed_path_list"
if [[ "${#allowed_paths[@]}" -eq 0 ]]; then
  echo "::error::Invalid scheduled-data path allowlist."
  exit 1
fi
for allowed_path in "${allowed_paths[@]}"; do
  if [[ -z "$allowed_path" || ! "$allowed_path" =~ ^web/src/data/[A-Za-z0-9._/-]+$ || "$allowed_path" == *".."* || "$allowed_path" == */ ]]; then
    echo "::error::Invalid scheduled-data path allowlist."
    exit 1
  fi
done

remote_url="$server_url/$repository.git"
remote_tracking_ref="refs/remotes/storage-origin/$target_branch"

# checkout intentionally persists no credential. Configure git to delegate
# authentication to gh only inside this trusted promotion step.
gh auth setup-git

cleanup_staging_branch() {
  if [[ -n "$staging_branch" ]]; then
    git push "$remote_url" --delete "$staging_branch" >/dev/null 2>&1 || true
    staging_branch=""
  fi
}
trap cleanup_staging_branch EXIT

wait_for_storage_status() {
  local candidate_sha="$1"
  local request_id="$2"
  local state="missing"

  for _ in $(seq 1 144); do
    state="$(
      gh api "repos/$repository/commits/$candidate_sha/statuses" \
        --jq ".[] | select(.context == \"$status_context\" and ((.description // \"\") | endswith(\"[$request_id]\"))) | .state" \
        2>/dev/null | head -n 1 || true
    )"
    state="${state:-missing}"
    case "$state" in
      success)
        return 0
        ;;
      error|failure)
        echo "::error::Trusted repository storage scan failed."
        return 1
        ;;
      pending|missing)
        sleep 5
        ;;
      *)
        echo "::error::Unexpected repository storage status."
        return 1
        ;;
    esac
  done

  echo "::error::Timed out waiting for trusted repository storage status."
  return 1
}

for attempt in 1 2 3; do
  git fetch --no-tags "$remote_url" \
    "refs/heads/$target_branch:$remote_tracking_ref"
  expected_base="$(git rev-parse "$remote_tracking_ref")"
  git rebase "$expected_base"

  candidate_sha="$(git rev-parse HEAD)"
  ahead_count="$(git rev-list --count "$expected_base..$candidate_sha")"
  if [[ "$ahead_count" != "1" ]]; then
    echo "::error::Scheduled update must contain exactly one candidate commit."
    exit 1
  fi

  read -r commit_sha parent_sha extra_parent < <(git rev-list --parents -n 1 "$candidate_sha")
  if [[ "$commit_sha" != "$candidate_sha" || "$parent_sha" != "$expected_base" || -n "${extra_parent:-}" ]]; then
    echo "::error::Scheduled update must be a single-parent child of current main."
    exit 1
  fi

  if [[ -n "$(git diff --name-only --diff-filter=ACDRTUXB "$expected_base" "$candidate_sha")" ]]; then
    echo "::error::Scheduled update may only modify existing regular data files."
    exit 1
  fi

  mapfile -d '' changed_paths < <(
    git diff --name-only -z "$expected_base" "$candidate_sha"
  )
  if [[ "${#changed_paths[@]}" -eq 0 ]]; then
    echo "::error::Scheduled update candidate has no changed files."
    exit 1
  fi
  for changed_path in "${changed_paths[@]}"; do
    path_allowed=false
    for allowed_path in "${allowed_paths[@]}"; do
      if [[ "$changed_path" == "$allowed_path" ]]; then
        path_allowed=true
        break
      fi
    done
    if [[ "$path_allowed" != true ]]; then
      echo "::error::Scheduled update changed a path outside its allowlist."
      exit 1
    fi
    if [[ "$(git ls-tree "$candidate_sha" -- "$changed_path" | awk '{print $1 " " $2}')" != "100644 blob" ]]; then
      echo "::error::Scheduled update target is not a regular 100644 blob."
      exit 1
    fi
  done

  staging_branch="automation/storage-gate/${run_id}-${run_attempt}-${attempt}"
  git push "$remote_url" "$candidate_sha:refs/heads/$staging_branch"

  staged_tip="$(git ls-remote --heads "$remote_url" "refs/heads/$staging_branch" | awk '{print $1}')"
  if [[ "$staged_tip" != "$candidate_sha" ]]; then
    echo "::error::Remote automation candidate does not match the inspected commit."
    exit 1
  fi

  request_id="automation-${run_id}-${run_attempt}-${attempt}"
  gh api --method POST "repos/$repository/statuses/$candidate_sha" \
    --field "state=pending" \
    --field "context=$status_context" \
    --field "description=Awaiting trusted storage scan [$request_id]" \
    --field "target_url=$server_url/$repository/actions/runs/$run_id" \
    --silent

  gh workflow run "$storage_workflow" \
    --repo "$repository" \
    --ref "$target_branch" \
    --field "target_sha=$candidate_sha" \
    --field "request_id=$request_id"

  wait_for_storage_status "$candidate_sha" "$request_id"

  remote_main="$(git ls-remote --heads "$remote_url" "refs/heads/$target_branch" | awk '{print $1}')"
  if [[ "$remote_main" != "$expected_base" ]]; then
    echo "Target branch advanced while the candidate was scanned; rebasing and rescanning."
    cleanup_staging_branch
    continue
  fi

  if git push "$remote_url" "$candidate_sha:refs/heads/$target_branch"; then
    echo "Trusted storage-gated update pushed on attempt $attempt."
    cleanup_staging_branch
    exit 0
  fi

  remote_after_failure="$(git ls-remote --heads "$remote_url" "refs/heads/$target_branch" | awk '{print $1}')"
  if [[ "$remote_after_failure" == "$expected_base" ]]; then
    echo "::error::Storage-gated main update was rejected without a branch race."
    exit 1
  fi
  cleanup_staging_branch
done

echo "::error::Target branch changed during all storage-gated push attempts."
exit 1
