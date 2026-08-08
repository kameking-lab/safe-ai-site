export { SPECIAL_EDUCATION } from "./special-education";
export { SKILL_TRAINING } from "./skill-training";
export { JOB_CHIEF_EDUCATION } from "./job-chief";
export { LICENSES } from "./licenses";

import { SPECIAL_EDUCATION } from "./special-education";
import { SKILL_TRAINING } from "./skill-training";
import { JOB_CHIEF_EDUCATION } from "./job-chief";
import { LICENSES } from "./licenses";
import type {
  EducationCert,
  EducationLegalStatus,
} from "@/types/education-cert";

const SOURCE_CHECKED_AT = "2026-07-24";

const EGOV_SPECIAL_EDUCATION_SOURCE = {
  registryId: "egov-laws",
  title: "労働安全衛生規則 第36条",
  publisher: "デジタル庁 e-Gov法令検索",
  documentNumber: "昭和47年労働省令第32号",
  url: "https://laws.e-gov.go.jp/law/347M50002000032",
  role: "特別教育の対象業務を確認する一次資料",
};

const MHLW_SKILL_TRAINING_SOURCE = {
  registryId: "mhlw-anzeninfo",
  title: "技能講習名称一覧表",
  publisher: "厚生労働省 職場のあんぜんサイト",
  documentNumber: null,
  url: "https://anzeninfo.mhlw.go.jp/gino/meishou.html",
  role: "現行技能講習の正式名称を確認する公式一覧",
};

const MHLW_WORK_RESTRICTION_SOURCE = {
  registryId: "mhlw-anzeninfo",
  title: "就業制限",
  publisher: "厚生労働省 職場のあんぜんサイト",
  documentNumber: null,
  url: "https://anzeninfo.mhlw.go.jp/yougo/yougo46_1.html",
  role: "就業制限業務と必要資格の公式案内",
};

const MHLW_INFORMATION_EQUIPMENT_SOURCE = {
  registryId: "mhlw-law-db",
  title: "情報機器作業における労働衛生管理のためのガイドライン",
  publisher: "厚生労働省",
  documentNumber: "基発0712第3号",
  url: "https://www.mhlw.go.jp/web/t_doc_keyword?dataId=00tc4418&dataType=1&keyword=%E6%83%85%E5%A0%B1%E6%A9%9F%E5%99%A8%E4%BD%9C%E6%A5%AD&mode=0&pageNo=1",
  role: "法定特別教育ではない行政ガイドライン",
};

const SKILL_WORK_RESTRICTION_IDS = new Set([
  "st-crane-5t",
  "st-mobile-crane",
  "st-tamakake",
  "st-forklift",
  "st-shovel",
  "st-concrete-crusher",
  "st-rough-terrain",
  "st-high-lift",
  "st-shovel-loader",
  "st-gas-chief",
]);

const SKILL_APPOINTMENT_IDS = new Set([
  "st-ashiba-chief",
  "st-hai-chief",
  "st-excavation-chief",
  "st-tunnel-chief",
  "st-saishi-chief",
  "st-sankesu-chief",
  "st-tokuka-chief",
  "st-yuki-chief",
  "st-lead-chief",
  "st-asbestos-chief",
  "st-concrete-chief",
  "st-scaffold-erect",
  "st-timber-chief",
  "st-press-chief",
  "st-chemical-plant-chief",
  "st-moku-chief",
  "st-tunnel-lining-chief",
  "st-steel-bridge-chief",
  "st-concrete-bridge-chief",
  "st-dryer-chief",
  "st-pressure-vessel-chief",
]);

/**
 * 公式の現行技能講習一覧に名称が無い、又は別制度との混同があるレコード。
 * 原データは訂正履歴のため残すが、ALL_CERTS から除外して公開判定に使わない。
 */
const QUARANTINED_SKILL_IDS = new Set([
  "st-electrical-chief",
  "st-roof-chief",
  "st-hakkaku-chief",
  "st-gangway-chief",
  "st-radiation-chief",
  "st-noise-chief",
  "st-forestry-cable-chief",
  "st-transfer-chief",
]);

const LICENSE_WORK_RESTRICTION_IDS = new Set([
  "lic-crane-derrick",
  "lic-mobile-crane",
  "lic-yangu",
  "lic-boiler-2",
  "lic-boiler-1",
  "lic-diver",
  "lic-hakka",
]);

const LICENSE_APPOINTMENT_IDS = new Set([
  "lic-gas-welding-chief",
  "lic-xray-chief",
  "lic-gamma-chief",
  "lic-koatsu-shitsunai-chief",
  "jc-health-supervisor",
]);

function withLegalMetadata(
  cert: EducationCert,
  legalStatus: EducationLegalStatus,
  primarySources: NonNullable<EducationCert["primarySources"]>,
): EducationCert {
  return {
    ...cert,
    legalStatus,
    primarySources: primarySources.map((source) => ({ ...source })),
    // URLと該当箇所は確認したが、人間の専門家レビューとは区別する。
    sourceVerification:
      legalStatus === "quarantined" ? "quarantined" : "sourceLocated",
    sourceCheckedAt: SOURCE_CHECKED_AT,
  };
}

const enrichedSpecialEducation = SPECIAL_EDUCATION.map((cert) =>
  cert.id === "se-36-vdt"
    ? withLegalMetadata(cert, "administrativeGuidance", [
        MHLW_INFORMATION_EQUIPMENT_SOURCE,
      ])
    : withLegalMetadata(cert, "statutorySpecialEducation", [
        EGOV_SPECIAL_EDUCATION_SOURCE,
      ]),
);

const enrichedSkillTraining = SKILL_TRAINING.map((cert) => {
  if (QUARANTINED_SKILL_IDS.has(cert.id)) {
    return withLegalMetadata(cert, "quarantined", []);
  }
  if (SKILL_WORK_RESTRICTION_IDS.has(cert.id)) {
    return withLegalMetadata(cert, "statutoryWorkRestriction", [
      MHLW_SKILL_TRAINING_SOURCE,
      MHLW_WORK_RESTRICTION_SOURCE,
    ]);
  }
  if (SKILL_APPOINTMENT_IDS.has(cert.id)) {
    return withLegalMetadata(cert, "statutoryAppointment", [
      MHLW_SKILL_TRAINING_SOURCE,
    ]);
  }
  return withLegalMetadata(cert, "unverified", [
    MHLW_SKILL_TRAINING_SOURCE,
  ]);
});

const enrichedJobChiefEducation = JOB_CHIEF_EDUCATION.map((cert) => {
  const legalStatus: EducationLegalStatus =
    cert.id === "jc-upgrade"
      ? "statutoryEffort"
      : cert.id === "jc-standard" || cert.id === "jc-construction"
        ? "statutoryEducation"
        : "statutoryAppointment";
  return withLegalMetadata(cert, legalStatus, [
    {
      registryId: "egov-laws",
      title: cert.relatedLaw,
      publisher: "デジタル庁 e-Gov法令検索",
      url: "https://laws.e-gov.go.jp/",
      role: "記載条文を確認する公式検索入口。個別適用条件は人手確認待ち",
    },
  ]);
});

const enrichedLicenses = LICENSES.map((cert) => {
  const legalStatus: EducationLegalStatus = LICENSE_WORK_RESTRICTION_IDS.has(
    cert.id,
  )
    ? "statutoryWorkRestriction"
    : LICENSE_APPOINTMENT_IDS.has(cert.id)
      ? "statutoryAppointment"
      : "unverified";
  return withLegalMetadata(cert, legalStatus, [
    MHLW_WORK_RESTRICTION_SOURCE,
  ]);
});

const ALL_CERTS_WITH_QUARANTINE: EducationCert[] = [
  ...enrichedSpecialEducation,
  ...enrichedSkillTraining,
  ...enrichedJobChiefEducation,
  ...enrichedLicenses,
];

/** 公開検索・判定から隔離するレコード。内部監査と訂正履歴にだけ使用する。 */
export const QUARANTINED_CERTS: EducationCert[] =
  ALL_CERTS_WITH_QUARANTINE.filter(
    (cert) => cert.legalStatus === "quarantined",
  );

/** 公開可能な資格・教育候補。隔離レコードは含まない。 */
export const ALL_CERTS: EducationCert[] = ALL_CERTS_WITH_QUARANTINE.filter(
  (cert) => cert.legalStatus !== "quarantined",
);
