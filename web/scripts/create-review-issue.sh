#!/usr/bin/env bash
# create-review-issue.sh
# GitHub Issue を作成する
#
# 使い方:
#   bash web/scripts/create-review-issue.sh <日付> <グループ名> <Issue本文ファイルパス>
#
# 例:
#   bash web/scripts/create-review-issue.sh 2026-04-14 "グループA" /tmp/daily-review-2026-04-14.md

set -euo pipefail

DATE="${1:-}"
GROUP="${2:-}"
BODY_FILE="${3:-}"

# 引数チェック
if [[ -z "$DATE" || -z "$GROUP" || -z "$BODY_FILE" ]]; then
  echo "Error: 引数が不足しています"
  echo "使い方: $0 <日付> <グループ名> <Issue本文ファイルパス>"
  echo "例: $0 2026-04-14 グループA /tmp/daily-review-2026-04-14.md"
  exit 1
fi

if [[ ! -f "$BODY_FILE" ]]; then
  echo "Error: ファイルが見つかりません: $BODY_FILE"
  exit 1
fi

# gh CLI の確認
if ! command -v gh &> /dev/null; then
  echo "Error: gh コマンドが見つかりません。GitHub CLI をインストールしてください"
  echo "https://cli.github.com/"
  exit 1
fi

# gh auth の確認
if ! gh auth status &> /dev/null; then
  echo "Error: GitHub CLI が認証されていません。gh auth login を実行してください"
  exit 1
fi

TITLE="[Daily Review] ${DATE} ${GROUP}"
LABEL="daily-review"

echo "GitHub Issue を作成しています..."
echo "  タイトル: ${TITLE}"
echo "  本文ファイル: ${BODY_FILE}"

# ラベルが存在しない場合は作成（エラーは無視）
gh label create "${LABEL}" \
  --description "Daily Review による自動生成 Issue" \
  --color "0075ca" \
  2>/dev/null || true

# Issue 作成
ISSUE_URL=$(gh issue create \
  --title "${TITLE}" \
  --body-file "${BODY_FILE}" \
  --label "${LABEL}" \
  2>&1)

if [[ $? -eq 0 ]]; then
  echo ""
  echo "✅ Issue を作成しました: ${ISSUE_URL}"
else
  echo "Error: Issue の作成に失敗しました"
  echo "${ISSUE_URL}"
  exit 1
fi
