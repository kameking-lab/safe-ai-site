# Chatbot mobile UI before / after（2026-08-03）

基準viewportは390×844。追加境界は320px、390px、768px、1024px、1440px、mobile keyboard相当、200%・400%相当とした。

| 項目 | 本番baseline | 改修後 |
| --- | --- | --- |
| 初回質問 | 回答前の分類質問と大きな選択肢 | 有用な暫定回答を先に表示 |
| follow-up | 電気の文脈を失い別カテゴリへ飛躍 | 同一タブmemory-onlyで電気条件へ結合 |
| assistant message | 白い巨大カードと長い注意 | 1本の会話、短い結論、条件最大3件 |
| 選択肢 | 青い全幅ボタン | 回答後だけの44px以上compact chip、最大3件 |
| 根拠 | 回答と競合 | 初期状態は`details`、条・項・号・施行状態・公式原文を表示 |
| 回答操作 | 複数の大きな操作 | 公式原文・条件追加を中心に最大2件（契約上限3） |
| composer | bottom nav・Cookie操作と近接 | 会話領域から分離し、mobile keyboard・400%時も操作可能 |
| Cookie | composer周辺へ重なる | `/chatbot`では任意Cookie controlと第三者scriptを表示しない |
| 新しい会話 | 大きな主操作 | ヘッダー内の小さな44px操作 |
| badge・注意 | 主見出しと競合 | 「安衛法AI」を主見出しにし、modeを小表示、注意は1行 |

2026-08-08の実ブラウザー結果:

- 固定12会話ケース: 4 Playwright test / 12 case PASS。
- 回答操作最大2、quick reply最大3、確認質問最大1。
- 320〜1440pxおよび400%相当でhorizontal overflow 0。
- chatbot composerとbottom nav等のoverlap 0。
- forced colors、reduced motion、keyboard、JavaScript無効をPASS。
- 通常時警告カード0。緊急・PII・取得不能等は発生時だけ`role=alert`で表示する。

自由入力は常に利用でき、chipの選択を回答継続の必須条件にしない。
