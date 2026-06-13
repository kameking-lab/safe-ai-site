# 技能講習DBの捏造2件是正 ＋ 熱中症通達の現行化（2026-06-13 柱1是正）

担当: Opus 4.8 自走ループ（再開最優先2）
ブランチ: `fix/skill-training-fabrication-heat-notice`

## 前任の判断 → 発見 → 是正

本番公開中（教育資格DB・チャットボットRAG・Eラーニング教育ページ）の法令誤情報3点を、
一次資料で確認のうえ是正した。

### (1) 「特定粉じん作業主任者技能講習」(st-dust-chief) = 実在しない資格の捏造

- **前任データ**: `skill-training.ts` に `st-dust-chief`「特定粉じん作業主任者技能講習」を
  certType=skill_training で収録。relatedLaw=「安衛法第14条・粉じん障害防止規則」。
- **発見**: 粉じん（特定粉じん作業）には **作業主任者制度が存在しない**（安衛令第6条の
  作業主任者選任すべき作業に該当しない）。したがって作業主任者の技能講習も存在しない。
  就業時の資格要件は **特別教育のみ**（粉じん則第22条・安衛則第36条第29号）。
- **一次資料**: 安衛令第6条（作業主任者）／粉じん障害防止規則第22条（特別の教育）／
  千葉産業保健総合支援センターQ&A・粉じん作業者Wikipedia 等で「作業主任者選任義務なし・
  特別教育のみ」を確認。
- **是正**: `st-dust-chief` を削除。正本は SPECIAL_EDUCATION の `se-36-29-dust`
  （特定粉じん作業の特別教育）で既存。`work-certification-mapper.ts` の `tag-dust` の
  certIds から `st-dust-chief` を除去（`se-36-29-dust` のみ参照）。

### (2) 「高圧室内作業主任者技能講習」(st-highpressure-chief) = 技能講習⇄免許の取り違え

- **前任データ**: `skill-training.ts` に `st-highpressure-chief`「高圧室内作業主任者技能講習」を
  certType=skill_training で収録。notes 自身が「高圧室内作業主任者免許（国家試験）と区別。
  技能講習修了では主任者職務は担えない場合あり」と矛盾を自認。relatedLaw に「高圧則第11条」。
- **発見**: 高圧室内作業主任者は **免許**（高圧室内作業主任者免許）であり技能講習ではない。
  安衛令第6条第1号の高圧室内作業について、**高気圧作業安全衛生規則第10条**により
  事業者は **作業室ごとに** 高圧室内作業主任者免許を受けた者から選任する。
  （旧データの選任根拠「高圧則第11条」も誤り＝正しくは第10条）
- **一次資料**: 高気圧作業安全衛生規則第10条全文（労働新聞社・Lawzilla・mhlw t_doc で確認）／
  公益財団法人 安全衛生技術試験協会（免許試験の実施団体）。
- **是正**: `st-highpressure-chief`（技能講習）を削除し、LICENSES に
  `lic-koatsu-shitsunai-chief`「高圧室内作業主任者免許」(certType=license) を新設。
  relatedLaw=「安衛法第14条・安衛令第6条第1号・高気圧作業安全衛生規則第10条」。
  特別教育 `se-36-24-2-koshitsunai`（高圧室内作業に係る業務）を relatedCertIds に維持。

### (3) 熱中症通達コーパスが廃止済み通達を現行として記述

- **前任データ**: `corpus-gaps-fill.ts` の熱中症通達エントリが
  「職場における熱中症予防対策の徹底について（基発0420第3号等）」を現行として記述。
- **発見**: 令和3年4月20日 基発0420第3号は、**令和8年3月18日 基発0318第1号**
  「職場における熱中症予防対策のためのガイドライン」により **廃止** された。
- **一次資料**: 安全衛生情報センター（jaish.gr.jp）の通達一覧に
  「令和3.4.20 基発0420第3号 … （令和8.3.18 基発0318第1号により廃止）」と明記。
- **是正**:
  - `corpus-gaps-fill.ts` の趣旨エントリを基発0318第1号（旧基発0420第3号を廃止）へ現行化し、
    令和7年6月1日施行の安衛則改正（第612条の2＝熱中症の発見・報告体制と重篤化防止の義務化）
    との関係も明記。keywords に「基発0318第1号」「熱中症ガイドライン」「612条の2」を追加。
  - Eラーニング熱中症教育ページ（`education/roudoueisei/necchu/page.tsx`・description/本文/
    法的根拠）と `education/EducationContent.tsx` の basis を基発0318第1号へ現行化。
  - `law-metadata.ts` の熱中症通達メタは前任ループで既に latestRevision に
    「基発0318第1号により旧要綱廃止」を反映済み（追認・変更不要）。
  - `mhlw-notices.ts`・`notices-and-precedents.ts` の基発0420第3号は **歴史的通達の記録**
    （実在した通達のアーカイブ）であり誤りではないため変更しない。faq の 基発0420第2号 は
    **騒音**ガイドライン（別通達・現行）であり対象外。

## 回帰テスト（再汚染防止）

- `src/data/education-rules/skill-training.test.ts`（新設・8テスト）:
  SKILL_TRAINING/LICENSES の certType 一括ピン／捏造2ID（st-dust-chief・
  st-highpressure-chief）の不在／粉じんに作業主任者技能講習が無いこと／高圧室内作業主任者が
  免許としてのみ存在し relatedLaw が高気圧則第10条を含むこと／tag-dust の参照／
  全タグ・全 relatedCertIds の参照整合。
- `src/data/laws/heat-notice-currency.test.ts`（新設・3テスト）:
  熱中症通達コーパスの趣旨エントリが基発0318第1号を提示し「廃止」関係を明記していること。

## ゲート

- `npx tsc --noEmit` = エラー0
- `npm run lint` = errors 0（warningは既存のみ）
- `npx vitest run` = 190ファイル 1588テスト全pass（+11テスト）
- `npm run build` = 成功

## 残課題（別タスク）

- BACKLOG 柱1「教育資格DB残り3ファイル全件監査」(licenses.ts/job-chief.ts/skill-training.ts
  残りエントリの時間数・実在性のe-Gov全件突合) は本PRの対象外。確認済みの捏造2件のみ是正。
  number振替（relatedLaw の安衛令6条 各号番号）は今回の2件以外は未検証＝個別タスクで要監査。
