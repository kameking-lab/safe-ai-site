# 建設計算 量産部隊プロンプト集（Sonnet 5用）

建設計算コーナー（`/construction-calc`）の計算機を、共通スキーマ準拠で **1部隊=3〜5機**
ずつ量産するための投入用プロンプト集。第2波（計算書PDF基盤・AI解説窓の常設・難物3機）
で基盤が固まったため、残りの計算機は本プロンプト群で Sonnet 部隊に量産させる。

- 正本の設計: `docs/construction-calc-design-2026-07-12.md`
- 競合・スコアカード: `docs/construction-calc-competitive-2026-07-12.md`
- 量産キュー（優先度つき）: `BACKLOG-construction-calc.md`
- 共通スキーマ: `web/src/lib/construction-calc/schema.ts`（`ConstructionCalculator`）
- レジストリ: `web/src/lib/construction-calc/registry.ts`
- 整合性ゲート: `web/src/lib/construction-calc/registry.test.ts`

## 基盤が自動で付与するもの（部隊は作らない）

第2波で以下が全計算機共通の基盤として実装済み。**部隊は registry に計算機を1本
定義するだけ**で、これらが自動で付く。手作りは禁止。

1. **提出用計算書PDF**（`web/src/components/construction-calc/calc-report-sheet.tsx`）
   — 表題・作成日時・入力条件・計算式と代入過程・判定・根拠/出典・注意・免責・
   作成者/確認者欄・サイト名URL を registry 定義から自動生成。`CalculatorPanel` の
   「計算書を出力（PDF/印刷）」ボタンで A4 出力。
2. **AI解説窓の常設**（`CalculatorPanel` の「この結果をAIがやさしく解説」）
   — 既存 Gemini 経路（`GEMINI_API_KEY`）を再利用。解説のみ・再計算しない。新規 env 禁止。
3. **AI入口ワンボックス**（`calc-ai-onebox.tsx` ＋ `POST /api/construction-calc`）
   — 自由記述→計算機と入力値の特定。keywords が充実していれば自動で到達する。
4. 根拠・注意・免責のサーバーレンダリング、URLクエリ初期値、features カタログ収載枠。

## 部隊は何をやるか（1機の完了条件）

`BACKLOG-construction-calc.md` の「量産の型」に従う。各機について:

1. `web/src/lib/construction-calc/calculators/<slug>.ts` に `ConstructionCalculator` を宣言的に定義
   - `fields`（number は単位・min・max・step・defaultValue、select は options・defaultValue）
   - `basis`（条文名＋説明＋e-Gov URL。法令ナビ収載条文のみ `lawNaviPath`）
   - `cautions`・`examples`（≥1）・`keywords`（≥3・現場ことば含む）
   - `compute`（**決定論・純関数**。AI は一切呼ばない）
2. `<slug>.test.ts`：**期待値は出典から独立に手計算**した数値固定 ＋ 境界値 ＋ 入力正規化
   ＋ **外部突合**（公表計算例・早見表・公式の worked example と一致）
3. `registry.ts` へ import 追加（ハブ・[slug]ページ・AI入口・計算書PDF・sitemap は自動追従）
4. `web/src/data/features-catalog.ts` の `construction-calc` カテゴリへ収載
   ＋ スクショSVG 2枚（`web/public/screenshots/<slug>-{desktop,mobile}.svg`。
   既存 `earth-pressure-shoring-*.svg` 等をテンプレに色とタイトルだけ変える）
5. `registry.test.ts` の整合性ゲート全緑（`lawNaviPath` を足す場合は突合表に追加）

## 絶対原則（違反したら差し戻し）

- **計算は AI 禁止**。`compute` は決定論の純関数。境界値・外部突合テストで数値を固定する。
- **出典未確認の数値を載せない**。係数・限度値は必ず一次資料（条文・告示・公表指針）で
  確認し、`basis` に出典と版を明記する。確認できない係数は **入力値**にする
  （＝現場が証明書・製品資料の値を入れる方式。難物3機の anchor-pullout が見本）。
- **安全側に丸める**。境界は条文の「以上/以下/未満/超」に厳密に従う。
- **強警告条件**を必ず持つ（作業主任者選任・別途照査が要る範囲・範囲外の明示）。
- 根拠は law-navi / e-Gov / 基準名へリンク（幽霊リンク禁止＝生成集合に在るものだけ）。

## ゲート（CI緑→自己 squash マージ 承認済み）

各PRは以下を満たせば **CI 緑を確認のうえ自己 squash マージしてよい**（本プロンプト群に
焼き込み済みの承認）:

- `cd web && npx tsc --noEmit` 0 error
- `cd web && npm run lint` errors 0（既存の無関係 warning は可）
- `cd web && npm run test`（vitest）全 pass — 特に新機の境界値・外部突合・`registry.test.ts`
- `cd web && npm run build` 成功
- モバイル 390px でレイアウト崩れなし（スクショ確認）

マージ後は本番 curl で計算書PDF出力・AI窓・外部突合値を実測（`docs/construction-calc-design`
の実測手順）。

## 部隊割

| 部隊 | ファイル | 収載機（3〜5機） |
|---|---|---|
| 1 | `calc-squad-1.md` | 玉掛用具の安全率系（チェーン・繊維スリング・シャックル・つり上げ装置定格） |
| 2 | `calc-squad-2.md` | 足場・防護・昇降設備（足場荷重集計・防護棚（朝顔）・吊り足場・移動はしご/脚立・作業床/開口部） |
| 3 | `calc-squad-3.md` | 水・コンクリート・土（水圧（静水圧・揚圧）・型枠側圧・生コン数量・鉄筋質量・土止め支保工部材） |
| 4 | `calc-squad-4.md` | 換算・補助・電気/構造（勾配割換算・吊り角度逆算・電圧降下・梁たわみ・安全ネット） |

各部隊内は上から優先度順。1部隊=複数PR（1機=1PR推奨）。

## 「要Opus」として残した機（部隊へ回さない）

数式・係数の出典が現時点で一次資料まで確定できず、Sonnet 量産で「出典未確認の数値」を
生む危険があるもの。`REQUIRES-OPUS.md` に理由つきで列挙。無理に部隊へ入れない。
