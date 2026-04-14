# Daily Review 2026-04-13（月曜日）グループA巡回

## 実施概要

- **日付**: 2026年4月13日（月）
- **巡回グループ**: A（若手職長、安全部長、中小社長、製造業推進者、監督官）
- **対象**: 全25ページ、56コンポーネント、モックデータ、APIルート、ユーティリティ

---

## 軽微修正（コミット済み: 444f13b）

| ファイル | 修正内容 | カテゴリ |
|---------|---------|---------|
| `ContactForm.tsx` | 全inputにid追加、labelにhtmlFor追加 | アクセシビリティ |
| `notifications/page.tsx` | `mx-auto max-w-5xl`追加でPC横伸び防止 | レイアウト |
| `notifications/page.tsx` | メタデータから「準備中」除去（実コンテンツあり） | コンテンツ正確性 |
| `notifications/page.tsx` | Bell/CheckCircleアイコンにaria-hidden追加 | アクセシビリティ |
| `subscribe-form.tsx` | Mailアイコンにaria-hidden追加 | アクセシビリティ |
| `pricing/page.tsx` | プランアイコンにaria-hidden追加 | アクセシビリティ |

**注意**: サンドボックスのネットワーク制限により `git push` が実行できませんでした。ローカルコミットのpushが必要です。

---

## GitHub Issueとして提案する改善事項

### Issue 1: 天気リスクページにPageHeaderを追加する
- **優先度**: 中
- **ペルソナ**: 製造業推進者
- **ファイル**: `web/src/app/(main)/risk/page.tsx`
- **内容**: 他のページはすべてPageHeaderコンポーネントを使用しているが、天気リスクページだけが使っていない。視覚的な一貫性が損なわれている。
- **提案**: PageHeaderを追加（icon=CloudSun, iconColor="blue"）

### Issue 2: HomeValueHeroにmax-width制約を追加する
- **優先度**: 低
- **ペルソナ**: 安全部長（PC閲覧時）
- **ファイル**: `web/src/components/home-value-hero.tsx`
- **内容**: ウルトラワイドモニターでヒーローカードが横に間延びする。`mx-auto max-w-7xl`ラッパーが必要。

### Issue 3: 試験クイズの選択肢ボタンにdisabled状態の視覚フィードバックを追加
- **優先度**: 中
- **ペルソナ**: 監督官（試験対策利用時）
- **ファイル**: `web/src/app/(main)/exam-quiz/exam-quiz-client.tsx`
- **内容**: 選択後のボタンにdisabled:cursor-not-allowed disabled:opacity-50が不足。ユーザーが再選択可能と誤解する可能性。

### Issue 4: weather-risk-card.tsxの大規模リファクタリング
- **優先度**: 低
- **ペルソナ**: 製造業推進者（保守性）
- **ファイル**: `web/src/components/weather-risk-card.tsx`
- **内容**: 400行超の大規模コンポーネント。地域/業種セレクタの重複、スタイリング条件の反復。`RegionWorkTypeSelector`、`RiskStatus`、`BriefingSection`への分割を推奨。

### Issue 5: Stripe webhook TODOの完了
- **優先度**: 高（課金機能に関わる）
- **ペルソナ**: 中小社長（サブスク利用検討時）
- **ファイル**: `web/src/app/api/stripe/webhook/route.ts`
- **内容**: 3つのTODOが未完了。NextAuth連携、サブスク削除時のプラン降格、支払い失敗時のメール通知。
- **注意**: これはオーナー確認事項（認証・課金の実装）

### Issue 6: RAG検索の改善
- **優先度**: 低
- **ペルソナ**: 若手職長（法令検索利用時）
- **ファイル**: `web/src/lib/rag-search.ts`
- **内容**: 現在はキーワードマッチのみ。長い文書が高スコアになるバイアスあり。スコア正規化と最小スコア閾値の導入を推奨。

### Issue 7: KYアシストレスポンスの多様性拡充
- **優先度**: 中
- **ペルソナ**: 若手職長（KY用紙利用時）
- **ファイル**: `web/src/data/mock/ky-assist-responses.ts`
- **内容**: 危険8件・対策7件・残留リスク3件のみ。現場利用で同じ回答が繰り返される。各15〜20件程度への拡充を推奨。

### Issue 8: APIルートの入力バリデーション強化
- **優先度**: 中
- **ペルソナ**: 監督官（セキュリティ観点）
- **ファイル**: `web/src/app/api/chat/route.ts`, `web/src/app/api/revisions/route.ts`
- **内容**: リクエストボディの構造検証が不足。文字数上限の設定やzodスキーマによるバリデーションを推奨。

---

## ペルソナ別サマリー

### 若手職長
- KY用紙・安全日誌のフォーム入力は適切に機能
- KYアシストの回答パターンが少なく繰り返しが発生する（Issue 7）
- 法令検索の精度向上余地あり（Issue 6）

### 安全部長
- 通知ページのレイアウトが修正済み（コミット済み）
- PC表示での全体的なレイアウト一貫性は良好
- サイネージページの小フォント（9-10px）は大型ディスプレイ前提のため許容

### 中小社長
- 料金ページのアクセシビリティ改善済み（コミット済み）
- Stripe決済フローのTODO未完了が重要課題（Issue 5）
- お問い合わせフォームのアクセシビリティ改善済み

### 製造業推進者
- 事故データベースは厚労省実データで充実
- 天気リスクページのUI不一致を修正推奨（Issue 1）
- 化学物質RAは内容が薄い（将来の拡充課題）

### 監督官
- 法令チャットボット・検索機能は機能的
- 試験クイズのUX改善余地あり（Issue 3）
- APIのセキュリティ強化を推奨（Issue 8）

---

## 良好な点

1. **日本語ローカライズ**: 全UIテキストが自然で一貫した日本語
2. **コンポーネント設計**: ServiceFactory、PageHeader等の再利用パターンが優秀
3. **アクセシビリティ基盤**: aria-label、セマンティックHTML、label紐付けの基盤あり
4. **エラー処理**: ErrorNoticeコンポーネント、retryableフラグ付きServiceError型
5. **レスポンシブ設計**: mobile-firstアプローチ、適切なブレークポイント
6. **型安全**: TypeScript strictモード、any未使用

## 次回の推奨アクション

1. `git push origin main` でコミットを反映
2. Issue 1, 3, 7 を軽微修正として次回巡回で対応
3. Issue 5 はオーナー確認後に着手
4. `web/scripts/daily-review-prompt.md` を作成して巡回手順を定義
