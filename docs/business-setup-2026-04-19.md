# 受託業務・特別教育・月額顧問メニュー新設記録（2026-04-19）

## 背景・目的
- 屋号「ANZEN AI」のもと、サイト訪問者に向けた収益導線を強化する。
- 個人名は完全に出さず、資格情報「労働安全コンサルタント（登録番号260022・土木区分）」のみで信頼性を担保する。
- 経歴のうち、特定企業（NEXCO・建設コンサルタント）や個別案件（大深度地下工事）への言及は削除。
- 表彰実績は具体名を伏せ「大規模プロジェクトで表彰実績あり」のみとする。

## 全10タスクの実施記録

### Task 1: 個人名の完全削除
- 対象ファイル: `web/src/components/json-ld.tsx`, `web/src/components/footer.tsx`,
  `web/src/app/(main)/about/page.tsx`, `web/src/app/(main)/chatbot/page.tsx`,
  `web/src/app/(main)/contact/ContactForm.tsx`
- 「金田 義太 / 金田義太 / かねた よした / Kaneta Yoshita」を全て削除。
- JSON-LD `Person` の `name` / `alternateName` から個人名を削除し
  「労働安全コンサルタント（登録番号260022）」に置換。
- `Organization.founder` および `WebSite.author` 内の Person ノードも同様に匿名化。
- 特商法表記の販売業者名は「ANZEN AI 事務局（労働安全コンサルタント 登録番号 260022・土木区分）」
  へ一旦更新（後続タスク 9 で再分割）。
- コミット: `chore: remove personal name and replace with professional title`

### Task 2: 経歴プロフィール改訂
- 対象ファイル: `web/src/app/(main)/about/page.tsx`
- 監修者カードを「資格 / 実務経験 / AI・DX 活用 / 専門分野 / 表彰実績 / 所属」の
  6 ブロック構成に再設計。
- 「NEXCO東日本 優良事例表彰」を削除し、「大規模プロジェクトで表彰実績あり」に置換。
- スーパーゼネコンでの大型インフラ施工管理を実務経験として記載（建設コンサルタント・NEXCO・大深度地下工事の表現は使用しない）。
- AI・DX 活用ブロックに Python / OpenAI API / Excel VBA / Claude Code を明記。
- コミット: `refactor(about): anonymize supervisor profile`

### Task 3: 特別教育ページ `/education` 新設
- 新規ファイル: `web/src/app/(main)/education/page.tsx`
- 安衛則第 36 条等に基づく特別教育 21 種をカード一覧で掲載。
  各カードに法的根拠（安衛則第○号 / クレーン則 / 酸欠則 等）と法定時間目安を表示。
- 受講形式を 3 つ（オンデマンド配信 ¥50,000〜 / カスタマイズ研修 ¥150,000〜 /
  講師派遣 ¥80,000〜）で提示。
- 末尾に `/contact` への CTA を配置。
- コミット: `feat: add /education page with 21 training programs`

### Task 4: 受託業務ページ `/services` 新設
- 新規ファイル: `web/src/app/(main)/services/page.tsx`
- 6 メニューを掲載（労働安全診断 ¥198,000〜 / KY・安全書類システム構築 ¥498,000〜 /
  Excel VBA 自動化 ¥198,000〜 / Web サイト・LP 制作 ¥498,000〜 /
  AI 活用研修・伴走支援 ¥298,000〜 / ドキュメント・マニュアル制作 ¥298,000〜）。
- Claude Code を活用した高速開発ハイライトセクションを上部に配置。
- コミット: `feat: add /services page for consulting and automation`

### Task 5: 月額顧問ページ `/consulting` 新設
- 新規ファイル: `web/src/app/(main)/consulting/page.tsx`
- 3 プラン提示：
  - 労働安全顧問プラン ¥150,000〜/月
  - AI・DX 顧問プラン ¥150,000〜/月
  - セットプラン（安全 + AI/DX） ¥250,000〜/月（おすすめバッジ付き）
- 各プランごとに含まれる成果物と支援範囲を箇条書きで明示。
- 契約条件（最低契約 6 か月、月末締め翌月末払い等）と無料 30 分面談 CTA を末尾に配置。
- コミット: `feat: add /consulting page with monthly retainer plans`

### Task 6: 問い合わせフォーム改訂
- 対象ファイル: `web/src/app/(main)/contact/ContactForm.tsx`
- 相談カテゴリを 7 種に再構成（労働安全コンサルティング / 特別教育 / 業務自動化 /
  Web サイト・LP 制作 / 月額顧問契約 / デモ・導入相談 / その他）。
- ご予算感（7 段階：〜20万 / 20〜50万 / 50〜100万 / 100〜300万 / 300万以上 /
  月額顧問希望 / 未定）と希望相談方法（オンライン / 電話 / メール / 対面）の
  セレクトを新規追加。
- mailto: フォールバックの本文も新フィールドを反映するよう修正。
  Formspree への POST は `...form` スプレッドで自動的に新フィールドを含む。
- プロフィールセクションは Task 1 で匿名化済み（土木区分の資格バッジに変更）。
- コミット: `feat(contact): add inquiry categories and budget fields`

### Task 7: トップページ・サイドバー・フッターへの導線追加
- 対象ファイル: `web/src/components/home-value-hero.tsx`,
  `web/src/components/app-shell.tsx`, `web/src/components/footer.tsx`
- ホーム下部に「ANZEN AI サービス」セクション追加。3 カード（受託業務 / 特別教育 / 月額顧問）。
- サイドバー（PC / モバイル共通）に「サービス」カテゴリを追加。
  Briefcase / GraduationCap / Handshake アイコンで 3 リンクを表示。
- フッターのナビゲーションに「受託業務 / 特別教育 / 月額顧問」のリンクを追加。
- コミット: `feat: add service links to home, sidebar, and footer`

### Task 8: SEO 対応
- 対象ファイル: `web/src/app/sitemap.ts`, `web/src/components/json-ld.tsx`,
  および 3 つの新ページ。
- `web/src/app/sitemap.ts` に `/services`, `/education`, `/consulting` を追加（priority 0.9）。
- `serviceSchema()` ヘルパーを `json-ld.tsx` に追加し、
  各ページで `<JsonLd schema={serviceSchema(...)} />` を埋め込み。
  - `/services` → `serviceType: ProfessionalService`, `priceFrom: 198000`
  - `/education` → `serviceType: EducationalService`, `priceFrom: 50000`
  - `/consulting` → `serviceType: ProfessionalService`, `priceFrom: 150000`
- 各ページの `metadata` に title / description / OpenGraph / Twitter / canonical を設定済み。
- コミット: `feat(seo): add metadata and structured data for service pages`

### Task 9: 特商法表記修正
- 対象ファイル: `web/src/app/(main)/about/page.tsx`
- TOKUSHO_ROWS を再構成：
  - 販売業者名: 「ANZEN AI 事務局」（資格情報を分離）
  - 運営責任者: 「労働安全コンサルタント（登録番号260022・土木区分）」
  - 所在地・連絡先: 既存どおり消費者庁ガイドラインに従い問い合わせフォーム誘導
  - 販売価格: 受託業務・顧問契約は別途見積を明示
  - 支払方法: 銀行振込（受託・顧問）／クレジットカード（サブスク準備中）
  - 支払時期 / サービス提供時期: 受託とサブスクで分けて記載
  - 返品・キャンセル: 役務提供を含む文言に拡張
- コミット: `fix(legal): update commercial transaction disclosure`

### Task 10: 監修範囲セクション調整
- 対象ファイル: `web/src/components/home-value-hero.tsx`,
  `web/src/app/api/og/route.tsx`, `web/src/app/(main)/about/page.tsx`
- サイト全体で監修者表現を「労働安全コンサルタント（登録番号260022）」へ統一。
  - ホームヒーロー上部のラベル
  - ホーム導入効果セクションの脚注
  - サービス導線セクションの説明文
  - OG 画像の固定サブタイトル
  - About ページ One Big Thing の本文
- コミット: `refactor: abstract supervisor section references`

## 屋号と法的位置づけの確認
- 屋号: ANZEN AI / ANZEN AI 事務局
- 監修者・運営責任者: 労働安全コンサルタント（登録番号 260022・土木区分）
- 個人名・振り仮名・ローマ字表記はサイトおよび JSON-LD から完全削除
- 旧経歴記述（NEXCO・建設コンサルタント・大深度地下工事・系列）はリポジトリ内のユーザー向けテキストから削除済み

## 検証
- `npx tsc --noEmit`: パス（タスク毎に実施）
- `npm run lint`: 既存の `react-hooks/set-state-in-effect` 警告 5 件と
  未使用変数警告 1 件（いずれも本タスクで触れていないファイル）
- `npm run build`: 成功。`/services`, `/education`, `/consulting` を含む
  全ページが Static prerender として生成されることを確認

## 残課題
- Formspree 経由送信時に新フィールド（budget / contactMethod）を Formspree のテンプレートにも
  反映するか、現状の JSON ペイロード受信で十分か運用判断が必要。
- 各サービスページの実例・お客様の声・FAQ は今後の充実が望ましい。
- `npm run lint` の既存エラー（`furigana-context.tsx`, `language-context.tsx`,
  `easy-japanese-context.tsx`, `app-shell.tsx`, `chat-service.ts`）は本タスクの範囲外。
