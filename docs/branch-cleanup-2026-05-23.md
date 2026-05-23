# ブランチ棚卸し — 2026-05-23

## 概要

- 総リモートブランチ数: 173 (main 除く)
- A分類 (即削除実行): 73 件 (本PRで削除実行済)
- B分類 (削除可、社長確認待ち): 85 件
- C分類 (要確認、60日以上): 0 件
- D分類 (削除不可、要判断): 11 件
- 保護対象 (open PR head / current branch): 5 件

## 判定ロジック

| 分類 | 条件 |
|------|------|
| A | `claude/*` ブランチで対応 merged PR あり (squash-merge 済、PR レコードで履歴保全) |
| B | `claude/*` 以外で対応 merged PR あり (チーム/手動ブランチ、社長判断待ち) |
| C | merged PR なし、最終コミット60日以上前 |
| D | merged PR なし、最近のブランチまたは特殊ケース |

いずれの merged PR 持ちブランチも `commits_ahead > 0` (squash-merge のため main の祖先にはならない)。GitHub の PR レコードで完全な変更履歴が保全されるため、ブランチ削除は安全。

## PR #231 の処理判断

- タイトル: `docs(audits): review-dashboard snapshot 2026-05-17 (owner review pre-Vercel)`
- 内容: `/audits/review-dashboard` (PR #229, e3e3624) のポイントインタイム markdown スナップショット (746行)
- ヘッドブランチ: `claude/wizardly-tesla-61cf25`
- 最終更新: 2026-05-17 (6日前)
- ライブダッシュボード: `web/src/app/(main)/audits/review-dashboard/page.tsx` は main にマージ済み (PR #229)

**判断: close 提案**

根拠:
- スナップショット作成時 (5/17) と現在 (5/23) で main は大きく進化 (PR #232〜#261 merged、+ Open PR #262/#263)
- F-category 判断待ち項目 (F-005/F-007/F-008/F-010) はその後の PR で順次対応済の可能性が高い (要別途追跡)
- ライブダッシュボードが本番で稼働している以上、ポイントインタイム markdown スナップショットを別途 main にマージする価値は低い
- 6日間更新ゼロ = 実質放棄状態

対応: 別タスクで close 実施 (本PRでは未実施、社長確認後)

---

## A分類 — 即削除実行 (73 件)

条件: `claude/*` プレフィックス + 対応 merged PR あり。本PRで `git push origin --delete` 実行済。

| ブランチ | 最終コミット | PR# | コミット差 |
|----------|-------------|-----|-----------|
| `claude/safe-ai-site-audit-u48Pz` | 2026-05-23 | #261 | +1 |
| `claude/admiring-rhodes-bd2186` | 2026-05-20 | #257 | +18 |
| `claude/zealous-shirley-c16cdb` | 2026-05-20 | #254 | +13 |
| `claude/stoic-mirzakhani-1a7a83` | 2026-05-20 | #251 | +8 |
| `claude/frosty-mendeleev-f03dd9` | 2026-05-19 | #249 | +1137 |
| `claude/strange-easley-4c0481` | 2026-05-19 | #248 | +1136 |
| `claude/sharp-hertz-12c435` | 2026-05-19 | #246 | +1134 |
| `claude/goofy-meninsky-127577` | 2026-05-19 | #245 | +1132 |
| `claude/practical-bouman-2b6d43` | 2026-05-19 | #244 | +1129 |
| `claude/p2-batch-plan-2026-05-18` | 2026-05-19 | #243 | +1128 |
| `claude/funny-kowalevski-6fb8fe` | 2026-05-19 | #241 | +1124 |
| `claude/thirsty-gates-2fe990` | 2026-05-19 | #239 | +1123 |
| `claude/festive-cray-b54551` | 2026-05-19 | #240 | +1116 |
| `claude/focused-galileo-f0aaef` | 2026-05-18 | #238, #237, #236 | +1117 |
| `claude/happy-franklin-f3e0b0` | 2026-05-18 | #235 | +1099 |
| `claude/fervent-dubinsky-aa7274` | 2026-05-17 | #234 | +1093 |
| `claude/festive-ardinghelli-aae1b5` | 2026-05-17 | #232 | +1088 |
| `claude/ecstatic-meninsky-919572` | 2026-05-17 | #229 | +1085 |
| `claude/elated-chatterjee-74787f` | 2026-05-17 | #227 | +1084 |
| `claude/resilience-phase-2` | 2026-05-17 | #228 | +1079 |
| `claude/nice-bardeen-59d829` | 2026-05-17 | #225 | +1076 |
| `claude/elated-shtern-72267e` | 2026-05-17 | #226 | +1065 |
| `claude/stoic-keller-938a8a` | 2026-05-17 | #223 | +1075 |
| `claude/cool-raman-bcf9e0` | 2026-05-17 | #222 | +1065 |
| `claude/blissful-murdock-35c0f3` | 2026-05-17 | #221 | +1073 |
| `claude/admiring-davinci-b319e0` | 2026-05-17 | #220 | +1065 |
| `claude/determined-babbage-e39b68` | 2026-05-17 | #219 | +1065 |
| `claude/flamboyant-lewin-53ef62` | 2026-05-17 | #218 | +1067 |
| `claude/pensive-burnell-b59283` | 2026-05-17 | #217 | +1065 |
| `claude/laughing-haibt-f5b643` | 2026-05-17 | #213 | +1065 |
| `claude/mobile-ux-audit-2026-05-17` | 2026-05-17 | #216 | +1059 |
| `claude/fervent-murdock-12049c` | 2026-05-17 | #215 | +1059 |
| `claude/naughty-zhukovsky-59e307` | 2026-05-17 | #214 | +1059 |
| `claude/nervous-buck-1ed6e6` | 2026-05-17 | #212 | +1063 |
| `claude/busy-wing-0f28e0` | 2026-05-17 | #211 | +1061 |
| `claude/news-feed-judge-audit-2026-05-17` | 2026-05-17 | #210 | +1059 |
| `claude/nervous-wing-9dab29` | 2026-05-17 | #208 | +1057 |
| `claude/tender-banzai-044fc8` | 2026-05-16 | #183 | +993 |
| `claude/goofy-archimedes-0ab343` | 2026-05-16 | #178 | +986 |
| `claude/sharp-shockley-8e079f` | 2026-05-16 | #175 | +983 |
| `claude/dazzling-lamport-944f08` | 2026-05-16 | #174 | +763 |
| `claude/jovial-panini-4485de` | 2026-05-16 | #171 | +977 |
| `claude/great-rosalind-892047` | 2026-05-16 | #169 | +978 |
| `claude/zen-hodgkin-482d27` | 2026-05-16 | #168 | +976 |
| `claude/eager-fermi-1cbd4a` | 2026-05-16 | #167 | +975 |
| `claude/nifty-swartz-3e5309` | 2026-05-16 | #166 | +973 |
| `claude/sleepy-payne-78cac6` | 2026-05-16 | #162 | +966 |
| `claude/flamboyant-wright-807c47` | 2026-05-16 | #161 | +763 |
| `claude/fix-duplicate-main` | 2026-05-16 | #152 | +938 |
| `claude/tender-sanderson-9b5be0` | 2026-05-15 | #148 | +939 |
| `claude/i18n-seo-3f86c0` | 2026-05-15 | #136 | +919 |
| `claude/pwa-enhancements-3f86c0` | 2026-05-15 | #132 | +913 |
| `claude/vibrant-dirac-d386d5` | 2026-05-14 | #103 | +870 |
| `claude/gifted-heisenberg-3f4804` | 2026-05-07 | #76 | +764 |
| `claude/competent-swirles-5b6161` | 2026-05-07 | #74 | +760 |
| `claude/relaxed-jones-958106` | 2026-05-06 | #73 | +755 |
| `claude/nifty-noyce-5ce5b6` | 2026-05-06 | #72 | +741 |
| `claude/clever-carson-674d01` | 2026-05-04 | #68 | +705 |
| `claude/nice-brahmagupta-25b5e0` | 2026-05-04 | #67 | +700 |
| `claude/spicy-review-top10` | 2026-05-04 | #66 | +706 |
| `claude/competent-euler-969219` | 2026-05-04 | #65, #63 | +699 |
| `claude/vigilant-khayyam-e5802c` | 2026-05-03 | #64 | +684 |
| `claude/crazy-wiles-dab0d9` | 2026-05-03 | #62 | +683 |
| `claude/dreamy-thompson-820044` | 2026-05-03 | #61 | +680 |
| `claude/festive-proskuriakova-30e751` | 2026-05-03 | #60 | +679 |
| `claude/quizzical-pascal-7791a9` | 2026-05-03 | #59 | +675 |
| `claude/adoring-stonebraker-0c9f55` | 2026-05-03 | #58 | +680 |
| `claude/fervent-mccarthy-8ccecb` | 2026-05-03 | #57 | +670 |
| `claude/reverent-goldwasser-280c0b` | 2026-05-02 | #56 | +659 |
| `claude/relaxed-hertz-8ba83c` | 2026-05-02 | #55 | +657 |
| `claude/thirsty-wiles-117fe9` | 2026-05-02 | #54 | +640 |
| `claude/sad-lalande-abf395` | 2026-05-02 | #52 | +637 |
| `claude/competent-feynman-3d6f18` | 2026-05-02 | #51 | +635 |

---

## B分類 — 削除可 (社長確認待ち, 85 件)

条件: `claude/*` 以外で対応 merged PR あり。チーム命名規則のブランチも含むため、削除前に社長確認。

**ご判断: B分類すべて削除してよろしいですか?**

| ブランチ | 最終コミット | PR# | コミット差 | 備考 |
|----------|-------------|-----|-----------|------|
| `feat/main3-quality-deepening` | 2026-05-21 | #260 | +3 |  |
| `docs/post-restart-check-2026-05-19` | 2026-05-20 | #258 | +0 | 祖先 |
| `security/f002-admin-health-auth` | 2026-05-20 | #256 | +17 |  |
| `docs/site-reality-check-2026-05-19` | 2026-05-20 | #255 | +13 |  |
| `perf/f005-dynamic-route-cdn-cache` | 2026-05-20 | #253 | +16 |  |
| `perf/isr-writes-reduction` | 2026-05-20 | #252 | +16 |  |
| `docs/main-three-strategic-enhancement` | 2026-05-17 | #176 | +1098 |  |
| `docs/homepage-main-features-draft` | 2026-05-17 | #173 | +1097 |  |
| `fix/chemical-audit-2026-05-17` | 2026-05-17 | #209 | +1095 |  |
| `docs/regression-audit-may16-2026` | 2026-05-17 | #177 | +1096 |  |
| `chore/robots-cache-purge` | 2026-05-17 | #233 | +1090 |  |
| `fix/e2e-pricing-test-stale-placeholder` | 2026-05-17 | #230 | +1086 |  |
| `chore/audit-f-009-f-011-kept-after-investigation` | 2026-05-17 | #224 | +1065 |  |
| `fix/remove-stop-claude-from-docs` | 2026-05-17 | #206, #205 | +1057 |  |
| `chore/audit-mark-resolved-pr-202` | 2026-05-17 | #203 | +1046 |  |
| `fix/audit-b-category-content-quality` | 2026-05-17 | #202 | +1041 |  |
| `fix/audit-p1-priority-batch` | 2026-05-16 | #199 | +1031 |  |
| `chore/audit-mark-resolved-pr-196` | 2026-05-16 | #197 | +1030 |  |
| `refactor/archive-ai-generated-articles` | 2026-05-16 | #196 | +1028 |  |
| `refactor/remove-brand-damaging-content` | 2026-05-16 | #194 | +1022 |  |
| `security/strategy-password-rotation` | 2026-05-16 | #193 | +1020 |  |
| `chore/audit-status-update-pr191` | 2026-05-16 | #192 | +1017 |  |
| `refactor/content-quality-cleanup` | 2026-05-16 | #191 | +1015 |  |
| `docs/p1-batch-plan` | 2026-05-16 | #190 | +1009 |  |
| `docs/exam-quiz-content-inventory-2026-05-16` | 2026-05-16 | #189 | +1003 |  |
| `fix/audit-p0-robots-and-exam-quiz-notation` | 2026-05-16 | #188 | +1001 |  |
| `audit/harsh-third-party-review-2026-05-16` | 2026-05-16 | #187 | +999 |  |
| `revert/exam-quiz-185` | 2026-05-16 | #186 | +996 |  |
| `feat/accidents-reports-deep-enhance` | 2026-05-16 | #184 | +993 |  |
| `fix/regression-audit-p2-p3` | 2026-05-16 | #181 | +989 |  |
| `fix/regression-audit-p1` | 2026-05-16 | #180 | +989 |  |
| `feat/heat-illness-prevention` | 2026-05-16 | #170 | +982 |  |
| `feat/glossary-expansion-250` | 2026-05-16 | #165 | +972 |  |
| `fix/mhlw-notices-stray-comma` | 2026-05-16 | #164 | +969 |  |
| `feat/health-checkup-scheduler` | 2026-05-16 | #163 | +960 |  |
| `feat/annual-safety-plan-generator` | 2026-05-16 | #157 | +955 |  |
| `feat/industry-accident-reports` | 2026-05-16 | #156 | +955 |  |
| `feat/gsc-domain-add-property` | 2026-05-16 | #154 | +952 |  |
| `docs/lighthouse-audit-2026-05-14` | 2026-05-15 | #135 | +919 |  |
| `fix/lighthouse-quiz-redirect` | 2026-05-15 | #145 | +932 |  |
| `perf/lighthouse-gtm-lazy` | 2026-05-15 | #144 | +931 |  |
| `feat/circulars-expansion` | 2026-05-15 | #143 | +763 |  |
| `fix/lighthouse-a11y-polish` | 2026-05-15 | #142 | +930 |  |
| `perf/lighthouse-recharts-lazy` | 2026-05-15 | #141 | +927 |  |
| `refactor/wizard-layout-migration` | 2026-05-15 | #140 | +928 |  |
| `refactor/chatbot-layout-migration` | 2026-05-15 | #139 | +925 |  |
| `fix/lighthouse-hydration-banner` | 2026-05-15 | #138 | +925 |  |
| `fix/lighthouse-cls-accidents` | 2026-05-15 | #137 | +925 |  |
| `feat/law-hierarchy-nav` | 2026-05-15 | #134 | +921 |  |
| `fix/a11y-polish` | 2026-05-15 | #133 | +918 |  |
| `feat/visible-breadcrumb` | 2026-05-15 | #131 | +916 |  |
| `fix/homepage-trailing-loading` | 2026-05-15 | #130 | +911 |  |
| `feat/url-bind` | 2026-05-15 | #126 | +906 |  |
| `fix/hsts-preload` | 2026-05-15 | #129 | +906 |  |
| `perf/webp-images` | 2026-05-15 | #121 | +904 |  |
| `ux/form-autocomplete` | 2026-05-15 | #128 | +903 |  |
| `ux/skeleton-loaders` | 2026-05-15 | #127 | +903 |  |
| `fix/apex-www-301` | 2026-05-15 | #125 | +903 |  |
| `perf/recharts-dynamic` | 2026-05-15 | #124 | +901 |  |
| `fix/csp-allowlist-v2` | 2026-05-15 | #122 | +901 |  |
| `fix/sitemap-completeness` | 2026-05-15 | #120 | +901 |  |
| `docs/seo-ux-deep-audit` | 2026-05-15 | #118 | +900 |  |
| `feat/stats-gsc-ga4-expansion` | 2026-05-14 | #117 | +886 |  |
| `docs/data-expansion-final-2026-05-14` | 2026-05-14 | #116 | +885 |  |
| `refactor/layout-batch-4` | 2026-05-14 | #110 | +892 |  |
| `feat/rag-deepen-existing-regulations` | 2026-05-14 | #108 | +872 |  |
| `feat/law-hierarchy-page` | 2026-05-14 | #107 | +872 |  |
| `refactor/layout-batch-3` | 2026-05-14 | #106 | +872 |  |
| `feat/rag-add-5-missing-regulations` | 2026-05-14 | #105 | +870 |  |
| `feat/accident-data-2025-2026-preliminary` | 2026-05-14 | #104 | +869 |  |
| `feat/accident-data-refresh-2026-05` | 2026-05-14 | #102 | +868 |  |
| `feat/chemical-oel-depth-2026-05` | 2026-05-14 | #101 | +865 |  |
| `docs/completion-phase-final-2026-05-13` | 2026-05-14 | #98 | +861 |  |
| `chore/deep-audit-2026-05-13` | 2026-05-13 | #94 | +856 |  |
| `fix/organization-link-lint` | 2026-05-13 | #93 | +857 |  |
| `improve/loading-states-2026-05-13` | 2026-05-13 | #92 | +856 |  |
| `fix/copy-cleanup-2026-05-13` | 2026-05-13 | #91 | +855 |  |
| `fix/seo-jsonld-canonical-2026-05-13` | 2026-05-13 | #90 | +854 |  |
| `feat/rag-add-branch-articles-batch1` | 2026-05-13 | #88 | +851 |  |
| `chore/audit-final-2026-05-13` | 2026-05-13 | #87 | +850 |  |
| `fix/og-completion-helper` | 2026-05-13 | #86 | +849 |  |
| `fix/og-title-duplicate-brand` | 2026-05-13 | #85 | +850 |  |
| `fix/seo-www-canonical-and-alt-branding` | 2026-05-07 | #77 | +762 |  |
| `feat/ux-overhaul-6features` | 2026-05-07 | #75 | +768 |  |
| `fix/harsh-review-v3-critical-issues` | 2026-05-06 | #71 | +744 |  |

---

## C分類 — 60日以上、PR無し (0 件)

該当なし。リポジトリ内最古ブランチが 2026-05-01 のため、60日経過したものは存在しない。

---

## D分類 — 削除不可 / 要判断 (11 件)

条件: 対応 merged PR なし、かつ 60日未満。未マージ作業の可能性あり。

**個別判断が必要です。それぞれ「削除/維持/復旧」の判断をお願いします。**

| ブランチ | 最終コミット | 経過日数 | コミット差 | 備考 |
|----------|-------------|---------|-----------|------|
| `claude/quizzical-engelbart-caaa22` | 2026-05-01 | 22日 | +620 | PR履歴なし |
| `claude/strange-mclean-7822a8` | 2026-05-02 | 21日 | +635 | PR履歴なし |
| `claude/affectionate-brahmagupta-90a398` | 2026-05-02 | 21日 | +640 | PR履歴なし |
| `claude/recursing-nobel-434838` | 2026-05-02 | 21日 | +645 | PR履歴なし |
| `claude/busy-swirles-b7dac8` | 2026-05-10 | 13日 | +763 | PR履歴なし |
| `chore/completeness-audit-2026-05-13` | 2026-05-13 | 10日 | +849 | PR履歴なし |
| `fix/home-latest-fatal-from-merged-dataset` | 2026-05-14 | 9日 | +887 | closed-not-merged PR #113 |
| `fix/home-latest-fatal-v2` | 2026-05-14 | 9日 | +884 | closed-not-merged PR #115 |
| `update/lighthouse-audit-postfix` | 2026-05-15 | 8日 | +919 | PR履歴なし |
| `feat/audit-f-category-feature-inventory` | 2026-05-16 | 7日 | +999 | PR履歴なし |
| `chore/screenshot-update` | 2026-05-18 | 5日 | +1112 | PR履歴なし |

### D分類個別所見

#### `claude/quizzical-engelbart-caaa22`
- `claude/*` 系だがPRに紐付かず。Claude セッションが中断 or PR未作成のまま放置
- 内容が他PRで取り込まれているか要確認。確認後に削除推奨

#### `claude/strange-mclean-7822a8`
- `claude/*` 系だがPRに紐付かず。Claude セッションが中断 or PR未作成のまま放置
- 内容が他PRで取り込まれているか要確認。確認後に削除推奨

#### `claude/affectionate-brahmagupta-90a398`
- `claude/*` 系だがPRに紐付かず。Claude セッションが中断 or PR未作成のまま放置
- 内容が他PRで取り込まれているか要確認。確認後に削除推奨

#### `claude/recursing-nobel-434838`
- `claude/*` 系だがPRに紐付かず。Claude セッションが中断 or PR未作成のまま放置
- 内容が他PRで取り込まれているか要確認。確認後に削除推奨

#### `claude/busy-swirles-b7dac8`
- `claude/*` 系だがPRに紐付かず。Claude セッションが中断 or PR未作成のまま放置
- 内容が他PRで取り込まれているか要確認。確認後に削除推奨

#### `chore/completeness-audit-2026-05-13`
- 命名から監査/メンテ目的のブランチ。PR未作成のまま放置
- 内容確認後に削除可と推測

#### `fix/home-latest-fatal-from-merged-dataset`
- 対応 PR #113 は close-without-merge 状態
- 通常は削除可。後継PRで内容置換済か確認推奨

#### `fix/home-latest-fatal-v2`
- 対応 PR #115 は close-without-merge 状態
- 通常は削除可。後継PRで内容置換済か確認推奨

#### `update/lighthouse-audit-postfix`
- 命名から監査/メンテ目的のブランチ。PR未作成のまま放置
- 内容確認後に削除可と推測

#### `feat/audit-f-category-feature-inventory`
- 用途要確認

#### `chore/screenshot-update`
- 命名から監査/メンテ目的のブランチ。PR未作成のまま放置
- 内容確認後に削除可と推測

---

## 保護対象 (削除対象外)

以下のブランチは現役またはオープンPRのheadのため、本棚卸しから除外。

| ブランチ | 種別 |
|---------|------|
| `audit/content-quality-2026-05-16` | Open PR #182 head |
| `claude/wizardly-tesla-61cf25` | Open PR #231 head |
| `feat/p8-plan-generator-industry-consistency` | Open PR #262 head |
| `feat/ky-diary-paper-first-redesign` | Open PR #263 head |
| `main` | デフォルトブランチ |
| `claude/stale-pr-cleanup-2026-wd5uY` | 本セッション作業ブランチ |
| `chore/stale-pr-cleanup-2026-05-23` | 本PRブランチ |

---

## 削除実行後の予想ブランチ数

- 削除前: 174
- A削除実行後: 174 - 73 = 101
- B削除承認 → 実行後 (想定): 16
- 最終残数想定 (B承認時): D 11 + Open PR head 4 + main + 作業ブランチ2 = 約 18
