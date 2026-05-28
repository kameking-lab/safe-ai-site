# 05. 回答UX

監査方法: `chatbot-panel.tsx`（約1,240行）・SSEルートのコード解析。

## 5.1 回答の構造化・読みやすさ

- 結論先頭・断定形＋条番号併記をsystem promptで強制（`chatbot-prompt-builder.ts:128`）。回答構造は良好
- **Markdownは`**bold**`のみ自前パース**（`chatbot-panel.tsx:735`）。箇条書き・見出し・リンクは生テキスト表示 → 長い回答の可読性が落ちる（P1）

## 5.2 引用元の明示性（強み）

- sources（条文全文トグル・e-Govディープリンク）、citations（出典トリプル: 条番号＋施行日＋発出機関）、relatedLaws、attachedNotices/Leaflets（原文URL付き）まで多層に明示
- **出典の明示性は競合の汎用LLMを圧倒**。労働安全コンサル業務での提示に耐える水準

## 5.3 「分からない」を正直に伝える設計（強み）

- confidence<0.5で「条文を十分な確信度で特定できませんでした→e-Gov案内」のdegraded応答
- Layer2で架空/範囲外引用を検出すると警告追記＋信頼度降格
- 範囲外法令参照・未接地表現の警告
- **過剰主張を避ける設計が徹底**しており信頼性は高い

## 5.4 ストリーミング応答

- SSE（progress→text逐次→meta）。`requestAnimationFrame`で自動スクロール（Lighthouse対応済）
- 失敗時は非stream JSONへfallback、それも失敗でエラーバナー＋placeholder除去。**二重フォールバックは堅牢**

## 5.5 UXの弱点（→doc13）

1. **【P1】停止/中断ができない**: AbortControllerなし・停止ボタンなし。長文生成中はUIロック（`isSending`で入力不可）
2. **【P1】失敗ターンの再試行がない**: 全失敗時はplaceholder削除＋汎用バナーのみ。ユーザは再入力必須
3. **【P1】アクション過多**: 全assistantメッセージに6色のピル＋digDeeper＋relatedLaws＋nextActionsが出る。「3色システム」整理コメントと矛盾し、モバイルでスクロール負荷大
4. **【P2】外部誘導のプレフィルが雑**: KY/化学物質RA/法令検索への`?q`/`?name`が`answer.slice(0,40/80)`＝AI文の途中切れ。ユーザの質問文や抽出エンティティを使うべき
5. **【P2】共有がlossy**: base64 URLで`law`+`article`のみ残り、citations/notices/leaflets/followups/confidenceが脱落。長会話はURL長制限risk
6. **【P2】音声モードの無言劣化**: TTS400字truncate・認識エラーを握り潰し（`onerror=()=>{}`）でユーザに無通知
7. **【P3】エクスポート/履歴メニューに外側クリッククローズなし**

## 5.6 結論

**信頼性・出典明示のUXは完成度が高く、競合優位の核**。一方、操作系UX（停止・再試行・アクション整理・プレフィル品質）に手を入れると完成度が一段上がる。P1の停止/再試行は法令リスクなく実装可能で費用対効果が高い。
