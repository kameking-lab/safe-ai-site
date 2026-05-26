# 06 SDS活用設計（軸6）

## 現状
- 物質詳細に NITE モデルSDS/モデルラベルへのリンク（chripUrl/modelSdsUrl）あり。
- **自社SDSの取込み・管理・有効期限管理は未実装**。

## 設計案（既存資産で実現可能）
- D-1 SDS取込み（Gemini Vision）: SDSのPDF/画像をドラッグ&ドロップ → Gemini で物質名・CAS・GHS区分・成分を自動抽出 → 既存DBと突合して規制一覧を即表示。
  - 既存 GEMINI_API_KEY を流用（新規env不要）。コスト: 1回あたり数千トークン。月間想定回数次第だが、回数制限（usage-tracker 既存）で¥10,000閾値内に収める設計。
  - 「現場に何かさせる」UI禁止に抵触しない（事務所/職長が任意でアップロード。閲覧者には強制しない）。
- D-2 自社SDS台帳: localStorage→将来 Supabase（chemical_sds_records）。有効期限（交付後の改訂）アラート。
- D-3 SDS未所持時: NITEモデルSDSへ誘導＋AIで「この物質のSDS要点」を生成（参考明記）。

## リスク・留意
- AI抽出は「参考」明記必須（誤抽出の責任は事業者）。
- PDF読取はサーバー側（API route）でGemini Visionに渡す。大きいPDFのトークン上限に注意。

## 優先度
P1（SDS取込みは競合ケミカン/ezSDSの中核で、無料で出せれば強い差別化）。ただしコスト監視と精度検証を伴うためPhase Bでは設計＋MVP（単一SDS→抽出→規制一覧）に絞るのが安全。
