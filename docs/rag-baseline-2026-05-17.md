# RAG Baseline Audit — 2026-05-17

## Snapshot

| Set   | N   | Recall@5 | Precision@5 | MRR   | Failures |
|-------|----:|---------:|------------:|------:|---------:|
| main  | 100 | 95.7 %   | 27.8 %      | 0.739 | 5        |
| fresh | 100 | 59.0 %   | 15.0 %      | 0.452 | 41       |

Target: **Recall@5 fresh ≥ 80 %**, **main ≥ 95 %**.

## Failure pattern catalogue

### Pattern A — Law-abbreviation mismatch (fresh: 5 hits)

Gold uses an abbreviation the corpus does not emit verbatim.
Largest single source of fresh failures: **all five `労災法` questions** (Q61–Q65) — corpus emits `労災保険法`.

Fix: map gold↔corpus aliases inside `searchRelevantArticlesWithScore`
(or expand at query level so the abbreviation surfaces both forms).

Known equivalences uncovered by failures:
- `労災法` ↔ `労災保険法` (労働者災害補償保険法)
- `ゴンドラ則` ↔ ゴンドラ安全規則
- `ボイラー則` ↔ ボイラー及び圧力容器安全規則
- `育介法` ↔ 育児・介護休業法
- `労施法` ↔ 労働施策総合推進法 (パワハラ)
- `クレーン則` ↔ クレーン等安全規則
- `労安衛則` ↔ `安衛則` ↔ 労働安全衛生規則

### Pattern B — Synonym gap (fresh: ~15 hits)

Natural-language phrase has no shared token with the gold article's
title / keywords.

Notable misses:
| Q  | Question phrase       | Gold formal term       |
|----|-----------------------|------------------------|
| 1  | 最低基準を定めている     | 目的 (安衛法第1条)        |
| 24 | 月80時間超 / 面接指導    | 安衛法第66条の8           |
| 54 | 主たる用途以外           | 安衛則第164条             |
| 57 | 研削といし               | 安衛則第117条             |
| 58 | アーク溶接機 / 自動電撃防止 | 安衛則第332条          |
| 59 | 漏電遮断装置             | 安衛則第333条             |
| 60 | 電気機械器具 使用前点検    | 安衛則第352条             |
| 73 | じん肺管理4              | じん肺法第23条             |
| 74 | 製造許可（クレーン）      | クレーン則第3条           |
| 75 | 設置届出（クレーン）      | クレーン則第5条           |
| 76 | 定格荷重表示             | クレーン則第70条の2       |
| 77 | ゴンドラ設置届           | ゴンドラ則第10条          |
| 78 | ボイラー設置届           | ボイラー則第10条          |
| 82 | 重大事故報告             | 安衛則第96条              |
| 85 | 等価騒音85dB             | 安衛則第588条             |
| 96 | 店社安全衛生管理者         | 安衛法第15条の3           |

### Pattern C — Topic-keyword hijack (fresh: ~8 hits)

A high-frequency token in the question pulls in a different law /
chapter that swamps the actual answer.

| Q  | Hijacking token | Hijacks return                | True gold        |
|----|-----------------|-------------------------------|------------------|
| 9  | 酸欠            | 酸欠則 (Top 5 dominated)        | 安衛法第14条      |
| 16 | 危険・有害      | 安衛法第25条/26条               | 安衛法第59条      |
| 20 | 特別教育        | 安衛則第36条群                  | ゴンドラ則第12条  |
| 28 | 特化則健診      | 第19条の2/12条/34条             | 特化則第39条・40条 |
| 44 | 局所排気装置    | 第16条の2/28条 (有機則)         | 有機則第5条       |
| 45 | 特化則 第1類    | 第2条                          | 特化則第48条      |
| 70 | 妊産婦          | 安衛令第20条/151条群             | 労基法第66条      |

### Pattern D — Corpus gap (fresh: ~6 hits)

Gold article isn't indexed at all (`(no hits)`) or only indexed under
a different law-short ID we cannot fuzzy-match.

| Q  | Gold                       | Status                    |
|----|----------------------------|---------------------------|
| 64 | 労災法第14条 (休業補償)      | not indexed                |
| 83 | 熱中症通達第1                | indexed but ranked below 5 |
| 84 | 熱中症通達第2                | same                       |
| 86 | 騒音指針第1                  | indexed; lawShort mismatch  |
| 87 | 振動指針第1                  | indexed; lawShort mismatch  |
| 88 | 労施法第30条の2 (パワハラ)    | not indexed (no 労施法 in corpus) |
| 91 | 育介法第5条                  | indexed; competes with 第21条 |
| 93 | 育介法第16条の2 (子の看護休暇) | not indexed                |

### Pattern E — Multi-gold sparse coverage (fresh: ~3 hits)

Gold lists 4–5 acceptable answers; engine only surfaces non-listed
adjacent articles (e.g. Q33 returns 第539条の8 but 第539条の2/3/4/5/7
are missing). Hybrid retrieval (BM25 + dense fusion) should rescue
these clusters.

### Pattern F — Article-number disambiguation (main: 3 hits)

`第〇条` token alone matches multiple laws with the same number.

| Q  | Gold                    | Symptom                          |
|----|-------------------------|----------------------------------|
| 38 | 安衛則第552条/574条       | drops to non-anzen-soku altogether |
| 50 | 有機則第1条 ("第1種…区分") | "第1" token hijacks 第1条          |
| 65 | 電離則第8条               | drowned by 第1条/第9条             |

## Improvement plan

| Phase | Lever                                | Expected lift on fresh |
|-------|--------------------------------------|------------------------|
| B     | Synonym + law-alias dictionary       | +12–15 pp (covers A+B partial) |
| C     | BM25 sparse fusion (α dense + BM25)  | +5–8 pp (covers C/F)    |
| D     | Re-ranker over top-20 with metadata  | +3–5 pp (covers E)      |
| E     | Chunk strategy (currently per-article — likely no change) | 0–2 pp |

Stretch goal: fresh ≥ 82 %, keep main ≥ 95 %.

## Law inventory (snapshot)

42 distinct law / law-short pairs spanning 33 統合法令 + 改正R4/R5 + 通達/指針 + 関連法.
Top by article count: 安衛則 (100) / 安衛則改正R4 (91) / 安衛令関係 (77) / 安衛則改正R5 (70) / 安衛法 (61).
