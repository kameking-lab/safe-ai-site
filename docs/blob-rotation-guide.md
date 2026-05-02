# BLOB_READ_WRITE_TOKEN 再発行手順書

対象: `BLOB_READ_WRITE_TOKEN`  
用途: `web/src/app/api/mhlw/search/route.ts` — 厚労省検索データのBlobストレージ読み書き  
作成日: 2026-05-02  
**実際のローテーションはオーナー手動で実施すること**

---

## なぜローテーションが必要か

- トークンが漏洩した疑いがある場合
- 定期セキュリティメンテナンス (推奨: 6ヶ月〜1年周期)
- 開発者の離任時

---

## 事前確認

```bash
# 現在のトークンが機能しているか確認
curl -I "https://blob.vercel-storage.com/" \
  -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN"
# → 200 OK なら正常
```

---

## ステップ 1: 新トークンの発行

1. [Vercel ダッシュボード](https://vercel.com) にログイン
2. 対象プロジェクト (`safe-ai-site`) を開く
3. **Storage** タブ → Blob ストアを選択
4. **Settings** → **Tokens** → **Create Token**
5. トークン名: `safe-ai-site-prod-YYYYMM` (例: `safe-ai-site-prod-202605`)
6. Scope: `Read & Write`
7. **Create** をクリック → 表示された新トークンをコピー（**一度しか表示されない**）

---

## ステップ 2: Vercel 環境変数の更新

### CLI での更新（プロジェクトリンク後）

```bash
# 旧トークンを削除
vercel env rm BLOB_READ_WRITE_TOKEN production
vercel env rm BLOB_READ_WRITE_TOKEN preview

# 新トークンを追加
echo "<新しいトークン>" | vercel env add BLOB_READ_WRITE_TOKEN production
echo "<新しいトークン>" | vercel env add BLOB_READ_WRITE_TOKEN preview
```

### GUI での更新

1. Vercel ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. `BLOB_READ_WRITE_TOKEN` を検索
3. **Edit** → 新しいトークンを貼り付け → **Save**
4. Production と Preview 両方更新すること

---

## ステップ 3: 再デプロイ

```bash
# 新しいトークンを反映させるため再デプロイが必要
vercel --prod
# または GitHub に push して自動デプロイ
```

---

## ステップ 4: 動作確認

```bash
# Vercel 環境で API が正常動作するか確認
curl -s "https://safe-ai-site.vercel.app/api/mhlw/search?q=test" | head -100
# → エラーなく JSON が返れば成功
```

---

## ステップ 5: 旧トークンの失効

1. Vercel Blob ストア → **Settings** → **Tokens**
2. 旧トークンを選択 → **Revoke**
3. 失効後、旧トークンを使った API は `401 Unauthorized` を返す

---

## ローテーション後チェックリスト

- [ ] 新トークン発行済み
- [ ] Vercel Production 環境変数更新済み
- [ ] Vercel Preview 環境変数更新済み
- [ ] 再デプロイ完了
- [ ] `/api/mhlw/search` の動作確認済み
- [ ] 旧トークン失効済み
- [ ] `.env.local` の手元コピーも更新済み（開発者のローカル環境）

---

## 緊急時（漏洩発覚時）

**順序を逆にして旧トークンを先に失効させる:**

1. Vercel Blob → 旧トークンを即時 **Revoke**
2. 新トークン発行 → Vercel 環境変数に設定 → 再デプロイ

ダウンタイムは再デプロイ完了まで発生する（通常 1〜3 分）。
