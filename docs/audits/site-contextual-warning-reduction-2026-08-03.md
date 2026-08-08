# Site contextual warning reduction（2026-08-03）

## 方針

通常時の長い免責、技術説明、評価指標、同じ注意の反復を主操作前から外し、状態・結果・入力を先にした。安全境界は削らず、緊急、取得不能、古い情報、条件不足、未確認時だけ文脈に沿う短い警告を出す。

| 対象 | 主な変更 | 維持した安全境界 |
| --- | --- | --- |
| `/` | 法令AI quick askを入力中心にし、重複PII文を削減 | 取得不能・stale時だけ状態表示 |
| `/chatbot` | 注意をcomposer付近の「個人情報は入力しない」1行へ集約 | 緊急・PIIを検索や外部AIより前で遮断 |
| `/law-search` | 例示chipを3件へ制限 | 施行状態・公式原文 |
| `/risk` | 状態と現場行動を先に表示 | JMA/Open-Meteoの取得不能・stale境界 |
| `/chemical-ra` | 入力と判定を先に表示 | SDS/CAS、未確定、DB unavailable境界 |
| `/ky/paper` | 空状態説明の反復を削減 | offline、draft、PDF境界 |
| 事故・事故報道 | filter前の説明を削減 | provenance、synthetic、quarantine境界 |
| 法改正 | 「今やること」を先に表示 | 公式原文・施行状態 |
| Visual KYT | 見出しとscenario導線を短縮 | 安全な回答・進行境界 |
| `/services/automation` | 主操作を1件に整理 | dry-run、送信fail-closed |
| `/safety-ai` | heroの主従を整理 | サービス状態表示 |

## 実測copy budget

2026-08-08のブラウザー監査は16画面を対象にした。

- 主操作前文字数: 最大104文字（上限120）。
- chatbot初期説明: 6文字、主操作前70文字（上限80）。
- 通常時警告カード: 全画面0。
- 重複注意文・内部評価語・主画面のforbidden term: 0。
- responsive対象10画面の320、390、768、1024、1440px: overflow 0。
- `/chatbot`、`/chemical-ra`、`/risk`の200%・400%相当: overflow 0。
- JavaScript無効は12画面、forced colors・reduced motionは`/chatbot`: PASS。

通常画面から外した詳細は既存の品質・出典・注意事項ページへ集約し、回答ごとに免責を繰り返さない。
