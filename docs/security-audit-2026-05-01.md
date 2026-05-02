# セキュリティ監査ログ 2026-05-01

## サマリ
- `npm audit` 件数: **35 → 5**
- critical/high: **22 → 0**（達成）
- moderate: 12 → 5（受容）
- low: 1 → 0

## 対応
### 削除: `vercel` (devDependency)
- 範囲: `^50.37.3`
- 理由: 22件の high 脆弱性が `vercel` CLI 配下に集中（`@vercel/*`, `path-to-regexp`, `tar`, `minimatch`, `undici`, `@tootallnate/once`）。
- 影響: 本番デプロイは Vercel 側の GitHub 連携で行うため、ローカル `vercel` CLI は不要。
- 削除した npm scripts: `vercel:whoami`, `vercel:link`, `vercel:preview`, `vercel:prod`。
- 検証: `npm install` / `npm run build` 成功。

## 受容: moderate 5件（全て上流パッチ待ち）
| パッケージ | 経路 | 脆弱性 | 受容理由 |
|---|---|---|---|
| postcss | direct: next 16.2.4 | XSS via Unescaped `</style>` in CSS Stringify | next 最新版でも未パッチ。ビルド時のみで、信頼できないCSSは扱わない。 |
| next | direct (16.2.4) | postcss 経由 | 同上。`audit fix` は 9.3.3 への破壊的downgradeのみ提案で却下。 |
| svix | transitive: resend | uuid v3/v5/v6 buffer bounds | resend 最新版でも未パッチ。webhook送信のみ利用、ユーザー制御バッファを渡さない。 |
| uuid | transitive: svix | 同上 | 同上。 |
| resend | direct (^6.10.0) | svix 経由 | 同上。`audit fix` は 6.1.3 への破壊的downgradeのみ提案で却下。 |

## 次回再評価のトリガ
- `next` メジャー更新（postcss 同梱バージョン更新時）
- `resend` メジャー更新（svix/uuid 更新時）
- 新規 critical/high が出た場合は即座に対応
