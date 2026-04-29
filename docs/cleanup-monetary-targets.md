# 月商目標表記クリーンアップ監査ログ

実施日: 2026-04-29
タスク: V3討議結果 タスクA3

## 調査結果

### 検索コマンド
```
grep -rn "月商" web/src/app/ web/src/components/
grep -rn "100万円" web/src/app/ web/src/components/
grep -rn "月商目標" web/src/app/ web/src/components/
```

### 発見箇所と対処

| ファイル | 内容 | 対処 |
|---|---|---|
| `web/src/app/(main)/strategy/page.tsx:6` | `title: "月商100万円戦略 V3 \| ANZEN AI 内部文書"` | **除外** — /strategy は社内文書ページ |
| `web/src/components/strategy-gate.tsx:47` | `<h1>月商100万円戦略 — パスワード保護</h1>` | **除外** — /strategy へのゲートコンポーネント |
| `web/src/data/strategy/monetization-v3-2026-04-26.ts` | 戦略文書データ全体 | **除外** — 内部データ、/strategy のみで使用 |

### 「100万円」表記（月商目標以外の合法的な金額表記）

| ファイル | 内容 | 判定 |
|---|---|---|
| `web/src/data/compliance-matrix.json` | 解体工事請負金額・助成金上限 | 法的情報 → 除外 |
| `web/src/app/(main)/subsidies/page.tsx` | 助成金補助上限金額 | 法的情報 → 除外 |
| `web/src/data/subsidies.json` | 助成金補助上限金額 | 法的情報 → 除外 |
| `web/src/data/seo-articles/seo-articles-subsidies.jsonl` | 助成金SEO記事 | 法的情報 → 除外 |
| `web/src/app/(main)/enterprise/contact/EnterpriseContactForm.tsx` | 予算選択肢「50〜100万円」 | フォーム選択肢 → 除外 |
| `web/src/app/(main)/contact/ContactForm.tsx` | 予算選択肢「50〜100万円」 | フォーム選択肢 → 除外 |
| `web/src/app/(main)/diversity/page.tsx` | 助成金上限「上限100万円」 | 法的情報 → 除外 |
| `web/src/data/mock/quiz/cert-quiz/anzen-arch.ts` | 建設業解体工事基準「請負金額100万円以上」 | 試験問題 → 除外 |

## 結論

公開UI（app/ および components/）に、**削除対象となる月商目標・ビジネス収益目標の表記はなし**。

- `/strategy` ページおよびその関連ファイルはすべてパスワード保護済みの社内文書扱いのため除外対象。
- それ以外の「100万円」表記はすべて助成金・コンプライアンス・フォーム入力値など合法的な金額表記であり、削除不要。

## 変更ファイル

なし（削除対象の表記が公開UIに存在しなかったため）
