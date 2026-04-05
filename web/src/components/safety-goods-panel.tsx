"use client";

import { useMemo, useState } from "react";
import { InputWithVoice } from "@/components/voice-input-field";
import {
  safetyGoodsCategories,
  safetyGoodsItems,
  type SafetyGoodsCategory,
  type SafetyGoodsItem,
} from "@/data/mock/safety-goods";
import { withAmazonAssociateTag, withRakutenAffiliateId } from "@/lib/affiliate-links";
import { amazonSearchUrl, rakutenSearchUrl } from "@/lib/affiliate";
import { GoodsCategoryIcon } from "@/components/goods-icons";

const SELECTION_GUIDES = [
  {
    id: "mask",
    icon: "😷",
    title: "防毒マスク の選び方",
    lawBasis: "労働安全衛生法 第22条・有機溶剤中毒予防規則 第33条",
    points: [
      "作業環境に合わせた吸収缶を選ぶ（有機溶剤用・酸性ガス用・一酸化炭素用など）",
      "DS2規格（防塵）または使用ガス濃度に応じた規格品を使用",
      "吸収缶の交換標準時間を守り、色変化・破過前に交換",
      "作業者の顔型に合うフィットテストを実施",
      "電動ファン付き呼吸用保護具（PAPR）は高濃度・長時間作業に有効",
    ],
    searchQuery: "防毒マスク 吸収缶",
  },
  {
    id: "harness",
    icon: "🪢",
    title: "墜落制止用器具 の選び方",
    lawBasis: "労働安全衛生法施行令 第13条・安全衛生規則 第518条〜",
    points: [
      "作業高さ6.75m超はフルハーネス型が原則（2019年法改正）",
      "ランヤードはショックアブソーバー付きを選定",
      "EN規格・日本産業規格（JIS T 8165）適合品を確認",
      "胴ベルト型は6.75m以下の低所作業に限定使用可",
      "定期点検：使用前に外観点検、年1回以上の自主点検",
    ],
    searchQuery: "フルハーネス 墜落制止用器具",
  },
  {
    id: "helmet",
    icon: "⛑️",
    title: "保護帽（ヘルメット）の選び方",
    lawBasis: "労働安全衛生規則 第539条・飛来落下物用規格（JIS T 8131）",
    points: [
      "作業区分に応じて「飛来・落下物用」「墜落時保護用」兼用品を選ぶ",
      "JIS T 8131 / ANSI Z89.1 適合品を使用",
      "帽体の亀裂・変形・衝撃履歴があれば即交換（目安：製造後3年）",
      "通気孔付き・内装交換可のモデルは着用率向上に有効",
      "電気用は絶縁クラスA・B・Eを確認",
    ],
    searchQuery: "保護帽 産業用ヘルメット",
  },
  {
    id: "glasses",
    icon: "🥽",
    title: "保護メガネ の選び方",
    lawBasis: "労働安全衛生規則 第593条・JIS T 8147",
    points: [
      "飛散物対策はEN166/JIS T 8147「衝撃」等級を確認",
      "化学薬品・液体スプラッシュにはゴーグルタイプを選択",
      "溶接作業は遮光度番号（#3〜#14）を溶接電流に合わせる",
      "粉塵・微粒子にはフォームガスケット付きを選定",
      "普通眼鏡の上から使える「オーバーグラス」タイプも有効",
    ],
    searchQuery: "保護メガネ 安全ゴーグル",
  },
  {
    id: "safety-boots",
    icon: "👟",
    title: "安全靴 の選び方",
    lawBasis: "労働安全衛生規則 第558条・JIS T 8101",
    points: [
      "JIS T 8101（普通作業用・重作業用・耐滑底）規格を確認し作業に合わせて選定",
      "静電気帯電防止靴（静電靴）は電子部品・火薬取扱い作業に必須",
      "耐滑底（SL）は油・水濡れの多い食品・水産加工現場で有効",
      "甲被の材質は革製・布製・合成樹脂製それぞれ耐薬品性・通気性が異なる",
      "作業後は水洗い・乾燥・ひびチェックを行い、外底の溝が浅くなったら交換",
    ],
    searchQuery: "安全靴 JIS T8101",
  },
  {
    id: "ear-protection",
    icon: "🎧",
    title: "耳栓・イヤーマフ の選び方",
    lawBasis: "労働安全衛生規則 第595条・JIS T 8161",
    points: [
      "騒音レベル85dB(A)以上の作業場では聴覚保護具の使用が義務（安衛則第595条）",
      "NRR値（米国）またはSNR値（欧州）で遮音性能を確認し、必要減音量を計算",
      "イヤーマフはNRR 25〜33dB、フォーム耳栓はNRR 29〜33dBが一般的",
      "100dB超の高騒音ではイヤーマフと耳栓の二重防護を検討",
      "耳栓は正しい挿入法（後ろから耳介を引き上げながら挿入）を教育すること",
    ],
    searchQuery: "イヤーマフ 耳栓 防音",
  },
  {
    id: "gloves",
    icon: "🧤",
    title: "保護手袋 の選び方",
    lawBasis: "労働安全衛生規則 第594条・EN 388・EN 374",
    points: [
      "切創リスクはEN 388切創レベル（A〜F）を確認。刃物・板金作業はD以上推奨",
      "化学品取扱いはEN 374対応品を選定し、使用薬品の透過時間（60分以上）を確認",
      "耐熱手袋は使用温度範囲と接触時間（EN 407）の両方を確認",
      "振動工具使用時は防振手袋（EN ISO 10819）で白ろう病リスクを低減",
      "ラテックスアレルギーのある作業者にはニトリル製またはネオプレン製を使用",
    ],
    searchQuery: "保護手袋 EN388 切創",
  },
  {
    id: "heat-stress",
    icon: "🌡️",
    title: "熱中症対策グッズ の選び方",
    lawBasis: "熱中症予防指針（厚労省・令和5年改訂）・WBGT管理",
    points: [
      "WBGT（湿球黒球温度）計で作業環境を測定し、基準値（25〜28℃）超えで作業管理",
      "空調服（ファン付き作業着）は気温30℃以上の屋外・工場で特に有効",
      "冷却ベスト（保冷剤・氷入り）は空調が使えない場所でのWBGT上昇を抑制",
      "水分補給：作業前コップ1〜2杯、20〜30分ごとに100〜150mL、塩分（0.1〜0.2%食塩水）も補給",
      "WBGT28℃超では高温作業者の健康診断（熱作業）を考慮し、高齢者・新入者を優先管理",
    ],
    searchQuery: "空調服 熱中症対策 WBGT",
  },
  {
    id: "safety-harness-wp",
    icon: "🔗",
    title: "安全帯（ワークポジショニング） の選び方",
    lawBasis: "労働安全衛生規則 第521条・JIS T 8165",
    points: [
      "2019年2月施行の改正省令でU字つり（胴ベルト型）はワークポジショニング専用器具として整理",
      "電柱・鉄塔作業では「U字つり用胴ベルト」＋「フルハーネス型墜落制止用器具」の併用が原則",
      "ランヤードの長さは作業面から落下停止までの距離（FL値）を計算して選定",
      "定期自主検査（年1回以上）と使用前点検（ベルト・バックル・縫製の目視確認）を実施",
      "メーカー指定の使用開始年月からの廃棄基準（外観異常・衝撃荷重記録後）を順守",
    ],
    searchQuery: "安全帯 ワークポジショニング 胴ベルト",
  },
];


function GoodsIconDisplay({ categoryId }: { categoryId: string }) {
  return <GoodsCategoryIcon categoryId={categoryId} size={64} />;
}

function GoodsCard({ item }: { item: SafetyGoodsItem }) {
  const amazonHref = withAmazonAssociateTag(item.amazonUrl);
  const rakutenHref = withRakutenAffiliateId(item.rakutenUrl);
  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="flex h-36 items-center justify-center rounded-t-xl bg-slate-100">
        <GoodsIconDisplay categoryId={item.categoryId} />
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-1">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800"
            >
              {tag}
            </span>
          ))}
        </div>
        <h3 className="mt-2 text-sm font-bold leading-snug text-slate-900">{item.name}</h3>
        <p className="mt-1 flex-1 text-xs leading-relaxed text-slate-600">{item.description}</p>
        <p className="mt-2 text-sm font-bold text-emerald-700">{item.price}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <a
            href={amazonHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-amber-500 py-2 text-center text-xs font-bold text-white hover:bg-amber-600"
          >
            Amazonで見る
          </a>
          <a
            href={rakutenHref}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-rose-500 py-2 text-center text-xs font-bold text-white hover:bg-rose-600"
          >
            楽天で見る
          </a>
        </div>
      </div>
    </article>
  );
}

function CategoryCard({
  cat,
  count,
  isActive,
  onClick,
}: {
  cat: SafetyGoodsCategory;
  count: number;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
        isActive
          ? "border-emerald-500 bg-emerald-50 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <GoodsCategoryIcon categoryId={cat.id} size={28} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900">{cat.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">{count}件</p>
      </div>
    </button>
  );
}

function SelectionGuideSection() {
  return (
    <section className="mt-8 space-y-4">
      <h2 className="text-lg font-bold text-slate-900">選び方ガイド</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {SELECTION_GUIDES.map((guide) => (
          <div
            key={guide.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">{guide.icon}</span>
              <h3 className="text-base font-bold text-slate-900">{guide.title}</h3>
            </div>
            <p className="mt-1 text-[11px] text-emerald-700 font-medium">
              法令根拠: {guide.lawBasis}
            </p>
            <ul className="mt-3 space-y-1.5">
              {guide.points.map((point, i) => (
                <li key={i} className="flex gap-2 text-xs text-slate-700">
                  <span className="mt-0.5 shrink-0 text-emerald-500">✓</span>
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a
                href={amazonSearchUrl(guide.searchQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-amber-500 py-2 text-center text-xs font-bold text-white hover:bg-amber-600"
              >
                Amazonで探す
              </a>
              <a
                href={rakutenSearchUrl(guide.searchQuery)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-rose-500 py-2 text-center text-xs font-bold text-white hover:bg-rose-600"
              >
                楽天で探す
              </a>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SafetyGoodsPanel() {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filteredItems = useMemo(() => {
    let items = safetyGoodsItems;
    if (selectedCategoryId) {
      items = items.filter((item) => item.categoryId === selectedCategoryId);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return items;
  }, [selectedCategoryId, query]);

  const selectedCategory = selectedCategoryId
    ? safetyGoodsCategories.find((c) => c.id === selectedCategoryId)
    : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <div>
        <h1 className="text-xl font-bold text-slate-900 lg:text-2xl">安全グッズ</h1>
        <p className="mt-1 text-sm text-slate-600">
          現場で必要な安全グッズを分野別にまとめました。各商品のリンクから購入できます。
        </p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div className="w-full shrink-0 lg:w-64">
          <p className="mb-2 text-xs font-semibold text-slate-700">カテゴリ</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            <button
              type="button"
              onClick={() => setSelectedCategoryId(null)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition ${
                !selectedCategoryId
                  ? "border-emerald-500 bg-emerald-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="text-2xl">📦</span>
              <div>
                <p className="text-sm font-bold text-slate-900">すべて</p>
                <p className="text-[11px] text-slate-500">{safetyGoodsItems.length}件</p>
              </div>
            </button>
            {safetyGoodsCategories.map((cat) => {
              const count = safetyGoodsItems.filter((item) => item.categoryId === cat.id).length;
              return (
                <CategoryCard
                  key={cat.id}
                  cat={cat}
                  count={count}
                  isActive={selectedCategoryId === cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {selectedCategory && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="text-lg font-bold text-slate-900">
                {selectedCategory.icon} {selectedCategory.name}
              </p>
              <p className="mt-1 text-sm text-slate-700">{selectedCategory.description}</p>
            </div>
          )}

          <div className="mb-4">
            <InputWithVoice
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="商品名・タグで検索..."
              className="w-full"
            />
          </div>

          {filteredItems.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
              該当する商品がありません。
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <GoodsCard key={item.id} item={item} />
              ))}
            </div>
          )}

          <p className="mt-6 text-[11px] leading-relaxed text-slate-400">
            ※ 本ページのリンクはアフィリエイトプログラムを利用しています。リンク先で商品を購入すると、当サイトに紹介料が支払われます。商品価格への影響はありません。
          </p>
        </div>
      </div>

      <SelectionGuideSection />
    </div>
  );
}
