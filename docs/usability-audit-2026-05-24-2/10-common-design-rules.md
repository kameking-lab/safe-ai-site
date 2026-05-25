# 10. 全体共通改善ルール(設計パターン整理)

> 個別問題の集計からサイト全体の設計パターンを抽出。
> 入力フォーム/結果表示/関連機能への動線のそれぞれで「共通すべきルール」を提示。

---

## ルール1: 入力フォーム設計

### 現状の問題パターン
- 必須/任意の区別が機能によって異なる(safety-diary は緑バッジ明示、KY は皆無)
- フォーム最上部に「業種選択」がないため、業種別最適化が遅れる
- 6名分・12項目・8セクションなど「初期値が過大」(KY 6名・plan-generator 規模 medium)

### 共通すべきルール
1. **「必須 X/N」緑バッジを冒頭に**(safety-diary `diary-form-required.tsx:229,261,280,323,361` の方式を全機能に展開)
2. **業種選択は最初のステップに**(URL `?industry=construction` で自動プリフィル可能にする)
3. **初期値は「中央値」より「最小値」**(KY参加者3名・規模 small デフォルト → 大半のユーザーがそのまま使える)
4. **アコーディオン化**(任意項目は折りたたみで初期非表示・タップで展開)
5. **進捗ステップバー**(/ky 4ラウンド、/strategy/plan-generator 6セクションは現状ナシ)
6. **「昨日コピー」ボタン**(KYで実装済、他にも展開)

### 適用機能
- /ky(参加者数・必須バッジ・ステップバー)
- /strategy/plan-generator(規模デフォルト・アコーディオン・ステップバー)
- /safety-diary(維持・他機能の手本)
- /chemical-ra(混合RAのピッカー設計)

---

## ルール2: 結果表示設計

### 現状の問題パターン
- 1画面に14セクション/17色/9ブロック等の情報密度過多
- 優先順位なしの縦積み(/accidents-reports/[industry])
- 出典バッジが17色混在(/chatbot)
- ローディング状態がドット3つ等の簡易表示のみ

### 共通すべきルール
1. **「最初に見えるべき3項目」をタブで明示**(タブ化 = 「直近7日」「事故型」「対策」など)
2. **色の意味を統一**(以下を全機能で固定)
   - **エメラルド**: メインCTA・出典・OK
   - **スカイ**: 関連リンク・参考情報
   - **ロゼ**: 警告・拘束力あり通達
   - **アンバー**: 注意・任意項目
   - **スレート**: 補助テキスト
3. **入力即時表示(useMemo)を主要ツールで**(WBGTで実装済、化学RAや計画ジェネレータに展開)
4. **ストリーミング/進捗バー**(3秒以上待機するボタンには必ず進捗または予測秒数)
5. **「14セクション縦積み」を禁止**(タブまたはアコーディオンで5項目以内に圧縮)

### 適用機能
- /chatbot(17色→主要3色、出典折りたたみ)
- /accidents-reports(タブ化・直近フィルタ追加)
- /strategy/plan-generator(ライブプレビュー、進捗バー)
- /signage(カウントダウン表示)

---

## ルール3: 関連機能への動線設計

### 現状の問題パターン
- ホーム最下段に最重要バナー(/for/construction)
- /accidents 3兄弟(accidents/accidents-reports/accidents-analytics)の役割不明
- 通達2系統(/circulars vs /laws/notices-precedents)
- /e-learning と /education の意味重複
- 横断する CopilotStepNav が「Copilot」の語彙を強要

### 共通すべきルール
1. **「ヒーロー直下に最重要バナー」**(/for/[業種] のような分岐ガイド)
2. **「兄弟ページはタブ化」**(URL `?view=` で見せ方を切り替え、別ルートにしない)
3. **「同義機能は統合し、片方を301」**(/qa-knowledge → /faq, /education-certification → /education 等)
4. **「Copilot等の独自概念」は最初に短く説明**(または除去)
5. **「3ピラー」「FlagshipGrid」「業種別」など同種ナビパターンは1か所に集中**(現状は3層重複)
6. **「関連リンクは結果ブロックの末尾に最大4個」**(現状は2セットのRelatedPageCardsで8個)

### 適用機能
- /(ホーム): 建設業バナー昇格、3層重複解消
- /accidents 3兄弟: タブ化
- /e-learning + /education + /education-certification: 統合
- /chatbot: CopilotStepNav/Memo 退避
- 全機能: 関連リンク数 4個以内

---

## ルール4: コピー(数値・命名)の正確性

### 現状の問題パターン
- 計画ジェネレータ「10業種」/実装13業種
- 化学物質RA「8,400物質超」/実装約3,700
- /accidents-reports「5,000件超」/業種別表示は1,670等
- /e-learning「全36テーマ」「32分野・計222問+入門20問」/コード上は CATEGORY=37と不整合

### 共通すべきルール
1. **数値はコードから自動算出**(`INDUSTRY_LABELS` の Object.keys().length のように)
2. **JSON-LD/OG/featureList を含む全箇所をテストでチェック**(SEOテキスト乖離チェック自動化)
3. **「集計総計」「個別実例」「公式数値」を明確に区別**(accidents-reports の例: 「5,000件超(集計総計)」「1,670件(curated事例)」)
4. **命名は職長語彙に合わせる**(「Copilot」「Pillar」など官庁外来語は避ける)
5. **URL命名は機能を直接的に表す**(/qa-knowledge 空ページのような「中身予測不可能」は禁止)

### 適用機能
- /strategy/plan-generator(13業種訂正)
- /chemical-ra(約3,700訂正)
- /accidents-reports(件数表示の文脈明示)
- /e-learning(テーマ数訂正)
- 全機能: SEO数値の正確性チェック

---

## ルール5: 過去履歴・進捗保存の共通化

### 現状の問題パターン
- KY/日誌は localStorage v3 で保存
- 計画ジェネレータは「最新1件」のみ
- /e-learning は受講者進捗未保存(講師問題編集のみ保存)
- WBGT/R7チェック/面接指導は未保存
- /community-cases はサーバメモリで永続化されない

### 共通すべきルール
1. **「localStorage 進捗保存」を全主要ツールに**(共通フォーマット `safe-ai:[feature]:v[N]`)
2. **「過去N件保存」**(最低3件、推奨5件) で前回比較を可能に
3. **「エクスポート/インポートJSON」を統一**(機種変更時のデータ移行)
4. **「クラウド同期」は機能ごとに段階的**(まずはローカル保存を必須に)
5. **「永続化必須機能」は Supabase 接続(UGC・修了証・課金関連)**

### 適用機能
- /strategy/plan-generator(過去3件保存)
- /e-learning(受講者進捗)
- /heat-illness-prevention/wbgt-calculator(履歴1週間)
- /heat-illness-prevention/r7-compliance(チェック状態)
- /mental-health-management/interview-guidance(面談記録)
- /mental-health-management/small-business(9ステップ進捗)
- /community-cases(Supabase永続化)

---

## ルール6: PDF出力の品質基準

### 現状の問題パターン
- 全機能で `window.print()` 依存
- iOS Safari の改ページ破綻リスク
- 印鑑欄・ロゴ枠なし
- 衛生委員会審議用としてそのまま使えない

### 共通すべきルール
1. **「現場で使える」体裁を主要ツールで担保**(印鑑4枠+ロゴ画像URL入力)
2. **「window.print()」だけでなく react-pdf 構造化出力**を主要1機能で実装→他に展開
3. **「A4縦1枚に収まるよう」` @media print` ルール厳格化**
4. **「QR出力」で現場掲示物との接続**
5. **「Word/Excel出力」(.docx/.xlsx)を法人向け機能として段階展開**

### 適用機能
- /strategy/plan-generator(印影4枠+ロゴ→他に展開の基準)
- /ky(署名PNG埋め込み確認+A4収まり再検証)
- /safety-diary(月次・年次レポートPDF)
- /heat-illness-prevention/r7-compliance(PDF品質)
- /mental-health-management/interview-guidance(面接指導書PDF)

---

## ルール7: モバイル375px最適化

### 現状の問題パターン
- ホームのa11yバナー+ヒーローでファーストビュー占有
- /chatbot のlaw badges 33個でFV破綻
- /ky 1605行縦長、参加者署名6名を順次タップ
- /accidents-reports rechartsの凡例折返し

### 共通すべきルール
1. **「ヒーロー高さは画面50%以下」**(FVに主要CTA最低1個が見える)
2. **「アコーディオンで縦長を圧縮」**(法令バッジ・任意項目・関連リンク)
3. **「48px以上のタップ領域」**(MobileBottomNav `.tap-target` の方式を全インタラクションに)
4. **「lg以上のみ表示」のサイドペインを禁止**(/ky の右ペインプレビューはモバイルでも見える形に)
5. **「`grid-cols-1 sm:grid-cols-2`」**(375pxでCTA縦並び→sm以上で2列)

### 適用機能
- /(ホーム): 3層重複解消、CTA縦並び→2列
- /chatbot(法令バッジアコーディオン化)
- /ky(縦長分割、参加者カードを 1名→3名→6名の段階表示)
- /accidents-reports(rechartsの凡例折返し対策、375pxレイアウト)

---

## ルール8: ナビゲーション情報設計

### 現状の問題パターン
- グローバルナビ 10カテゴリ40+項目
- モバイルボトムナビ 5タブ(妥当)+ もっとシート 5項目
- FlagshipGrid 10カードと NAV_CATEGORIES の重複
- /quick + /quick-start + /signage の役割重複

### 共通すべきルール
1. **「グローバルナビは6カテゴリ20項目以内」**(質問/記録/分析/学ぶ/業種別/管理)
2. **「モバイルボトムナビは5タブ固定」**(現状の構成維持: ホーム/KY/AIチャット/日誌/もっと)
3. **「もっとシートは3列2行=最大6項目」**(現状5項目+空1スロット → 「条文番号」「サイネージ」追加で埋める)
4. **「FlagshipGrid と NAV を二重管理しない」**(片方を主、もう片方を従に)
5. **「業種別ナビは別系統」**(/for/[業種] と /industries/[業種] の役割明示)

### 適用機能
- app-shell.tsx(NAV_CATEGORIES 圧縮)
- MobileBottomNav.tsx(もっとシート6項目化)
- FlagshipGrid(10→8カード)
- /quick + /quick-start 統合

---

## ルール9: 出典・データソース表示

### 現状の問題パターン
- /chatbot の出典バッジは詳細だが17色混在で見にくい
- /accidents-reports は「死亡災害DB中心」と注釈あるが小さい
- /chemical-database は数値ありが251物質のみで「データ未登録」表示頻発
- /circulars 詳細ページに本文なし

### 共通すべきルール
1. **「出典の3点セット」(法令名+施行日+発出機関)を全機能で**(/chatbot の方式を展開)
2. **「件数表示は集計種別を明示」**(集計総計/個別実例/公式数値を区別)
3. **「データ未登録」時は代替情報源を提示**(化学物質ばく露値: 「公式値: MHLW告示251物質 / 学会値: ◯◯」)
4. **「外部リンクは公式URLを必ず併記」**(e-Gov, jaish.gr.jp, MHLW公式)
5. **「拘束力バッジ」(binding/indirect/reference)を通達系全機能で**(/circulars で実装済)

### 適用機能
- /chatbot(出典バッジ統一)
- /accidents-reports(件数注釈の視認性向上)
- /chemical-database(代替情報源)
- /circulars(本文プレビュー追加)

---

## ルール10: アクセシビリティと言語切替

### 現状の問題パターン
- ふりがな/文字大ボタンが app-shell の2箇所に重複(`:476-505` と `:561-621`)
- 英語切替の対応度が機能によってばらつき
- a11y バナーが ホームFVを占有

### 共通すべきルール
1. **「アクセシビリティ機能(ふりがな/文字大/コントラスト)は1か所に集約」**(ヘッダ右肩)
2. **「英語版は主要機能のみ用意」**(/chatbot, /heat-illness-prevention 等。長期にメンテ可能な範囲)
3. **「a11y ヒントバナーは折りたたみ初期値+dismissible」**(既に実装済の精密化)
4. **「lang属性とaria-label」全機能で厳密に**

### 適用機能
- app-shell.tsx(ふりがな/文字大の重複解消)
- 英語切替対応の優先順位確定

---

## ルール適用優先順位

| ルール | 優先 | 工数推計 |
| ------ | ---- | -------- |
| ルール4(コピー正確性) | **P0** | 3h(数値訂正のみ) |
| ルール5(過去履歴) | **P0** | 32h(主要4機能) |
| ルール2(結果表示色統一) | **P0** | 12h(chatbot+accidents-reports) |
| ルール3(動線整理) | **P0** | 28h(統合・削減) |
| ルール8(ナビ整理) | **P0** | 8h |
| ルール6(PDF品質) | **P1** | 16h(基準実装) |
| ルール1(入力フォーム) | **P1** | 12h |
| ルール7(モバイル375px) | **P1** | 12h |
| ルール9(出典・データソース) | **P2** | 12h |
| ルール10(a11y/言語) | **P2** | 8h |

P0ルール5件で 83h(約10営業日) → サイト全体の設計品質が一段上がる。

---

## 「設計原則」最終3行サマリ

1. **コピーは実装と一致**(数値・命名・URL は実装をテストする)
2. **入力即時表示+進捗可視化**(useMemo, ストリーミング, 進捗バー)
3. **機能は重複させず、関連は4個まで**(統合・タブ化・削減で IA を整理)

これら3行を全機能で適用すれば、追加機能を作らなくてもサイトの体験は劇的に上がる。

---

# Day 1-4 で確立した実装パターン (2026-05-24 追記)

Day 1-4 で P0 22 件を解消する過程で、複数機能に横断的に使える設計パターンが確立した。今後の機能追加・改修ではここに列挙したパターンを優先的に再利用すること。

## パターンA: localStorage 永続化テンプレート

**確立箇所**:
- `web/src/lib/safety-plan/history.ts` (P0-006: 計画ジェネレータ過去 3 件)
- `web/src/lib/elearning/progress.ts` (P0-014: 受講者進捗)
- `web/src/lib/favorites.ts` (P0-016: 法令お気に入り 50 件)
- `web/src/lib/safety-diary/from-ky.ts` (P0-010: KY → 日誌転記)

**共通骨格**:
```ts
const STORAGE_KEY = "safe-ai:{feature}:v1"; // namespaced
function safeRead(): T[] {
  if (typeof window === "undefined") return []; // SSR
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(typeGuard) : [];
  } catch {
    return []; // パース失敗は黙って空配列
  }
}
function safeWrite(data: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // quota / disabled — drop silently
  }
}
```

**設計判断**:
- キー名は `safe-ai:{feature}:v1` で namespace を切る。スキーマ変更時は v2 にバンプ
- 上限は機能別: 計画 3 件 / 進捗 無制限 / お気に入り 50 件 / KY 1件 (最新)
- 型ガード必須 (古いバージョンの破損データから保護)
- SSR `typeof window === "undefined"` チェックを最初に行う

## パターンB: 副作用専用 Client Component

**確立箇所**:
- `web/src/components/safety-plan/plan-history-saver.tsx` (preview 表示時に history append)
- `web/src/components/copilot/CopilotPlanSync.tsx` (既存・参考)

**用途**: Server Component の preview ページから「localStorage に記録だけ」したい時、Client Component で `useEffect` を使ったマウント時副作用を起こすが UI 出力は `return null`。Server/Client 境界を最小限のコードで橋渡しできる。

## パターンC: 履歴ゼロ時非表示の進捗ボード

**確立箇所**:
- `web/src/components/elearning-progress-board.tsx` (受講ゼロ時非表示)
- `web/src/components/safety-plan/plan-history-picker.tsx` (履歴ゼロ時非表示)

**設計**:
```tsx
useEffect(() => {
  setList(loadList()); setHydrated(true);
}, []);
if (!hydrated) return null;
if (list.length === 0) return null; // 初回ユーザーには非表示
```

**意図**: 初回ユーザーには UI を見せず、継続利用者にだけ進捗・履歴を表示する。これにより「画面が空に見える」状態を回避しつつ、邪魔な要素を増やさない。

## パターンD: SSE ストリーミング応答

**確立箇所**: `web/src/app/api/chatbot/stream/route.ts` (P0-001)

**骨格**:
```ts
const stream = new ReadableStream<Uint8Array>({
  async start(controller) {
    const send = (event: string, data: unknown) => {
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
    };
    send("progress", { step: "..." });
    // ... Gemini streaming via generateContentStream ...
    for await (const chunk of streamResult.stream) {
      send("text", { chunk: chunk.text() });
    }
    send("meta", finalPayload);
    controller.close();
  }
});
return new Response(stream, {
  status: 200,
  headers: {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  },
});
```

**フロント側**: ReadableStream + TextDecoder で `\n\n` 区切りパース → event: 行と data: 行を取得 → JSON.parse で payload 復元。失敗時は従来 JSON エンドポイントに自動 fallback。

## パターンE: 引用フォーマットの中央化

**確立箇所**: `web/src/lib/favorites.ts` の `formatArticleCitation` / `formatNoticeCitation` (P0-016)

**形式**:
- 条文: 「{本文}」（{法令名(短縮名)}{条番号}、出典: {e-Gov URL}）
- 通達: 「{タイトル}」（{発出機関}、{番号}、{日付}、出典: {URL}）

**意図**: 報告書執筆・監督官対応で「コピー → 貼り付け」しても出典が損なわれない形式を 1 箇所で管理。複数 UI (FavoriteButton/CopyCitationButton/将来の PDF 出力) で同じ整形が使える。

## パターンF: 共通 Client Button (compact/normal バリアント)

**確立箇所**:
- `web/src/components/favorites/favorite-button.tsx`
- `web/src/components/favorites/copy-citation-button.tsx`

**設計**:
```tsx
type Props = { variant?: "compact" | "normal"; ... };
// compact: アイコンのみ 28×28 (アクション列に並べる)
// normal: アイコン + ラベル (主要 CTA)
```

**意図**: 同じ機能を「カードのメタ行 (compact)」と「ヘッダ CTA (normal)」の両方で使えるよう、サイズだけ切替。SSR 中は OFF 状態 → hydration で正しい状態に updates する `useState<bool>(false)` 初期値を統一。

## パターンG: 業種コンテキスト付き機能起動

**確立箇所**: `web/src/components/industries/today-three-cta-band.tsx` (P0-018)

**設計**:
- 業種ハブ (`/industries/[industry]`) の hero 直下に 3 CTA カード固定配置
- 各機能へのリンクに `?industry={slug}` を付与 → 機能側で受信時に業種プリセット自動適用
- データソース別マッピング:
  - `/accidents-reports/{accidentAnalysisSlug}` (5業種は専用、残5業種は `/accidents?industry=X` fallback)
  - `/ky?industry={slug}` (業種プリセット起動)
  - `/strategy/plan-generator?industry={plan-slug}` (CONTENT_TO_PLAN_INDUSTRY マップで変換)

**意図**: 業種ハブから当日業務 (KY/事故/計画) へ「業種が明らかに分かってる状態」で 1 タップ起動。各機能側の業種選択を省略する。

## パターンH: 折りたたみで「初見ユーザー保護 + 継続利用者の機能温存」

**確立箇所**:
- `web/src/app/(main)/chatbot/ChatbotBody.tsx` (P0-020: CopilotStepNav/Memo を `<details>` で退避)
- `web/src/components/chatbot-panel.tsx` (P0-019: relatedLaws / digDeeperLinks を `<details>`)

**設計**:
```tsx
<details className="mt-N rounded-XL border-{color}-200 ...">
  <summary className="cursor-pointer font-semibold ...">
    {初見でも意味が分かる説明文} ({件数}件)
  </summary>
  <div className="mt-2 ...">{詳細 / 内部コンポーネント}</div>
</details>
```

**意図**: 「ファーストビューを軽くしたいが、機能は残したい」状況で活用。`<summary>` に件数バッジを入れて、折りたたみ前でも情報量を知らせる。SSR でも動作する (`useState` 不要)。

## パターンI: 「コピーは実装と一致」自動化テスト

**確立箇所**:
- `web/src/lib/regulation-tag-labels.test.ts` (P0-009: 17 タグ全件確認)
- `web/src/lib/safety-plan/history.test.ts` (P0-006: 過去保存)
- `web/src/lib/favorites.test.ts` (P0-016: 50 件上限)

**設計**: コピー (UI 表示文字列) と実装値 (配列長・定数) を test で結びつけて、片方を変更したら test が落ちる仕組み。Day 1 で発覚した「10業種 vs 13業種」「8400物質超 vs 約3700」のような乖離を二度と起こさない。

---

# 設計パターン適用ガイドライン (Day 5 以降の機能追加用)

1. **新規 localStorage 機能** → パターン A を踏襲。新規 lib に `STORAGE_KEY` 定数・型ガード・SSR 対応を必ず含める。テスト 5+ ケース必須。

2. **新規 Server → Client サイド副作用** → パターン B (副作用専用コンポーネント) を使う。Server Component から渡せる props で動かす。

3. **新規進捗・履歴 UI** → パターン C (履歴ゼロ時非表示) を踏襲。初回ユーザー邪魔せず、継続利用者にだけ価値を提供する。

4. **新規 LLM 連携** → パターン D (SSE ストリーミング + JSON fallback) を踏襲。/api/chatbot/stream をテンプレに。

5. **新規コピー機能** → パターン E (中央化) を使う。lib に formatXxxCitation を新規 export 追加。直接 UI コンポーネント内でフォーマットしない。

6. **新規 ON/OFF トグルや軽量 CTA** → パターン F (共通 Button compact/normal バリアント) を踏襲。

7. **新規業種別機能** → パターン G (業種コンテキスト付き起動) を踏襲。?industry={slug} を受信できるよう機能側で前提に。

8. **新規補助 UI** → パターン H (`<details>` 折りたたみ + 件数バッジ) を使う。ファーストビューを軽くする。

9. **新規データ表示** → パターン I (コピーと実装値を test で結びつけ) を必ず書く。Day 1 のような乖離を二度と起こさない。
