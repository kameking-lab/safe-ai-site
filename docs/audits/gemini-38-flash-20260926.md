# Gemini Flash モデル移行（2026-09-26）

## 判断

- 現行の `gemini-3.6-flash` から、2026-09-02 に一般提供された安定版 `gemini-3.8-flash` に固定 ID を更新する。`gemini-flash-latest` のような自動切替エイリアスは使わない。
- Google 公式価格表では両モデルとも、2026年末まで標準リクエストは入力 $0.75、出力（思考を含む）$3.75 / 100万トークン。2027年以降も両モデルの表示単価は入力 $1.50、出力 $7.50。ただし3.8は長い複雑処理で思考トークンが増え得るため、請求額が同額になるという意味ではない。
- チャットの生成候補は既存の出典検査後に証拠ベースの回答へ置き換えられ、建設計算の生成候補も決定論のルート検証を通る。この低遅延用途は公式推奨の `thinkingLevel: low` に固定する。KY危険提案は内容の質を優先して既定の `medium` を維持する。
- 既存の `GEMINI_API_KEY`、外部AI有効フラグ、12秒のKY/計算タイムアウト、サーキットブレーカ、証拠ベース回答・定型提案・計算機ルーティングの失敗時フォールバックを継続する。新たな有料API、キー、検索グラウンディング、外部ツール呼出しは追加しない。

## 対象と確認

- 共通モデル指定: `web/src/lib/gemini-model.ts`
- 利用経路: `/api/chatbot`、`/api/chatbot/stream`、`/api/construction-calc`、KY提案。モデル疎通監視は共通指定を参照する。
- 回帰ゲート: モデル固定・旧パラメータ不使用、チャット通常/streamの要求、計算RESTのJSON設定とキー隔離、KYの要求、TypeScript、全テスト、ビルド。
- 実APIでの新旧同一質問比較、実測の応答時間・トークン・費用はこの変更だけでは確定しない。公開後は既存の生成品質評価と利用量記録で確認する。環境側にモデル未提供またはクォータ不足があれば既存の決定論フォールバックへ落ちる。

既存キーによる公開前の疎通確認では、`GET /v1beta/models/gemini-3.8-flash` が `generateContent` 対応・入力1,048,576/出力65,536トークンを返した。個人情報を含まない固定入力でのJSON生成も計算用lowが1,276ms（入力39/出力28トークン）、KY用mediumが2,463ms（入力30/出力88/思考138トークン）で成功した。この2件の所要時間は単発の疎通確認であり、実利用時の応答時間や品質の保証値ではない。

ローカルでは変更したTypeScript 8ファイルの構文診断が0件、`git diff --check` が成功。隔離worktreeの依存インストールは完了していないため、型検査・Vitest・本番ビルドはPRのCI結果で判定する。テスト入力とAPIキーはリポジトリに保存しない。

## 一次資料

- [Gemini 3.8 Flash モデル](https://ai.google.dev/gemini-api/docs/models/gemini-3.8-flash)
- [Gemini API 価格表](https://ai.google.dev/gemini-api/docs/pricing)
- [最新モデルと移行上の注意](https://ai.google.dev/gemini-api/docs/latest-model)
- [Gemini の thinkingLevel](https://ai.google.dev/gemini-api/docs/generate-content/thinking)
