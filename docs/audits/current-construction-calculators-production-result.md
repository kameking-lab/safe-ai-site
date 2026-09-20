# 建設計算ツール Production Result

- 判定基準日: 2026-08-27 JST
- 本番反映時刻: 2026-08-27 22:13 JST
- 判定: GO（open P0 0件 / P1 0件 / 計算式・単位・丸めの未解決P2 0件、rollback不要）
- 直前Production deployment: `dpl_EintUWC6vRx5FSr2Fo7vEvjxeSvw`
- 新Production deployment: `dpl_9FjmKJczmp6m61kMSPyLfQpbM6o6`
- Production URL: `https://www.anzen-ai-portal.jp/tools/construction-calculators`
- 採用Preview: `dpl_BbDA82yQxfVU3s1w6RNgW22AZ6Xu`
- Release tag: `production-ai-training-construction-tools-20260827`

## 公開範囲

- コンクリート数量、掘削・埋戻し、平均断面法、土量変化・ダンプ、砕石・路盤、アスファルト、鉄筋重量、配筋ピッチ、型枠面積、勾配・角度・斜長、排水勾配、縮尺・座標の12計算を公開した。
- Coming Soon 23候補は折りたたみ一覧だけとし、個別URL・空ページ・CTA・sitemap URLは作成していない。
- 高リスクなクレーン能力、足場許容荷重、支保工、土留め、擁壁、法面安定、電線選定、構造設計、安全可否判定、法令適合判定は0件。

## 計算式・UI・プライバシー

- Formula Registry、純粋関数、手計算fixtureを正本化し、UI、コピー、印刷PDF、CSV、履歴は同じ`CalculationResult`を使用する。
- 公式資料と独立導出により、12計算の正常例、単位変換、0、負数、極端値、NaN、Infinity、丸め、整数境界、各個別条件を143/143 fixtureで照合した。
- mm/cm/m、kg/t、m²/m³、0〜6桁、四捨五入・切上げ・切捨てに対応し、明示的な「計算する」操作まで結果を確定しない。
- 結果付近に概算表示、使用入力、式、丸め、ロス率・密度、仮定を示し、安全・適合・設計確定・発注保証の表現は使用していない。
- 履歴は`localStorage`だけに31日・最大20件を保存し、個別・全削除を提供する。URL、サーバー、analytics、RUMへ入力値を送信しない。

## 最終ゲート / Preview / Production

- TypeScript PASS。ESLint error 0（既存warning 29）。全Vitest 7,571 PASS / 2 skip。全Playwright 281 PASS / 1 intended skip。Production build 3,443ページPASS。npm audit 0。
- Lighthouse 24/24 run PASS。計算一覧mobile Performance 95、代表計算mobile 95、desktop Performance 100、Accessibility / Best Practices / SEOは全対象100。
- 独立レビュー: 式、単位、丸め、係数入力、端部条件、排水方向、方位角、図解、PDF・CSV一致、端末履歴、高リスク混入を確認し、P0 0 / P1 0 / 計算P2 0 / GO。
- Preview: 一覧・12個別、Coming Soon 404、sitemap公開12 URL、query noindex、PDF・CSV、320/390/768/1440px、400%、keyboard、forced colors、JavaScript無効fallbackを確認してPASS。
- Production: 専用E2E 7/7。12/12で入力途中は結果非表示、計算ボタン後だけ概算結果を表示し、代表計算のcopy・印刷PDF・CSV・31日履歴・削除を確認してPASS。
- 既存回帰production smoke 258/258 PASS。console error 0、同一origin asset failure 0。rollback先は直前deploymentとし、発動条件なし。
