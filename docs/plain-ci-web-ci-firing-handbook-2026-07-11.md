# web-ci が PR で発火しない罠と対処（現場ことば版 並列執筆の事故調書）

作成: 2026-07-11 / 対象: `.github/workflows/web-ci.yml` の `pull_request` トリガ
きっかけ: 現場ことば版を5部隊で並列執筆した際、PR #889（安衛法62条）が
web-ci を一度も起動できず宙吊りになった。同因が #887 ほか複数PRに及んでいた。

## 結論（先に対処だけ知りたい人向け）

**dirty（マージ競合）な PR には、GitHub は `pull_request` チェック（web-ci の
smoke/full/e2e）を作らない。** 直し方は「最新 main へ rebase して競合を解消し
push」＝再び mergeable になり CI が自動発火する。`paths: web/**` は無実。
`workflow_dispatch` の 403 は権限問題で解決策ではない。

## 何が起きていたか（根本原因）

1. web-ci は `pull_request` イベントで走る（`paths: web/** / .github/workflows/web-ci.yml`）。
   翻訳PRは `web/src/data/plain/<法令>.ts` を触るので **paths は必ず一致する**。
   実際 #893/#894/#895/#890/#892 は web-ci 緑を取れた瞬間があった＝paths は無実。
2. GitHub Actions は `pull_request` の実行を、**PR head を base にマージした
   「マージ ref（refs/pull/N/merge）」の上で作る**。この ref は PR が
   *mergeable* のときだけ生成される。
3. PR が **dirty（マージ競合）** だと GitHub はマージ ref を作れず、その結果
   **web-ci のチェック自体が生成されない**（＝「一度も起動しない」ように見える。
   赤ですらなく無）。PR ページの Checks には Vercel など別トリガのものだけ残る。
4. 競合の発生源は **自動生成ファイル**だった:
   - `docs/plain-language-coverage.md`
   - `BACKLOG-plain-stale.md`
   どちらも `cd web && npm run plain:status` が毎回上書きする派生物。各部隊が
   自分の再生成版をコミットしていたため、先にどれかが main にマージされて main が
   進むと、残りのPRはこの2ファイル（と `index.ts` の登録行）で競合＝dirty 化した。
   - #889/#887 は生成時点で既に dirty で、clean な窓が一度も無く web-ci 未発火。
   - #890/#892/#893/#894/#895 は作成直後の clean な窓で web-ci 緑を取れたが、
     その後 main が進んで全部 dirty 化した（緑の記録は残るがマージ不可）。

補足: `git merge-tree` で #889 を main にマージすると、競合は
`docs/plain-language-coverage.md` と `BACKLOG-plain-stale.md` に集中していた
（`index.ts` は 3-way で自動マージされる位置関係だった）。

## 安全な発火手段（実証済み）

- ✅ **最新 main へ rebase → 競合解消 → push**。mergeable に戻り web-ci が自動発火。
  本収束では各法令データを最新 main 上に単一コミットで再構成し（翻訳データは元PRと
  bit 一致）、生成物は `plain:status` で作り直して union 解決した。
- ✅ close→reopen も PR が clean なら発火する（dirty のままでは無意味）。
- ❌ 空コミット push … PR が dirty のままなら発火しない（#889 で実証）。
- ❌ `workflow_dispatch`（手動実行）… 403。Actions 書込権限（`actions:write`）が
  トークン/アプリに無いと弾かれる。そもそも発火の本質的な解決ではない。

## 恒久対策（このコミットで導入）

1. **`.gitattributes` に union マージ指定**（安全網）:
   ```
   docs/plain-language-coverage.md merge=union
   BACKLOG-plain-stale.md merge=union
   ```
   競合で PR を止めない。重複行が出ても次の `plain:status` で決定的に上書きされる。
2. **運用ルール（本命）**: 翻訳PRに生成物を含めない。`npm run plain:status` は
   ローカル確認用に回してよいが、**commit 前に生成物を戻す**:
   ```
   git checkout -- docs/plain-language-coverage.md BACKLOG-plain-stale.md
   ```
   進捗レポートは収束/マージ後に main 上で1回まとめて再生成する。
   （squad-1〜5.md / README.md にも1行反映済み。）

## 運用チェックリスト（PR を宙吊りにしないため）

- PR を開いたら Checks に `smoke`/`e2e` が出るか確認。Vercel だけなら **dirty を疑う**。
- `mergeable_state` が `dirty`/`unknown` なら rebase→push で clean 化してから待つ。
- 進捗レポート（coverage/backlog-stale）は翻訳PRに載せない。
