# Chrome 実操作レビュー 対応ログ（2026-04-19）

Chrome 実操作レビューで挙がった致命的問題と追加要望をタスク単位で修正した対応記録。
各タスクはそれぞれ独立コミット + main 直 push で完了している。

## 致命的問題の修正

### タスク1: KY保存クラッシュ修正
`fix(ky): prevent save crash with array guard and migration` (5eccaf2)
- `readFromStorage` が配列の localStorage データを誤ってオブジェクトに変換していた根本原因を修正
- `normalizeKyInstructionRecord` を公開し、旧スキーマを正規化
- `saveKyInstructionRecord` は try/catch し ServiceError を返す
- `ky-page-content` で マウント時に正規化、保存失敗時に専用バナー表示
- `app/(main)/ky/error.tsx` エラーバウンダリで白画面を回避

### タスク2: 化学物質RA復旧
`fix(chemical-ra): robust fallback and restore concentration input UI` (9510caa)
- 濃度入力フォーム + 判定（超過/警告/安全）をパネル上部に常設
- MHLW 8h 基準値 → AI exposureLimit の優先度で判定
- API に `aiStatus` / `aiErrorDetail` を追加（`apikey_missing` / `ai_failed` / `demo`）
- Rate limit / timeout / network / auth を振り分けて表示
- AI 失敗時も MHLW データは必ず表示される

### タスク3: 法改正AI要約の復旧
`fix(laws): restore AI summary using law-search pattern` (7e9d642)
- `/api/summaries` は mock 未登録の revisionId も Gemini でフォールバック生成
- Heuristic フォールバック（revision.summary を 3 行に分割）で AI 無効時にも成立
- `summary-panel` エラー時に「/law-search のAI要約を試す」リンクを表示

### タスク4: Markdownレンダリング
`fix(law-search): render markdown in AI summary` (6347ea5)
- 依存を増やさず軽量な `SimpleMarkdown` を導入
- **太字** / *斜体* / [link](url) / # 見出し / - 箇条書き / `code`
- law-search AI要約・chemical-ra rawReply に適用

### タスク5: マイク入力エラー詳細化
`fix(voice): detailed error messages for Web Speech API` (7663737)
- `SpeechRecognition.error.error` をカテゴリ分け
- not-allowed / no-speech / audio-capture / network / not-supported / aborted / language-not-supported
- `role="alert"` で読み上げ、幅を広げて文言全体を表示

### タスク6: Hydration Error 解消
`fix: resolve Hydration errors across pages` (7917b5e)
- KY / home-screen / safety-diary: 日付は空初期化 → useEffect で populate
- `new Date()` / `Date.now()` を SSR と Client で揃える

### タスク7: KY手書き署名を前面に
`fix(ky): expose signature canvas in participants tab` (6febf1a)
- 未署名時はキャンバスを自動展開
- ✍️ アイコンと緑ハイライトで視認性向上

### タスク8: KYのチップUI + 縦レイアウト
`fix(ky): vertical scroll layout and chip buttons for mobile` (5de0b85)
- 可能性/重大性/再評価のドロップダウンをタップしやすいチップ（36px+）に置換
- 数値 + 日本語ラベル（例: "3 重大"）で直感的
- 既に縦スクロール中心の単カラムカード

## 追加要望

### タスク9: オンボーディングモーダル抑制
`fix: suppress onboarding modal after dismissal` (7f39f6b)
- SSR 時は閉じた状態、マウント後に `localStorage` をチェックして開く
- スキップ時に dismissed-at タイムスタンプも記録

### タスク10: 100人辛口レビュー表記削除
`chore: remove 100-person review references from public pages` (acda335)
- `/about` One Big Thing ブロックを刷新
- `manifest.ts` description / `scaffold-page` バナーから除去
- 法令・試験データ内の「100人以上」（労働者数）は統計値なのでそのまま

### タスク11: 仕事依頼の動線強化
`feat: enhance consulting inquiry flow for safety and automation` (62aaa0f)
- `/contact` に「受託可能業務」セクション（コンサル / 業務自動化 / システム構築 / 教育）
- 相談カテゴリラジオ: 安全管理 / 業務自動化 / システム構築 / 教育 / デモ / その他
- Footer に「業務のご相談」CTA を常設（全ページ下部）

### タスク12: クママップ格下げ
`refactor: demote bear-map to secondary navigation` (59bde74)
- サイドバーから削除
- ページ/ルート自体は残し、sitemap 経由では検索可能

### タスク13: MHLW 全データ検索の主役化
`feat: promote MHLW full search (504,415 records) to primary accident tab` (36efd9e)
- 事故DBページのデフォルトタブを `mhlw-search`（全件検索）に
- タブ名に件数を明示（504,415件 / 4,043件 / 268件）
- Blob 経由の検索APIは既存のまま（route.ts は既に存在）

### タスク14: 数字統一
`fix: unify statistics across pages` (077a76b)
- /about STATS を MHLW 集計値に揃える
  - 事故DB 504,415件 / 死亡災害 4,043件 / 法令条文 1,127条文 / 化学物質 1,389物質
- /accidents と /ky の関連カード説明文も同じ数字に

## 技術ノート

### ビルド環境
本ワークツリーは OneDrive 配下にあり、npm install でバイナリファイルが欠落することがある
（例: `@vercel/og/Geist-Regular.ttf`, `resvg.wasm`）。Vercel 上では通常通りビルドできる。
本セッションでは `node node_modules/typescript/bin/tsc --noEmit` で型チェックを行い、
Vercel CI を信頼して push した。

### 次セッションでの確認事項
- 本番デプロイ後、各ページで目視確認
  - /ky: 保存クラッシュが再現しないこと、署名キャンバスが開いていること
  - /chemical-ra: 濃度入力 → 判定ボタンが動作すること
  - /laws: AI要約が mock 未登録 revisionId でも生成されること
  - /law-search: 太字などが Markdown として描画されること
  - /accidents: デフォルトが全件検索タブ、一覧タブは 268件の収録事例
- GEMINI_API_KEY / BLOB_READ_WRITE_TOKEN の Vercel 側設定状況
