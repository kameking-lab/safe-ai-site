export type GoodsProductFeature = {
  id: string;
  label: string;
  detail: string;
  searchQuery: string | null;
  check: string;
  officialSource?: { label: string; url: string };
};

// These are search intentions, not claims that an individual listing meets a standard.
// A null query deliberately withholds products until the hazard is identified.
export const GOODS_PRODUCT_FEATURES: Readonly<Record<string, readonly GoodsProductFeature[]>> = {
  "head-protection": [
    { id: "flying", label: "飛来・落下物", detail: "資材や工具が頭に当たるおそれ", searchQuery: "産業用 保護帽 飛来 落下", check: "型式の使用区分と飛来・落下物への適合をメーカー資料で確認" },
    { id: "fall", label: "墜落時の頭部保護", detail: "高所作業や足場で使う", searchQuery: "産業用 保護帽 墜落時保護", check: "墜落時保護の使用区分とあごひもの仕様をメーカー資料で確認" },
    { id: "electric", label: "電気作業", detail: "充電部への接近や電気設備の作業", searchQuery: "電気用 保護帽 作業", check: "絶縁性能の有無と作業電圧・使用期限をメーカー資料で確認" },
  ],
  "fall-protection": [
    { id: "harness", label: "フルハーネス", detail: "高所で墜落制止用器具を使う", searchQuery: "墜落制止用器具 フルハーネス", check: "落下距離・使用可能質量・ランヤード・取付設備を確認" },
    { id: "lanyard", label: "ランヤード", detail: "既存ハーネスに適合する部品を探す", searchQuery: "墜落制止用器具 ランヤード", check: "器具本体との組合せと落下距離をメーカー資料で確認" },
  ],
  respiratory: [
    { id: "dust", label: "粉じん", detail: "研削・解体・清掃など", searchQuery: "防じんマスク 国家検定", check: "粉じんの種類・濃度・必要区分と顔への密着を確認" },
    { id: "gas", label: "蒸気・ガス", detail: "塗装・洗浄・接着など", searchQuery: "防毒マスク 吸収缶", check: "SDSの対象物質・濃度・吸収缶の種類・破過時間を確認" },
    { id: "unknown", label: "物質・酸素濃度が不明", detail: "槽・ピット・密閉空間を含む", searchQuery: null, check: "物質と酸素濃度を測定し、ろ過式マスクの使用可否を先に判断" },
  ],
  "eye-face-protection": [
    { id: "impact", label: "飛来物・粉じん", detail: "切断・研削・清掃など", searchQuery: "作業用 保護めがね 飛来物", check: "側面保護・耐衝撃性と他の保護具との干渉を確認" },
    { id: "splash", label: "薬液の飛散", detail: "注入・混合・洗浄など", searchQuery: "化学用 ゴーグル 薬液", check: "SDSの眼保護要件、密閉性、顔面保護の併用を確認" },
    { id: "light", label: "溶接光・強い光", detail: "溶接や切断の光を遮る", searchQuery: "溶接用 保護面 遮光", check: "作業方法に合う遮光度と顔面保護をメーカー資料で確認" },
  ],
  hearing: [
    { id: "earplugs", label: "耳栓", detail: "耳の穴に装着するタイプを探す", searchQuery: "作業用 耳栓 聴覚保護具", check: "騒音測定結果、遮音値、装着性、警報音や会話の聞こえ方を確認", officialSource: { label: "厚生労働省 騒音障害防止ガイドライン", url: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1" } },
    { id: "earmuffs", label: "イヤーマフ", detail: "耳全体を覆うタイプを探す", searchQuery: "作業用 イヤーマフ 聴覚保護具", check: "騒音測定結果、遮音値、ヘルメット等との干渉、警報音の聞こえ方を確認", officialSource: { label: "厚生労働省 騒音障害防止ガイドライン", url: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc7618&dataType=1&pageNo=1" } },
  ],
  "chemical-gloves": [
    { id: "handling", label: "化学物質を取り扱う", detail: "液体の接触や飛散に備える", searchQuery: "化学防護手袋 耐透過 作業用", check: "物質名とSDS、材質ごとの耐透過性、使用時間、取扱説明書を確認", officialSource: { label: "厚生労働省 化学防護手袋の選択・使用", url: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc2426&dataType=1" } },
    { id: "cleaning", label: "洗浄・拭き取り", detail: "洗浄剤や溶剤が手に触れるおそれ", searchQuery: "化学防護手袋 洗浄 溶剤 耐透過", check: "洗浄剤の成分・濃度と手袋の耐透過データ、交換時期を確認", officialSource: { label: "厚生労働省 化学防護手袋の選択・使用", url: "https://www.mhlw.go.jp/web/t_doc?dataId=00tc2426&dataType=1" } },
    { id: "unknown", label: "物質が分からない", detail: "SDSや成分を確認してから選ぶ", searchQuery: null, check: "物質名・濃度・接触時間が分かるまで商品候補は出さない" },
  ],
  "chemical-clothing": [
    { id: "splash", label: "液体の飛散", detail: "薬液が衣服や皮膚にかかるおそれ", searchQuery: "化学防護服 液体 飛散", check: "SDS、対象物質に対する素材・縫い目の耐透過性と脱衣手順を確認", officialSource: { label: "厚生労働省 保護具の選定マニュアル", url: "https://www.mhlw.go.jp/content/11300000/001670143.pdf" } },
    { id: "particles", label: "粒子の付着", detail: "粉体の付着や汚染の拡散を抑える", searchQuery: "化学防護服 粉じん 粒子", check: "対象粒子・ばく露経路・作業環境、服の密閉性と脱衣時の汚染拡散を確認", officialSource: { label: "厚生労働省 保護具の選定マニュアル", url: "https://www.mhlw.go.jp/content/11300000/001670143.pdf" } },
    { id: "unknown", label: "物質・形態が分からない", detail: "SDSや作業条件を先に確認する", searchQuery: null, check: "対象物質と形態が分かるまで商品候補は出さない" },
  ],
  "safety-footwear": [
    { id: "toe", label: "つま先の保護", detail: "工具や資材が足に当たるおそれ", searchQuery: "安全靴 先芯 作業用", check: "重量物の種類、先芯の保護性能、サイズと作業環境を確認" },
    { id: "slip", label: "滑りやすい床", detail: "水や油、勾配のある場所を歩く", searchQuery: "作業用 安全靴 耐滑", check: "床面の水・油・勾配、靴底の耐滑性と摩耗状態を確認", officialSource: { label: "厚生労働省 転倒防止に有効な安全靴", url: "https://anzeninfo.mhlw.go.jp/information/tentou1501_25.html" } },
    { id: "puncture", label: "踏抜きのおそれ", detail: "釘などの鋭利物がある場所", searchQuery: "作業用 安全靴 踏抜き防止", check: "現場の貫通物と製品の踏抜き防止性能をメーカー資料で確認" },
  ],
};

export function getGoodsProductFeature(categoryId: string, featureId: string | null) {
  return GOODS_PRODUCT_FEATURES[categoryId]?.find((feature) => feature.id === featureId) ?? null;
}
