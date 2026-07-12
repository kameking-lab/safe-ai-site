# 現場ことば版・執筆プロンプト集（Sonnet 5用）

労働安全衛生法体系の全条文を「現場の人でも理解できる、わかりやすく端的な言い換え版」
（現場ことば版）にするための、**1法令=1タスク**の投入用プロンプト集。

- `squad-1〜5.md` … **部隊用の投入プロンプト（完成品）**。待機中のSonnet 5セッション
  にそのまま貼ると、担当法令を優先順に1法令ずつ完走する。
- `_template.md` … 法令別雛形（プレースホルダ入り）
- `<法令ファイル名>.md` … 雛形に法令情報を差し込んだ**法令別の完成品**（squadプロンプト
  から参照される詳細手順。1法令だけ単発で投げるときはこちらを貼る）。
- 進捗の正本: `docs/plain-language-coverage.md`（`cd web && npm run plain:status` で再生成）
- ローカル並列レーン運用: `BACKLOG-plain-1〜5.md` ＋ `loop-prompt-plain-1〜5.txt`
  （loop-config.json の plain レーン。部隊番号と1:1）

## 部隊割（オーナー指定・2026-07-11）

- 部隊1 = 労働安全衛生法＋労働安全衛生法施行令（squad-1.md）
- 部隊2 = 労働安全衛生規則・全編（squad-2.md）
- 部隊3 = 有機則＋鉛則＋四アルキル鉛則＋特化則（squad-3.md）
- 部隊4 = 粉じん則＋じん肺則＋電離則＋石綿則（squad-4.md）
- 部隊5 = クレーン則＋ゴンドラ則＋ボイラー則＋事務所則＋機械等検定規則（squad-5.md）
- 酸欠則 = 完成済み見本（web/src/data/plain/sankketsu-kisoku.ts）
- 未割当（後続）: じん肺法・作業環境測定法・高圧則（法令別プロンプトは作成済み:
  jinpai-ho.md / sagyokankyo-sokuteiho.md / koa-atsu-sagyo-anzen-eisei-kisoku.md）

## 安衛則 原文(fulltext)量産の部隊割（2026-07-13〜・シャード並列）

安衛則（347M50002000032）の全文ギャップ約1,000条を、curated 抄録ではなく**原文＝
全文スナップショット（laws-fulltext）を照合先に**量産する。plain は 1 法令=1 ファイルだと
複数 Sonnet 部隊が同一ファイルを書いて衝突するため、**編/章単位のシャードファイル群**
（`web/src/data/plain/anei-kisoku/hen*.ts`。束ねは同 `index.ts`）へ分割済み。各部隊は
重複なく編/章範囲を担当し、**1 シャード=1 PR** で埋める。原文本文と sourceTextHash は
`node web/scripts/plain-fulltext-digest.mjs 347M50002000032 --from N --to M --live-only` で取得。
fidelity v2 の fulltext アンカー（`plain-fulltext-anchor.test.ts` が全域照合。gap 条も含む）と
端的さラチェットが CI で全緑を強制する。

- 部隊1 = 第1編 通則＋第2編第1章 機械（第1条〜第151条・約275条・anei-fulltext-squad-1.md）
  シャード: hen1-tsusoku.ts / hen2-01-kikai.ts
- 部隊2 = 第2編 荷役運搬機械・建設機械等（第151条の2〜第236条・約273条・anei-fulltext-squad-2.md）
  シャード: hen2-02-nieki-unpan.ts / hen2-03-kensetsu-kikai.ts
- 部隊3 = 第2編 型枠・爆発火災・電気・掘削・荷役（第237条〜第476条・約241条・anei-fulltext-squad-3.md）
  シャード: hen2-04-katawaku-bakuhatsu-denki.ts / hen2-05-kussaku-nieki-sagyo.ts
- 部隊4 = 第2編後半＋第3編 衛生基準＋第4編 特別規制（第477条〜第682条・約214条・anei-fulltext-squad-4.md）
  シャード: hen2-06-batsuboku-tsuiraku-tsuuro.ts / hen3-eisei.ts / hen4-tokubetsu.ts（空・要新規）
- v2 リライト = fidelity v2 強制で違反した既存 84 条の是正キュー（全法令横断・v2-rewrite-squad.md）
  正本: BACKLOG-plain-v2-rewrite.md ／ 逐条詳細: docs/plain-v2-audit-2026-07-13/violations.json

見本（原文=fulltext アンカーで v2 全緑の実例）: anei-kisoku/hen2-01-kikai.ts の第117条。

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
  端的さの機械上限あり: **1文120字以内・全体400字以内**（括弧書き＝条参照・注記は
  読み飛ばせるため除いて測る。2026-07-12以降に生成するエントリに強制され、超えると
  CIが落ちる。長くなる条は文を分割し、省く部分は omissions で宣言する）。
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
