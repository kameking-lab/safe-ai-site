# 安全研修ライブラリ Production Result

- 判定基準日: 2026-08-27 JST
- 本番反映時刻: 2026-08-27 16:41 JST
- 判定: GO（高確信度 P0 0件 / P1 0件、rollback 不要）
- Production deployment: `dpl_EintUWC6vRx5FSr2Fo7vEvjxeSvw`
- Production URL: `https://www.anzen-ai-portal.jp/`
- 採用 Preview: `dpl_2QmBGijY3vDWdQFJrKqdwWbKz8Tf`
- Preview URL: `https://safe-ai-site-ksxqpwc5c-kameking-labs-projects.vercel.app`
- Release tag: `production-training-library-20260827`

## 公開範囲

- 一覧: `https://www.anzen-ai-portal.jp/training/safety-seminars`
- 公開教材: `https://www.anzen-ai-portal.jp/training/safety-seminars/fall-prevention`
- 公開教材 1件、Coming Soon 27件。Coming Soon の個別ページ・CTA・sitemap URLは作成していない。
- 教材は「墜落・転落防止とフルハーネスの実務」20枚、音声20本・2,253.6秒（37.6分）。
- 共通正本はスライドJSON、46 claims、23 sources。2025年全国確定統計（新型コロナ除外）を使用。
- 編集可能PPTX 1件、PDF 6件、参加者資料、現場チェックリスト、5問クイズ・解答解説、出典一覧を公開。

## 最終ゲート

- TypeScript: PASS
- ESLint: PASS（error 0、既存 warning 29）
- 対象 Vitest: 19/19 PASS
- 全 Vitest: 810 files、7,399 PASS、2 skip
- 対象 Playwright: 7/7 PASS（320/390/768/1440px、400%、Axe、reduced motion、JavaScript無効、音声操作）
- Production build: PASS（3,428 static pages、Vercel側の公開資産・storage guardもPASS）
- npm audit: 0 vulnerabilities
- 教材整合性: 20 slides / 46 claims / 23 sources / 出典なし数値0 / 音声20 / missing artifact 0
- PPTX検査: 20 slides / notes 20 / editable charts 3 / overflow 0
- PDF厳格検査: 6/6 PASS、合計55ページ、`/Lang=ja-JP`、タイトル・ページ数・統計脚注一致
- Lighthouse: hub mobile 96・desktop 100、detail mobile 91・desktop 100。A11y / Best Practices / SEO は全対象100。
- 独立レビュー: 法令・統計・科学・編集・UX・アクセシビリティ・配信境界を確認し P0 0 / P1 0 / GO。

## Preview / Production smoke

- Preview: SSR本文、canonical、query noindex、sitemap、PPTX/PDF全7件、音声01/10/20を200・Content-Type・Content-Lengthで確認。
- Production: 公開1 / Coming Soon 27、音声再生・一時停止・移動・字幕・原稿、MP3全20本、成果物全7件、JS無効20枚を確認。
- Production: `/`、`/safety-ai`、`/features`、`/services/automation`、`/heat-illness-prevention` が200。指定4導線から一覧へ1クリック、相談query noindexを確認。
- 最初のPreview候補はfail-closed allowlistが新規バイナリを除外したため不採用。今回の教材フォルダだけを明示許可し、別テーマ・別拡張子をguardで拒否したうえで再Previewした。

## 成果物チェックサム

- PPTX SHA-256: `4b43c95513603ad68908fc188277318666250745026b96033c79ae2327099697`
- 投影・印刷用PDF SHA-256: `31a848588f00061fef695cd263cb35395561de9bb8e53a0ff012532f4184c291`
- その他5 PDFは公開ファイル、strict inspector、public identity guard、Production HEADの三重確認済み。

## 残余リスク

- P2: PDFは日本語言語メタデータを持つが、完全な構造タグ付きPDFではない。HTML版でアクセシブルな同内容を提供する。
- P3: 字幕区間は原稿長からの近似。全文原稿とスライド単位の同期を正本とする。
