# 建設計算コーナー 設計記録 — 2026-07-12

競合分析（`docs/construction-calc-competitive-2026-07-12.md`）を踏まえた初弾実装の設計判断。
量産キュー: `BACKLOG-construction-calc.md`

## 1. 絶対原則（このサイトの信頼構造と整合）

**計算はAIにやらせない。** 計算は決定論的な計算式エンジン（根拠基準を実装した検証済みコード・
単体テストで数値固定）が実行する。AIの役割は2つだけ:

- **入口**: 自由記述 → 計算機の特定＋入力値の抽出。抽出値は必ずスキーマ検証
  （`validateExtraction`）し、範囲外・選択肢外・欠落は採用せず**質問として返す**（勝手に埋めない）
- **出口**: 決定論エンジンの計算結果（サーバー側で再計算）の平易な解説。プロンプトで
  「新しい数値を計算・追加しない」を強制し、免責を必ず付記

全計算機に根拠（条文・告示・JIS）を明記し、結果直下に共通免責
（概算であり実施工には有資格者の検討が必要）を常設表示する。

## 2. ファイル構成

```
web/src/lib/construction-calc/
├── schema.ts                    # 共通スキーマ（宣言的計算機定義・正規化・免責文）
├── registry.ts                  # 計算機一覧（1計算機=1ファイルをここへ登録）
├── ai-router.ts                 # AI入口の決定論部分（キーワードルーティング・抽出値検証）
├── registry.test.ts             # 整合性ゲート（量産時に自動で効く品質保証）
└── calculators/
    ├── sling-wire-load.ts       # 玉掛けワイヤ（クレーン則213条）＋ .test.ts
    ├── scaffold-tankan-check.ts # 単管足場（安衛則570/571条）＋ .test.ts
    └── excavation-slope.ts      # 掘削勾配（安衛則356/357条）＋ .test.ts

web/src/app/(main)/construction-calc/
├── page.tsx                     # ハブ（AIワンボックス＋計算機カード＋信頼性説明）
└── [slug]/page.tsx              # 1計算機1画面（SSG・dynamicParams=false）

web/src/app/api/construction-calc/route.ts  # POST=AI入口 / GET=AI出口（CDNキャッシュINDUSTRY）
web/src/components/construction-calc/
├── calculator-panel.tsx         # 入力→デカ数字結論→計算過程→根拠→注意（柱0文法）
└── calc-ai-onebox.tsx           # 自由記述ワンボックス（化学一窓と同思想）
```

## 3. 共通スキーマ（量産の型）

`ConstructionCalculator` = slug / title / summary / **fields**（select|number・単位・範囲・既定値・help）/
**basis**（条文ラベル＋説明＋lawNaviPath＋egovUrl）/ **cautions** / **examples** / **keywords** /
**compute**（正規化済み値 → CalcOutcome）。

`CalcOutcome` = tone（safety-tone）/ headline（体言止め）/ value+unit（デカ数字）/ summary /
items（明細行・行ごとのtone可）/ **steps（計算過程: 式と代入値）** / warnings（ケース固有の注意）。

設計判断:

- **compute は pure TS**。クライアント（即時計算）・サーバー（AI出口の再計算）・vitest で同一コードを共用
- **normalizeValues** が唯一の入力ゲート: フォーム・URLクエリ・AI抽出のどこから来ても
  範囲外→既定値＋エラー表示。compute は正規化済み値しか受けない
- **lawNaviPath は静的文字列**＋registry.test.ts で `findEntryByShort` と突合（幽霊リンク0を機械保証。
  クライアントバンドルに法令コーパスを载せないための分離）
- e-Gov リンクは基条アンカー `#Mp-At_N` 形式（egov-fallback / permalink.ts と同方針）

## 4. UI（柱0文法の適用）

- 1計算機1画面。入力（プルダウン＋数値セル・44px・入力例ワンタップ）→
  **結論カード**（role=status・safety-tone・text-5xl のデカ数字＋体言止めラベル・1画面1メッセージ）→
  明細（左帯トーン）→ AI解説ボタン → 計算過程（CollapsibleDetail）→ 根拠 → 注意・免責
- 送信ボタンなし（入力と同時に useMemo で再計算）
- ページはSSG（generateStaticParams・dynamicParams=false）。AI入口からの初期値は
  URLクエリ → useSearchParams（Suspense境界内）で反映＝静的配信を維持
- モバイル390px: 1カラム・text-5xl結論・タップ44px以上

## 5. AI入口/出口（既存Gemini経路の再利用・新規envなし = Path A）

- `POST /api/construction-calc` = 入口。`calculatorManifest()`（スキーマから自動生成）を
  プロンプトに埋め、Gemini（gemini-2.5-flash・responseMimeType=application/json）に
  slug＋values を返させる → `validateExtraction` で検証。キー未設定・失敗・サーキット開放時は
  `routeByKeywords`（決定論）へフォールバック（計算機の特定のみ・値は抽出しない）
- `GET /api/construction-calc?slug=&<fieldId>=...` = 出口。**サーバー側で compute() を再実行**し
  （クライアントの計算結果は信用しない）、その数値だけを材料に解説を生成。
  同一入力→同一出力なので `cdnCacheHeaders("INDUSTRY")`（4h）でCDNキャッシュ。
  フォールバックは決定論テンプレ（headline/steps/warnings の整形）
- サーキットブレーカは既存 "gemini" を共有（law-summary 等と同一の障害ドメイン）

## 6. テスト戦略

- 計算機ごと: 数値固定テスト（講習テキスト・条文値から独立に手計算した期待値）＋境界値
  （安全係数ちょうど6・高さ2m/5m・上限勾配ちょうど・積載400kgちょうど・31m超）＋入力正規化
- registry.test.ts = 量産ゲート: slug一意・根拠必須・既定値/使用例で compute 完走・
  lawNaviPath 実在突合・AIルーティングの自然文到達・AI抽出値の検証動作
- sitemap は registry から自動列挙（計算機追加に自動追従）。sitemap.test.ts の
  逆カバレッジガードが未収載を検出することを実測済み

## 7. 見送り・申し送り

- ワイヤ種別は 6×24 A種（裸）のみ収録（G種めっき等の追加は量産キューCC-13。
  出典未確認の数値を載せない方針）
- 型枠支保工・壁つなぎ風荷重・クレーン揚重計画は量産キューへ（competitive §2 の空白地帯順）
- 計算書PDF出力（元請提出様式）は競合ゼロの差別化候補として量産キューCC-19
- features カテゴリページのスクショはプレースホルダSVG（実スクショ差し替えは
  既存の capture 運用に従う）
