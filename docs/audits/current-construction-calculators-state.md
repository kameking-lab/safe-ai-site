# 建設計算ツール 現在状態

- 監査基準日: 2026-08-27 JST
- 一覧: `/tools/construction-calculators`
- 公開: 12計算
- Coming Soon: 23候補。折りたたみ一覧だけで、個別URLは作成しない
- 位置付け: 現場数量・勾配・局所座標の概算。構造設計、強度判定、安全可否判定、設計照査、発注保証は行わない

## 公開12計算

1. コンクリート数量・生コン車台数
2. 掘削・埋戻し土量
3. 平均断面法による土量
4. 土量変化・ダンプ台数
5. 砕石・路盤材数量
6. アスファルト混合物数量
7. 鉄筋重量
8. 鉄筋本数・配筋ピッチ
9. 型枠面積
10. 勾配・角度・斜長
11. 排水勾配・必要高低差
12. 図面縮尺・座標距離・方位角

## 正本と検証

- Formula Registry: `web/src/data/construction-calculators/formula-registry.ts`
- 手計算fixture: `web/src/data/construction-calculators/test-fixtures.ts`
- 純粋関数: `web/src/lib/construction-calculators/`
- UI、コピー、印刷PDF、CSV、履歴は同一の `CalculationResult` を使用し、別計算を行わない
- 国土交通省の令和8年度数量算出要領・土木工事共通仕様書、L/C定義、国土地理院の方向角定義と、独立した幾何・三角法の導出を根拠とする
- 鉄筋重量はJIS表を転載せず、真円断面と鋼密度7,850 kg/m³から概算する
- 鉄筋かぶりはコンクリート表面から鉄筋表面までとし、中心間有効幅から径1本分を控除する
- 台数・本数の整数境界、単位変換、NaN、Infinity、0、負数、極端値、丸めをfixtureで照合する

## UI・プライバシー・安全境界

- 入力後に明示的な「計算する」操作を行うまで結果を表示しない
- mm/cm/m、kg/t、m²/m³、0〜6桁、四捨五入・切上げ・切捨てを式に応じて提供する
- 結果、単位、使用入力、式、丸め、ロス率・密度を含む入力、仮定、概算表示を同時に示す
- 結果コピー、印刷/PDF、CSV、リセット、31日・最大20件の端末履歴、個別・全削除を提供する
- 入力・履歴はURL、サーバー、analytics、RUMへ送らない
- クレーン能力、足場荷重、支保工、土留め、擁壁、法面安定、電線選定等の高リスク計算は含めない
- JavaScript無効時はSSRの式・入力説明・通常リンクだけを表示し、動かないフォームは表示しない

最終ゲート、Preview、Production、production smoke、commit、push、tagは `current-construction-calculators-production-result.md` に記録する。
