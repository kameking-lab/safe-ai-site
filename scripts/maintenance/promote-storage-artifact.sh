#!/usr/bin/env bash
set -euo pipefail
export GIT_NO_REPLACE_OBJECTS=1

# This script runs only in a fresh write-capable job checked out at the exact
# default-branch commit used by the read-only generation job. The downloaded
# artifact is treated strictly as data and may replace only existing 100644
# JSON files in the caller-provided exact allowlist.

artifact_root="${STORAGE_ARTIFACT_ROOT:-}"
expected_base="${EXPECTED_BASE_SHA:-}"
allowed_path_list="${STORAGE_ALLOWED_PATHS:-}"
commit_message="${STORAGE_COMMIT_MESSAGE:-}"
target_branch="${TARGET_BRANCH:-main}"
repository="${GITHUB_REPOSITORY:-}"
server_url="${GITHUB_SERVER_URL:-https://github.com}"

if [[ ! "$expected_base" =~ ^[0-9a-f]{40}$ || -z "$artifact_root" || -z "$allowed_path_list" || -z "$commit_message" ]]; then
  echo "::error::Promotion inputs are incomplete or invalid."
  exit 1
fi
if [[ -z "${GH_TOKEN:-}" || ! "$repository" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ || "$server_url" != "https://github.com" ]]; then
  echo "::error::Trusted GitHub repository metadata is invalid."
  exit 1
fi
if ! git check-ref-format --branch "$target_branch" >/dev/null 2>&1; then
  echo "::error::Invalid target branch."
  exit 1
fi

worktree_root="$(git rev-parse --show-toplevel)"
artifact_root="$(realpath "$artifact_root")"
if [[ ! -d "$artifact_root" || "$artifact_root" == "$worktree_root" || "$artifact_root" == "$worktree_root"/* ]]; then
  echo "::error::Artifact root must be a separate existing directory."
  exit 1
fi
if [[ -n "$(git status --porcelain=v1 --untracked-files=all)" || "$(git rev-parse HEAD)" != "$expected_base" ]]; then
  echo "::error::Promotion checkout is not the clean expected base commit."
  exit 1
fi

remote_url="$server_url/$repository.git"
# Configure the ephemeral runner before the first authenticated remote read so
# the same fail-closed flow remains available if the repository becomes private.
gh auth setup-git
remote_base="$(git ls-remote --heads "$remote_url" "refs/heads/$target_branch" | awk '{print $1}')"
if [[ "$remote_base" != "$expected_base" ]]; then
  echo "::error::Default branch advanced after data generation; retry on the next run."
  exit 1
fi

IFS=':' read -r -a allowed_paths <<< "$allowed_path_list"
if [[ "${#allowed_paths[@]}" -eq 0 ]]; then
  echo "::error::Scheduled-data allowlist is empty."
  exit 1
fi

declare -A expected_artifacts=()
for allowed_path in "${allowed_paths[@]}"; do
  if [[ -z "$allowed_path" || ! "$allowed_path" =~ ^web/src/data/[A-Za-z0-9._/-]+\.json$ || "$allowed_path" == *".."* || "$allowed_path" == */ ]]; then
    echo "::error::Invalid scheduled-data path allowlist."
    exit 1
  fi
  if [[ -n "${expected_artifacts[$allowed_path]:-}" ]]; then
    echo "::error::Duplicate scheduled-data path."
    exit 1
  fi
  expected_artifacts["$allowed_path"]=1
  if [[ "$(git ls-tree "$expected_base" -- "$allowed_path" | awk '{print $1 " " $2}')" != "100644 blob" ]]; then
    echo "::error::Scheduled-data target is not an existing 100644 blob."
    exit 1
  fi
done

if find -P "$artifact_root" -mindepth 1 \( -type l -o \( ! -type d ! -type f \) \) -print -quit | grep -q .; then
  echo "::error::Artifact contains a symlink or unsupported file type."
  exit 1
fi

artifact_count=0
while IFS= read -r -d '' artifact_file; do
  relative_path="${artifact_file#"$artifact_root"/}"
  if [[ "$relative_path" == "$artifact_file" || -z "${expected_artifacts[$relative_path]:-}" ]]; then
    echo "::error::Artifact contains a path outside the exact allowlist."
    exit 1
  fi
  artifact_count=$((artifact_count + 1))
done < <(find -P "$artifact_root" -type f -print0)
if [[ "$artifact_count" -ne "${#allowed_paths[@]}" ]]; then
  echo "::error::Artifact is missing one or more exact allowlisted files."
  exit 1
fi

for allowed_path in "${allowed_paths[@]}"; do
  source_file="$artifact_root/$allowed_path"
  if [[ ! -f "$source_file" || -L "$source_file" ]]; then
    echo "::error::Artifact payload is not a regular file."
    exit 1
  fi
  install -m 0644 -- "$source_file" "$worktree_root/$allowed_path"
done

if [[ -n "$(git diff --name-only --diff-filter=ACDRTUXB "$expected_base" --)" ]]; then
  echo "::error::Promotion may only modify existing regular data files."
  exit 1
fi
mapfile -d '' changed_paths < <(git diff --name-only -z "$expected_base" --)
if [[ "${#changed_paths[@]}" -eq 0 ]]; then
  echo "Generated data matches the current default branch."
  exit 0
fi
for changed_path in "${changed_paths[@]}"; do
  if [[ -z "${expected_artifacts[$changed_path]:-}" ]]; then
    echo "::error::Promotion changed a path outside the exact allowlist."
    exit 1
  fi
done
git diff --check
git add -- "${allowed_paths[@]}"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git config --local core.hooksPath /dev/null
git commit -m "$commit_message"

# Execute only the helper committed in the clean trusted checkout. Artifact
# bytes were copied exclusively to exact data paths and cannot replace it.
bash "$worktree_root/scripts/maintenance/push-with-storage-gate.sh"
