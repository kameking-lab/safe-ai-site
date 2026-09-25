export type GoodsProductFeature = {
  id: string;
  label: string;
  detail: string;
  searchQuery: string | null;
  check: string;
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
};

export function getGoodsProductFeature(categoryId: string, featureId: string | null) {
  return GOODS_PRODUCT_FEATURES[categoryId]?.find((feature) => feature.id === featureId) ?? null;
}
