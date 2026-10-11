import type { LawRevision, LawRevisionSummary } from "@/lib/types/domain";

const verification = {
  checkedOn: "2026-10-11",
  scope: "個人ばく露測定等の位置づけと対象条件。改正全体の解説・個別事業場の適用判定・外部専門家レビューは含みません。",
  sources: [
    { label: "厚労省 基発0730第2号：改正趣旨・安衛則42条の5/6（PDF 2〜4頁）", url: "https://www.mhlw.go.jp/content/11300000/001736054.pdf#page=2" },
    { label: "安衛則・改正後（2026年10月1日版）42条の5/6", url: "https://laws.e-gov.go.jp/law/347M50002000032/20261001_508M60000100116" },
    { label: "安衛則・改正前（2026年4月1日版）", url: "https://laws.e-gov.go.jp/law/347M50002000032/20260401_508M60000100003" },
    { label: "安衛法・改正後：2条4号、65条の3〜5", url: "https://laws.e-gov.go.jp/law/347AC0000000057/20261001_507AC0000000033" },
    { label: "安衛法・改正前（2026年4月1日版）", url: "https://laws.e-gov.go.jp/law/347AC0000000057/20260401_507AC0000000033" },
  ],
};

/** Only the exact amendment/date combinations actually compared with primary sources. */
export function curatedRevisionSummary(revision: LawRevision): LawRevisionSummary | null {
  const regulation = revision.id === "lr-egov-347M50002000032-20261001" &&
    revision.revisionNumber === "令和八年厚生労働省令第百十六号";
  const act = revision.id === "lr-egov-347AC0000000057-20261001" &&
    revision.revisionNumber === "令和七年法律第三十三号";
  if ((!regulation && !act) || revision.enforcement_date !== "2026-10-01") return null;
  return {
    threeLineSummary: [
      "2026年10月1日から、個人ばく露測定を作業環境測定の一部として位置づけました。従来の安衛法65条の3の作業管理は65条の4へ移り、新65条の3が測定の根拠になっています。",
      "新設の安衛則42条の5は、改善困難な第三管理区分作業場の個人ばく露測定や、屋内で継続する金属アーク溶接等の方法変更時等を対象にします。42条の6は改善措置の評価のための測定を対象にします。",
      "対象の測定は作業環境測定基準に従います。RAに伴う測定は必要に応じて行うものです。全事業場・全化学物質に、一律の新しい測定義務が生じたという意味ではありません。",
    ],
    workplaceActions: [
      "化学物質管理担当者は、自社の工程・管理区分・測定目的を、安衛則42条の5/6と参照先の有機則・鉛則・特化則・粉じん則に照合する。金属アーク溶接等では、屋内での継続作業と方法変更等の条件も確認する。",
      "対象なら、測定計画を作業環境測定基準へ合わせ、測定士・委託先の登録がデザイン/サンプリング・分析それぞれに対応しているか確認する。具体的な実施者要件は施行通達と作業環境測定法施行規則で確認する。",
      "手順書の旧65条の3/4の引用を見直す。作業管理は65条の4、作業時間の制限は65条の5へ移ったため、条番号だけで義務が新設されたと判断しない。",
    ],
    // Applicability depends on processes and conditions, not an industry name.
    targetIndustries: [],
    verification,
  };
}
