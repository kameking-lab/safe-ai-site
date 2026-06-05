import type { AccidentType, AccidentWorkCategory } from "@/lib/types/domain";
import type { CourtCaseField } from "@/data/court-cases";

/**
 * 事故事例（事故の型・業種）→ 労災裁判例の分野カテゴリ への対応付け。
 *
 * Axis A（機能間の回遊）: 事故詳細を読んだ現場の人が「この種の災害で会社の責任が
 * どう問われたか」を労災裁判例コーナーへワンタップで確認できるようにする。
 *
 * 方針:
 * - まず事故の型（墜落・熱中症 等）で最も具体的に対応付ける。
 * - 型で決まらなければ業種（建設業→建設・墜落 等）でフォールバック。
 * - どちらでも妥当な対応が無い型・業種は null を返す（無関係な汎用ページへの
 *   行き止まりリンクは張らない）。全分野に裁判例は1件以上あるため、非nullなら
 *   必ず該当裁判例が表示される。
 */
const TYPE_TO_FIELD: Partial<Record<AccidentType, CourtCaseField>> = {
  墜落: "建設・墜落",
  "飛来・落下": "建設・墜落",
  "崩壊・倒壊": "建設・墜落",
  熱中症: "熱中症・屋外",
  有害物質: "じん肺・石綿",
  有害物等との接触: "じん肺・石綿",
};

const CATEGORY_TO_FIELD: Partial<Record<AccidentWorkCategory, CourtCaseField>> = {
  建設業: "建設・墜落",
  製造業: "製造・造船",
  化学: "じん肺・石綿",
  保健衛生業: "医療",
};

export function courtCaseFieldForAccident(
  type: AccidentType,
  workCategory: AccidentWorkCategory
): CourtCaseField | null {
  return TYPE_TO_FIELD[type] ?? CATEGORY_TO_FIELD[workCategory] ?? null;
}

/** 事故事例から労災裁判例コーナーへの分野フィルタ付きディープリンク（対応が無ければ null）。 */
export function courtCasesHrefForAccident(
  type: AccidentType,
  workCategory: AccidentWorkCategory
): string | null {
  const field = courtCaseFieldForAccident(type, workCategory);
  return field ? `/court-cases?field=${encodeURIComponent(field)}` : null;
}
