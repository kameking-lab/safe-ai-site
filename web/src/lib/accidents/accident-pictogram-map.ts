import type { AccidentType } from "@/lib/types/domain";

/**
 * 事故の型ピクトグラム対応表（柱0・脱テキスト）。
 * 厚労省「事故の型」22分類のそれぞれに、黄＝注意（JIS Z 9103）の地に黒グリフの
 * ピクトグラムを1対1で割り当てる。描画は components/accidents/accident-type-pictogram.tsx。
 *
 * グリフは lucide のアイコン名（コンポーネント側で解決）か、自作SVGのID。
 * 「色＋形」で型が判別できることが目的なので、型ごとに必ず異なるグリフを割り当てる
 * （テストで一意性を固定）。
 */

export type AccidentGlyphId =
  | "fall-person" // 墜落: 落下する人
  | "slip" // 転倒: 足を滑らせる人
  | "caught" // はさまれ・巻き込まれ: 歯車
  | "struck" // 激突され: 飛んでくる塊と人
  | "cut" // 切れ・こすれ: 丸のこ刃
  | "falling-object" // 飛来・落下: 落ちてくる物
  | "collapse" // 崩壊・倒壊: 崩れる積荷
  | "electric" // 感電: 稲妻
  | "vehicle" // 車両: フォークリフト
  | "traffic" // 交通事故: 自動車
  | "fire" // 火災: 炎
  | "explosion" // 爆発: 爆発物
  | "hot-cold" // 高温・低温の物との接触: 温度計
  | "chemical-contact" // 有害物等との接触: フラスコ
  | "oxygen-deficiency" // 酸素欠乏: O2低下
  | "drowning" // 溺水: 波
  | "heat-stroke" // 熱中症: 太陽と温度計
  | "hypothermia" // 低体温症: 雪結晶
  | "harmful-ray" // 有害光線: 放射
  | "toxic" // 有害物質: どくろ
  | "vibration" // 振動障害: 振動
  | "overexertion" // 動作の反動・無理な動作: 持ち上げ動作
  // --- 以下は災害の型 正規化層（type-normalization.ts）の21分類専用グリフ。
  // AccidentType union には対応値が無いため ACCIDENT_TYPE_GLYPH には登場しない。
  | "bump" // 激突（人が物に）: 壁にぶつかる人
  | "rupture" // 破裂: 破裂する容器
  | "stepping-through" // 踏み抜き: 釘を踏む足
  | "other" // その他: 三点リーダ
  | "unclassifiable"; // 分類不能: 疑問符

export const ACCIDENT_TYPE_GLYPH: Record<AccidentType, AccidentGlyphId> = {
  墜落: "fall-person",
  転倒: "slip",
  "はさまれ・巻き込まれ": "caught",
  激突され: "struck",
  "切れ・こすれ": "cut",
  "飛来・落下": "falling-object",
  "崩壊・倒壊": "collapse",
  感電: "electric",
  車両: "vehicle",
  交通事故: "traffic",
  火災: "fire",
  爆発: "explosion",
  "高温・低温の物との接触": "hot-cold",
  "有害物等との接触": "chemical-contact",
  酸素欠乏: "oxygen-deficiency",
  溺水: "drowning",
  熱中症: "heat-stroke",
  低体温症: "hypothermia",
  有害光線: "harmful-ray",
  有害物質: "toxic",
  振動障害: "vibration",
  "動作の反動・無理な動作": "overexertion",
};

/**
 * グリッドタイル等で使う短ラベル（漢字2〜6文字・体言止め）。
 * 正式分類名はデータ・詳細表示で不変。長い型名だけタイルで短縮する。
 */
export const ACCIDENT_TYPE_SHORT: Record<AccidentType, string> = {
  墜落: "墜落・転落",
  転倒: "転倒",
  "はさまれ・巻き込まれ": "はさまれ",
  激突され: "激突され",
  "切れ・こすれ": "切れ・こすれ",
  "飛来・落下": "飛来・落下",
  "崩壊・倒壊": "崩壊・倒壊",
  感電: "感電",
  車両: "車両",
  交通事故: "交通事故",
  火災: "火災",
  爆発: "爆発",
  "高温・低温の物との接触": "高温・低温",
  "有害物等との接触": "有害物接触",
  酸素欠乏: "酸素欠乏",
  溺水: "溺水",
  熱中症: "熱中症",
  低体温症: "低体温症",
  有害光線: "有害光線",
  有害物質: "有害物質",
  振動障害: "振動障害",
  "動作の反動・無理な動作": "無理な動作",
};
