# SEO/インフラ班 cycle-log（並列ループ）

## Cycle (2026-06-14 JST) 決裁A SNSリンクプレビュー復活
- robots.ts: `facebookexternalhit` を学習クローラ遮断リスト `AI_TRAINING_CRAWLERS` から、
  新設の専用許可リスト `SOCIAL_LINK_PREVIEW_BOTS`（`allow:/` ＋ 共通非公開パス `COMMON_DISALLOW` のみ除外）へ移動。
  これで FB/Messenger/Instagram にURLを貼った時の OGP リンクカード（og:image/og:title）が復活する。
- 学習用クローラ（GPTBot/ClaudeBot/FacebookBot/Bytespider/CCBot 等）の全面遮断は維持。
  ユーザー操作起点の OGP 取得 `facebookexternalhit` と、広告/インデックス用の `FacebookBot` を別UAとして明確化。
- 完了条件の og:image/og:title フォールバックは layout.tsx で `/api/og`（openGraph.images・twitter.images）が
  サイト全体テンプレートとして既に敷設済みであることを確認。本タスクでは robots 側のみ変更。
- 回帰テスト `src/app/robots.test.ts` を新設（5 it）。facebookexternalhit=Allow / 学習クローラ=Disallow:/ を固定。
- ゲート: `tsc --noEmit`=0 / `lint` errors=0（warning のみ既存） / `vitest run`（robots+sitemap）=17 pass / `build`=成功。
- BACKLOG-seo.md: C-3-3(#513)・C-3-4(#516) はマージ済のため [x] 完了へ移動。決裁A も [x] 完了。
- PR: seo/robots-fb-link-preview。横断検索 C-2(a)(c) は別PR#518（マージ待ち）。
