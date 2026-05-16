"use client";

import { useLanguage } from "@/contexts/language-context";

export function EquipmentFinderHeader() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <header className="mb-5">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
        {isEn ? "🛡 PPE AI Finder" : "🛡 保護具AIファインダー"}
      </h1>
      <p className="mt-2 text-sm text-slate-600">
        {isEn
          ? "Pick a PPE category, answer category-specific questions, and we'll recommend gear from a database of 1,000+ items. JIS standards and type-approved items are clearly marked."
          : "まず保護具の種類を選び、種類別の絞り込み質問に答えると、1,000点超の保護具DBからおすすめ商品を表示します。JIS規格・国家検定品も明示。"}
      </p>
      <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
        <strong>
          {isEn ? "About research-project operating funds:" : "研究プロジェクト運営費について:"}
        </strong>{" "}
        {isEn
          ? "Amazon / Rakuten links on this page are generated through the moshimo affiliate program. Any commissions earned go toward operating this site — expanding the accident DB, covering AI inference costs, and keeping legal data current."
          : "本ページの「Amazon / 楽天で見る」リンクは、もしもアフィリエイト経由で生成しています。発生した報酬は、本サイトの運営費（事故DB拡充・AI推論コスト・法令データ更新）に充てます。"}
      </div>
    </header>
  );
}
