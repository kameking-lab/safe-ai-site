# AI実務研修 Production Result

- 判定基準日: 2026-08-27 JST
- 本番反映時刻: 2026-08-27 22:13 JST
- 判定: GO（open P0 0件 / P1 0件 / 教材事実の未解決P2 0件、rollback不要）
- 直前Production deployment: `dpl_EintUWC6vRx5FSr2Fo7vEvjxeSvw`
- 新Production deployment: `dpl_9FjmKJczmp6m61kMSPyLfQpbM6o6`
- Production URL: `https://www.anzen-ai-portal.jp/`
- 採用Preview: `dpl_BbDA82yQxfVU3s1w6RNgW22AZ6Xu`
- Preview URL: `https://safe-ai-site-45xkqhxq0-kameking-labs-projects.vercel.app`
- Release tag: `production-ai-training-construction-tools-20260827`

## 公開範囲

- 一覧: `https://www.anzen-ai-portal.jp/training/ai-seminars`
- 公開教材: `https://www.anzen-ai-portal.jp/training/ai-seminars/ai-chat-work`
- 「AIチャット仕事術」1件を公開し、Coming Soon 24件は折りたたみ一覧だけとした。個別URL・空ページ・CTA・sitemap URLは作成していない。
- 教材は20枚、音声20本・2,138.568秒（35分38.568秒）、3演習、5問クイズ。特定製品の宣伝、正答保証、生産性向上率、資格・認定表現は含めていない。
- PPTX、研修PDF、講師用台本、参加者用1枚資料、AI依頼テンプレート、クイズ・解答解説、出典一覧の7成果物を公開した。
- 既存の安全研修一覧・「墜落・転落防止とフルハーネスの実務」は維持し、カテゴリー切替導線だけを追加した。

## 根拠・成果物検査

- source registry 13件、claim registry 17件。OpenAI・Anthropic・Google公式、個人情報保護委員会、経済産業省、文化庁および査読研究を正本とし、unsupported claim 0件。
- PPTX: 20 slides / notes 20 / `[Sources]` 20 / empty 0 / 全20枚render目視PASS。SHA-256 `d27dae5f43d5685c595de15f2801b8f5ecbf66f52151af987cfa86c0f327869d`。
- 研修PDF: 20ページ、Web・PPTXとスライド番号・本文・出典一致。SHA-256 `f7d8d6304e9982ec072a15199826643575983dde1851ef7970bd47b2f998557e`。
- 音声: MP3 20/20、24 kHz mono 48 kbps、decode error 0、無音ファイル0、各90.588〜127.378秒。字幕・全文原稿は同じスライド正本を使用した。

## 最終ゲート / Preview / Production

- TypeScript PASS。ESLint error 0（既存warning 29）。全Vitest 7,571 PASS / 2 skip。全Playwright 281 PASS / 1 intended skip。Production build 3,443ページPASS。npm audit 0。
- Lighthouse 24/24 run PASS。最低Performance 92、Accessibility / Best Practices / SEOは全対象100、desktop Performanceは全対象100。
- 独立レビュー: 初心者理解、製品中立性、個人情報・著作権、人間の確認、スライド・音声一致を確認し、P0 0 / P1 0 / 教材事実P2 0 / GO。
- Preview: SSO、`noindex,nofollow,noarchive`、robots `Disallow: /`、Analytics・RUM・Service Worker停止、相談dry-run、20音声・7成果物・Coming Soon 404を確認してPASS。
- Production: 専用E2E 7/7、全音声20/20、成果物7/7、手動再生・停止・字幕・原稿・keyboard・JavaScript無効fallback、canonical・query noindex・sitemap・404を確認してPASS。
- 既存回帰production smoke 258/258 PASS。console error 0、同一origin asset failure 0。rollback先は直前deploymentとし、発動条件なし。
