# 01 現状機能の網羅的把握（軸1）

調査日 2026-05-26 / main HEAD 90cc018b

## ページ
- `/chemical-ra`（117行）— RA入力パネル入口。CREATE-SIMPLE準拠を標榜（安衛法57条の3）。
- `/chemical-ra/product-search`（68行）— 製品名から物質を探す。
- `/chemical-database`（一覧/検索）— 物質検索。CAS/物質名/別名/用途キーワードで検索（placeholder「例: ベンゼン / 71-43-2 / 金属脱脂」）。
- `/chemical-database/[cas]`（273行）— 物質詳細。濃度基準・GHS区分・特別則・**全法律横断の規制タグ**・RA誘導を集約表示。

## コンポーネント
- `chemical-ra-panel.tsx`（915行）— RA本体。物質名/CAS/別名入力、取扱量・換気等→ばく露区分I〜IV。
- `chemical-ra-extras.tsx`（175行）
- `chemical-database-client.tsx`（583行）— 検索クライアント（name/cas/synonym/aliases対応）。
- `mhlw-chemical-info-card.tsx`（402行）— 物質カード（安衛法/化管法/PRTR/化審法/毒劇法/有機則/特化則/GHS表示）。
- `mhlw-chemical-selector.tsx`（139行）
- `chemical/osha-regulations-section.tsx`（81行）— **命名が誤解を招く（"osha"=米国OSHA連想だが実体は日本の特別則: 特化則/有機則/酸欠/粉じん/石綿）**。リネーム候補。
- `regulation-tags-section.tsx` / `regulation-tag-badge.tsx` — 横断規制タグUI（中核）。

## ライブラリ
- `lib/mhlw-chemicals.ts`（669行）— 物質データ統合ローダ（CONCENTRATION_LIMITS / findByCas / normalizeCas）。
- `lib/regulation-tag-labels.ts`（19.5KB）— **全法律横断タグの定義＋解説（中核資産）**。安衛法(製造許可/特化則第2号/第3号)・化管法(1種/2種)・毒劇法・化審法(1種/2種/監視/優先)・化学兵器禁止法・廃掃法・GHS・有機則・特化則・石綿則・粉じん則を法令条文付きで定義。
- `lib/chemical-equipment-mapping.ts`（220行）— 物質→推奨防護具マッピング（軸8）。

## データ（CASキー、ビルド時統合）
- `chemicals-mhlw/compact.json` — **3,954件**（安衛法カテゴリ: 皮膚 skin / ラベルSDS label_sds / 発がん carcinogenic / 濃度基準 concentration）。
- `chemicals-prtr/regulatory.jsonl` — 398件（化管法 第一種339・第二種69）。
- `chemicals-chashin/regulatory.jsonl` — 255件（毒劇法230・化審法特定34・化学兵器禁止法30・廃掃法12）。
- `chemicals-nite/classifications.jsonl` — 3,388件（NITE政府版GHS分類、chripUrl/modelSdsUrl付き）。

## API
- `app/api/chemical-ra/route.ts`（464行）— Gemini による RA 支援（ばく露区分・対策提案）。

## クラウド/保存
- 化学物質RA結果の**Supabaseクラウド保管なし**（KY/打合せ書と異なり chemical_ra_records テーブル不在）。`usage-tracker.ts` に利用カウント(chemical_ra ×5)のみ。
- localStorage 保存の有無は要精査（panelの保存実装）。

## 多言語
- `contexts/language-context` + `useLanguage` + `TranslatedPageHeader` の i18n 基盤あり（ページ見出し等）。化学物質本文・規制解説の多言語化は未対応。

## デッドコード/整理候補
- `osha-regulations-section.tsx` のファイル名/識別子が実体（日本の特別則）と乖離 → リネーム候補（破壊リスク低）。
- mhlw `chemicals.jsonl`（3,984行）の一部レコードが**文字化け（エンコード破損）**。compact.json 生成時に kept 3,954 / dropped 29 で大半は救済済みだが、元jsonlの品質は要確認（軸データ品質）。

## 結論
「物質名→全法律横断一覧」の中核（regulation-tag-labels + 詳細ページ集約）は**既に実装済みで本番動作**（後述 12 参照）。伸びしろは「未カバー法律の追加」「SDS取込み」「KY/打合せ書との統合動線」「クラウド保管」。
