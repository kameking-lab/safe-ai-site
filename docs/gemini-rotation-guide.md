# GEMINI_API_KEY 再発行手順書

対象: `GEMINI_API_KEY`  
用途: 全AIチャット・要約・クイズ解説・法改正要約など7箇所で使用  
参照箇所:
- `web/src/app/api/chat/route.ts`
- `web/src/app/api/chatbot/route.ts`
- `web/src/app/api/chemical-ra/route.ts`
- `web/src/app/api/goods-chat/route.ts`
- `web/src/app/api/law-summary/route.ts`
- `web/src/app/api/quiz-explain/route.ts`
- `web/src/app/api/summaries/route.ts`

作成日: 2026-05-02  
**実際のローテーションはオーナー手動で実施すること**

---

## なぜローテーションが必要か

- APIキーが漏洩した疑いがある場合
- 定期セキュリティメンテナンス (推奨: 6ヶ月〜1年周期)
- Google AI Studio でキー使用量の異常を検知した場合

---

## ステップ 1: 新APIキーの発行

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. Google アカウントでログイン（プロジェクトオーナーのアカウント）
3. **Create API key** → プロジェクトを選択（または新規作成）
4. 新しいAPIキーが表示される → コピー（**ページを閉じると再表示できない**）

### APIキーの確認（新キー発行後）

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=<新しいキー>" \
  -H "Content-Type: application/json" | head -5
# → models リストが返れば有効
```

---

## ステップ 2: Vercel 環境変数の更新

### CLI での更新（プロジェクトリンク後）

```bash
# Production
vercel env rm GEMINI_API_KEY production
echo "<新しいキー>" | vercel env add GEMINI_API_KEY production

# Preview
vercel env rm GEMINI_API_KEY preview
echo "<新しいキー>" | vercel env add GEMINI_API_KEY preview

# Development
vercel env rm GEMINI_API_KEY development
echo "<新しいキー>" | vercel env add GEMINI_API_KEY development
```

### GUI での更新

1. Vercel ダッシュボード → プロジェクト → **Settings** → **Environment Variables**
2. `GEMINI_API_KEY` を検索
3. **Edit** → 新しいキーを貼り付け → **Save**

---

## ステップ 3: ローカル開発環境の更新

各開発者の `web/.env.local` も更新が必要:

```bash
# web/.env.local
GEMINI_API_KEY=<新しいキー>
```

---

## ステップ 4: 再デプロイと動作確認

```bash
# Vercel 再デプロイ
vercel --prod

# チャット API の動作確認
curl -s -X POST "https://safe-ai-site.vercel.app/api/chatbot" \
  -H "Content-Type: application/json" \
  -d '{"message":"テスト"}' | head -50
```

---

## ステップ 5: 旧キーの削除

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 旧APIキーを選択 → **Delete key**
3. 確認ダイアログで削除を承認

> 旧キーを削除すると、そのキーを使用している全リクエストが `403` エラーになる。  
> 再デプロイ後に削除すること。

---

## 旧エイリアス `GOOGLE_API_KEY` について

`chat/route.ts` と `chatbot/route.ts` には以下のフォールバックがある:

```typescript
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
```

- `GOOGLE_API_KEY` が Vercel に設定されている場合はそのままでも動作する
- 統一のため `GEMINI_API_KEY` を正として、`GOOGLE_API_KEY` は設定不要
- 将来的にコードからフォールバックを削除可

---

## ローテーション後チェックリスト

- [ ] 新キー発行済み (Google AI Studio)
- [ ] Vercel Production 環境変数更新済み
- [ ] Vercel Preview 環境変数更新済み
- [ ] Vercel Development 環境変数更新済み
- [ ] 再デプロイ完了
- [ ] チャットボット動作確認済み
- [ ] 法改正要約 API 動作確認済み
- [ ] 旧キー削除済み
- [ ] 各開発者のローカル `.env.local` 更新依頼済み

---

## 緊急時（漏洩発覚時）

1. Google AI Studio → 旧キーを即時 **Delete**
2. 新キー発行 → Vercel 環境変数更新 → 再デプロイ

AI チャット・要約機能が旧キー削除から再デプロイ完了まで停止する。  
ユーザーへの影響を最小化するため、深夜帯（アクセス少）での実施を推奨。
