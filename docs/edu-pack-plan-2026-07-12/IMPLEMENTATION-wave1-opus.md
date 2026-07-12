# 実装第1波（Opus）実装記録 — 法定教育スライドパック

企画 docs/edu-pack-plan-2026-07-12/ の Opus 担当分を本番反映した記録。

## 実装したもの

### EDU-D1 カリキュラム正本レジストリ（02章 層1）
- `web/src/data/education-curriculum/`（types.ts / registry.ts / index.ts / disclaimers.ts / hazard-mapping.ts）
- 初弾5教育（フルハーネス・熱中症・粉じん・低圧電気・酸欠1種/2種）の科目・範囲・時間を告示正本から**正本表記のまま**構造化。
- スナップショットテスト `curriculum-snapshot.test.ts`: 科目名・範囲・時間合計をピン留め。**時間数を1つ改変すると導出合計が宣言合計とずれてCI赤**（企画のEDU-D1完了条件を実証）。

### EDU-D2 網羅ゲート（02章 層3）
- 純関数 `web/src/lib/education-curriculum/coverage.ts` `checkCurriculumCoverage(curriculum, trackId, deck)`。違反種別: `scope-uncovered`／`hours-shortfall`／`jitsugi-notice-missing`／`unknown-ref`／`unknown-track`／`basis-display-missing`。
- 常設テスト `web/src/data/education-curriculum/curriculum-coverage.test.ts`: 宣言デッキ全件で違反0＋**裏切り実証**（実データの covers を1項目外すと `scope-uncovered` が必ず出る／実技宣言を外すと `jitsugi-notice-missing`／時間を減らすと `hours-shortfall` 等、全違反種別を検出）。
- npm スクリプト `curriculum:test`（ゲート常設）／`curriculum:status`（法定対応表 Markdown 生成＝`docs/education-curriculum-coverage.md`・生成物のため gitignore）。
- 網羅（scope-uncovered）の照合対象は**学科科目のみ**（実技はスライドで代替不能なので `jitsugi-notice-missing` で非代替宣言スライドの存在だけを検証）。

### 教材2本（旗艦・end-to-end）
- `web/src/data/education-decks/`（fullharness.ts / necchu.ts）＋描画 `web/src/components/education-pack/edu-slide-deck.tsx`（既存 HazardSlideDeck の view/present/print 3モード機構を可変枚数・covers付きに移植）。
- 公開ページ `/education/pack`（一覧）・`/education/pack/[slug]`（投影/印刷）・`/education/pack/terms`（利用規約）。
- 網羅ゲート緑・投影(16:9)/印刷(A4横)両対応・モバイル390px確認済み・統計は build-summary 追従（dataAsOf 印字）。

### EDU-R1 公開面
- フルハーネス詳細ページの手書き CURRICULUM を**レジストリ参照に置換**（ページ表示・PPTX・ゲートの単一正本化）。
- ダウンロード区画を「サンプル」→「フル教材（無償）」へ改称・利用条件3行＋規約全文リンク。
- 教材利用規約ページ新設（05章の6条骨子・**文言は disclaimers.ts で定数化**しオーナー最終確認後に差し替え可）。
- 線引き固定文言（教材提供≠教育実施・実技対面・記録3年）を全対象ページ・全スライドフッターに。
- features-catalog 収載（slug `edu-pack`）。

### EDU-R2 CV導線
- `InquiryForm` が `course`/`topic` を読んで**business タブ初期選択＋件名プレフィル**（「【教育パック】◯◯ カスタマイズ相談」）。`/api/inquiry` スキーマ不変（subject に載せる＝env追加なし・Path A）。
- 教育詳細ページCTAを `?tab=business&topic=edu-pack&course=<id>` へ統一。DL区画下の非ブロッキング相談カード（全画面モーダルなし）。

## 既存誤記3件の是正（企画01章§2・正本URL）

| # | 箇所 | 是正前 | 是正後 | 正本 |
|---|------|--------|--------|------|
| 1 | フルハーネス page（結論/ヘッダー/関連条文/FAQ）・レジストリ basis | 科目根拠を「厚生労働省告示第11号」 | 科目根拠は**安全衛生特別教育規程第24条**（平30告示249号で追加・平31.2.1適用）。告示第11号は**墜落制止用器具の規格**（器具の構造規格）で科目根拠ではない、と区別 | https://www.mhlw.go.jp/web/t_doc?dataId=74085000&dataType=0 |
| 2 | `data/seminars/necchu.yaml`（legal_basis/cover/footnote/duties intro）・レジストリ basis | 「基発0420第3号 職場における熱中症予防基本対策要綱」 | **基発0318第1号ガイドライン**＋安衛則第612条の2（令和7年6月1日施行）。旧0420第3号は0318第1号で廃止済み | https://www.jaish.gr.jp/anzen/hor/hombun/hor1-67/hor1-67-3-1-0.htm |
| 3 | 教育ハブ PROGRAMS（EducationContent.tsx）研削といし | 「4時間以上」（学科のみの数字） | 「自由研削6h以上（学科4h＋実技2h）／機械研削10h以上（学科7h＋実技3h）」＝規程第1条/第2条の区分を明示 | 安全衛生特別教育規程第1条・第2条 |

※ necchu.pptx（生成物・web/public/seminars）は本波では**未再生成**（YAML源だけ是正）。再生成は ops レーン EDU-O1 の担当（生成物コミット禁止の規律）。

## 正本確認（2026-07-12・全て verbatim）

科目・範囲・時間は e-Gov／MHLW法令等DB／JAISH の一次資料から転記し、レジストリのスナップショットテストでピン留め。フルハーネス（規程第24条）・低圧（第6条）・粉じん（昭54告示68号）・酸欠（昭57告示132号 第1/第2条）は MHLW/JAISH 収録表を verbatim 確認。熱中症は基発0318第1号別紙 第3の5「管理者に対する教育（225分）」の事項・範囲・分を採用。

## 設計上の判断（企画からの最小逸脱）

- **デッキ・レジストリを YAML でなく TypeScript で単一正本化**した。理由: リポジトリに YAML パーサ依存が無く（CLAUDE.md「依存パッケージの大幅追加は要オーナー確認」）、網羅ゲートは plain fidelity と同じく**TSオブジェクトの純関数照合**にする方が堅牢（vitest の include も src 限定）。PPTX（EDU-O1）は既存 `data/seminars/*.yaml` を使うため、O1 着手時に covers/timetable を YAML へ写経するか、TS正本から生成する方針を選ぶ（BACKLOG-ops に注記）。

## 検証

- `npm run curriculum:test` 緑（21 tests）・`npm run curriculum:status` で対応表生成・`npx tsc --noEmit` 0・`npm run lint` 0・`npm run build` 成功。
- 本番相当 `next start` で /education/pack・/pack/[slug]・/pack/terms・/contact（教育文脈）すべて 200。モバイル390px・投影モード・件名プレフィル（「【教育パック】フルハーネス型墜落制止用器具 特別教育 カスタマイズ相談」）を実機スクショで確認。
