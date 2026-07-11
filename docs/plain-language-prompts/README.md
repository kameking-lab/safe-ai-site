# 現場ことば版・執筆プロンプト集（Sonnet 5用）

労働安全衛生法体系の全条文を「現場の人でも理解できる、わかりやすく端的な言い換え版」
（現場ことば版）にするための、**1法令=1タスク**の投入用プロンプト集。

- `_template.md` … 雛形（法令名などのプレースホルダ入り）
- `<法令ファイル名>.md` … 雛形に法令情報を差し込んだ**完成品**。そのまま
  Claude Code（Sonnet 5）のセッションに貼れば1法令が完走する。
- 進捗の正本: `docs/plain-language-coverage.md`（`cd web && npm run plain:status` で再生成）
- ローカル並列レーン運用: `BACKLOG-plain-1〜4.md` ＋ `loop-prompt-plain-1〜4.txt`
  （loop-config.json の plain レーン。起動手順はレーン節を参照）

## 仕組みの全体像（なぜ嘘をつけないか）

1. 言い換えは `web/src/data/plain/<法令>.ts` に条単位で保存
   （条キー = egovLawId＋articleNum。法令別ファイルなので並列執筆でも衝突ゼロ）。
2. **fidelityゲート**（`web/src/lib/plain/fidelity.ts` ＋
   `web/src/data/plain/plain-fidelity.test.ts`）が原文と機械照合する。
   原文の数値・単位・限度方向（以上/以下/未満/超）・義務主体×義務種別
   （義務/禁止/努力義務/配慮義務）・参照条番号・罰則が言い換えに保存されて
   いない、または言い換えが原文に無い数値・義務を主張すると **CIが落ちる**。
   省くものは `omissions` に当該トークンを含めて明示宣言したときだけ通る。
3. 各エントリは `sourceTextHash`（原文スナップショット）を持つ。改正で
   コーパス原文が更新されるとハッシュ不一致＝stale になり、**UIから自動非表示**・
   `BACKLOG-plain-stale.md`（再生成キュー）に載る。
4. 見本（品質基準）は酸欠則: `web/src/data/plain/sankketsu-kisoku.ts`。

## 文体規約（雛形に焼き込み済み・ゲートが機械で強制する部分あり）

- です・ます体。1条あたり目安2〜4文（最大5文）。結論から書く。
- **主語明示**。義務・禁止を書く文には、その同じ文の中に原文どおりの主体語
  （事業者・労働者・請負人…）を入れる。「会社」「作業員」等への言い換え禁止
  （ゲートは原文の主体語で照合する）。
- 義務種別の表現は固定:
  - 義務 → 「〜しなければなりません」「〜する義務があります」
  - 禁止 → 「〜てはいけません」「禁止です」
  - 努力義務 → 「〜よう努めましょう」「努力義務です」（義務に格上げ禁止）
  - 配慮義務 → 「〜よう配慮しなければなりません」
- 数値・単位・期間・限度方向は原文どおり保存。表記ゆれは
  「18パーセント⇔18%」「100万分の10⇔10ppm」「3年間⇔3年」のみ許容。
  **原文に無い数値・義務・条件の追加は禁止**（捏造としてCIが検出）。
- 専門語は用語集（`web/src/data/glossary/`）の見出し語をそのまま使う
  （条ページの用語集連携が自動で効く）。
- 参照条番号（例: 令第21条第9号）は本文に残すか、`omissions` に
  「参照（令第21条第9号）は省略」のようにトークンごと宣言する。
- 免責・「正は原文」表示はUI側が自動で付ける。plainText に書かない。

## メタ項目の書き方

- `sourceTextHash`: `node scripts/plain-source-digest.mjs src/data/laws/<原文>.ts` の出力を転記
- `sourceRevisionId`: `web/src/data/laws/law-metadata.ts` の当該法令 `latestRevision`
- `generatedAt`: 執筆日（yyyy-mm-dd） / `model`: 実行モデル名（例: claude-sonnet-5）
- `checkStatus`: fidelity 全緑を自分で確認してから `"verified"`（それまで `"draft"`）

## 完了条件（1法令）

1. `cd web && npm run plain:test` … fidelity・整合テスト全緑
2. `cd web && npm run plain:status` … 当該法令の行が「済(fresh)=収載条数・未生成0」
3. `npx tsc --noEmit` 0 error / `npm run lint` 0 error / `npm run build` 成功
4. PRに「条数・fidelity照合結果・plain:status の当該行」を貼る → CI緑 → squashマージ

## 注意（他領域を壊さない）

- 触ってよいのは `web/src/data/plain/<担当法令>.ts`（新規）と
  `web/src/data/plain/index.ts` への **import＋1行登録のみ**。
- コーパス原文（`web/src/data/laws/**`）・UI・lib・他法令の plain は変更禁止。
- 20〜30条ごとに commit/push（使用枠切れ・セッション切断対策）。
