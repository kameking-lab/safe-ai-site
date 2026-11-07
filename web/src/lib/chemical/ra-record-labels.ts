import type { ChemicalRaSnapshotMissingField } from "./ra-cloud";

export const SNAPSHOT_MISSING_LABEL: Record<ChemicalRaSnapshotMissingField, string> = {
  "work-content": "作業内容", "sds-confirmation": "SDS確認", "sds-issued-on": "SDS発行日",
  "component-version": "成分・製品版", ventilation: "換気", "general-ventilation": "全体換気の有無",
  "local-exhaust": "局所排気の有無", amount: "取扱量", "duration-hours": "作業時間",
  frequency: "作業頻度", "use-temperature": "使用温度", dispersion: "飛散・噴霧の状態",
  "skin-contact": "皮膚接触の可能性", ppe: "使用する保護具", "ppe-suitability": "保護具の適合性確認",
  substitution: "代替物質の検討", "existing-controls": "既存措置", "additional-controls": "追加措置",
  "action-owner": "追加措置の担当", "action-due-on": "追加措置の期限", "reassessment-on": "再評価日",
  "measured-concentration": "測定濃度", "measured-unit": "測定単位", "rule-version": "記録ルール版",
  "captured-at": "保存時刻",
};
