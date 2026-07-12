# マスコット画像 継続運用手順（2026-07-12 初版）

「キューに積む→自動生成→キュレーション→配置」を次回以降も回すための正本。
キャラ仕様の正は `docs/mascot-style-guide-2026-07-12.md`。パイプライン実体は `scripts/imagegen/`。

## 0. 前提（picリポジトリから吸収した知見）

- 自動化専用Chrome（`C:\Users\kanet\chrome-automation\profile`・CDP :9222）に
  `connect_over_cdp` で接続する。起動は `C:\Users\kanet\20260522\pic\scripts\start_chrome_cdp.bat`。
  **オーナーの普段のChromeプロファイルには触れない。自分が開いたタブのみ操作。**
- ログイン状態はプロファイルに永続化されている（2026-07-12実測: ChatGPT・Geminiとも生きており人手ログイン不要だった）。
  切れていた場合のみ `start_chrome_cdp.bat login` で人手ログイン1回。
- 64bit Python必須: `py -3.12`（PATHのpythonは32bitでPlaywright不可）。
- 人間的ペース厳守: 資産間・試行間に45〜75秒の乱数待ち。直列実行。上限・拒否はリトライで粘らず記録して次へ。

## 1. 運用サイクル

```powershell
# 1) キューに積む: scripts/imagegen/queue.json の assets に追記
#    （pose=ポーズ文・spec.use=置き先・status="pending"。基準プロンプトが自動で前置される）

# 2) 生成（CDP Chromeが起動していること）
py -3.12 scripts\imagegen\run_queue.py               # pending全消化
py -3.12 scripts\imagegen\run_queue.py --only <id>   # 指定のみ
py -3.12 scripts\imagegen\run_queue.py --smoke       # 疎通確認

# 3) キュレーション: scripts/imagegen/output/<id>/ のPNGを目視し、
#    meta.json の curation に approved/rejected/backup と理由を記録
#    （合格条件はスタイルガイド§4: 同一性・スタイル・緑十字・透過・用途適合）

# 4) 加工→配置
py -3.12 scripts\imagegen\process.py --src scripts/imagegen/output/<id>/<file> `
    --dest web/public/mascot/mascot-<name>.webp --max 320 --quality 70 --budget-kb 30

# 5) 組み込み: web/src/components/mascot.tsx の VARIANT_MAP に実寸で登録し、
#    <Mascot variant="..."> で配置。全imgにwidth/height明示（CLS 0）
```

## 2. 実測で得た勘所（2026-07-12 第1弾＝ChatGPT 6資産12枚・採用6・再生成予約1）

- **参照画像添付が同一性の生命線**。テキストのみだと別犬になる（Gemini参照なし比較で実証）。
  ChatGPTは `input[type=file]` へ `set_input_files` で添付可能（アップロード完了まで約4秒待つ）。
- **ChatGPTの生成画像srcは `oaiusercontent` 固定ではない**（backend-api経由あり）。
  検出はsrcパターンでなく natural寸法閾値（≥500px）で行う。
- **参照エコー問題**: 送信メッセージ内の添付サムネイルがフル解像度でDOMに現れ、
  生成物として誤保存されうる（バイトサイズが参照と完全一致）。ランナーの
  参照エコーガード＋DOM後方優先保存で自動排除。キュレーションでも必ず目視。
- **複数行プロンプトは `keyboard.insert_text` で一括挿入**（type()だと改行=Enter解釈が環境依存）。
- **1回の生成は約60〜90秒**（ChatGPT）。タイムアウトは600秒に設定。中断しても
  会話はサーバ側で継続するので `collect_conversation.py <会話URL> <資産ID>` で回収できる。
- **白い十字の描き落とし**が起きうる（point-check初回で暗色化）。ポーズ文に
  「ヘルメットの十字は必ず白」と明記し、キュレーションで検品する。
- **Gemini（参照添付なし・参考値）**: 造形は綺麗だが別個体になり、透過指定で
  偽の市松模様背景を描くことがある。キャラ素材はChatGPT主力、Geminiは
  参照添付対応（+メニュー経由のアップロード）を実装してから再評価する。
- ChatGPTのサイドバー「ライブラリ」のプレビュー画像（過去生成物）が収集網に
  かかることがある → baseline記録とキュレーションで排除。

## 3. 重量・品質予算（不可侵）

- 装飾スポット ≤30KB / ヒーロー ≤60KB（webp, alpha, 表示サイズの2倍以下）
- Lighthouse Performance/Accessibility 90+ 維持、CLS 0 維持（width/height明示・lazy）
- JIS安全色の意味論・コントラストAA・3秒無読（サイネージは隅の小型のみ）・A4帳票不可侵

## 4. 次に作るべき資産（推奨キュー・queue.jsonにstatus="backlog"で積載済み）

1. `ky-writing` KY記入中 → KY用紙の空状態（/ky）
2. `water-break` 水分補給 → 熱中症WBGT記録簿（/heat-illness-prevention/log）
3. `tamakake-signal` 玉掛け合図 → e-learning玉掛け・事故DB
4. `seasonal-summer` 夏版 → トップの季節演出
5. （提案）`error-500` 工具を持って修理中 → 500系エラーの differentiation
6. （提案）`sleeping` お昼寝 → メンテナンスページ
7. （提案）Gemini参照添付対応後、`bow`/`thinking` をGeminiで再比較し使い分けを最終決定

## 5. トラブルシューティング

- CDP不通(9222) → `C:\Users\kanet\20260522\pic\scripts\start_chrome_cdp.bat` を実行（勝手にChromeをkillしない）
- `no input box`/セレクタ不一致 → output/<id>/ の *_noimg_*.png スクショを見てセレクタ更新
- 上限（QUOTA_RE検知）→ そのサイトの残り資産は自動スキップされる。時間を置いて再実行（resumeが効く）
- 生成が途中で切れた → 会話URLを控えて `collect_conversation.py` で回収
