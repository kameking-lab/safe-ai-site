import type { Metadata } from "next";
import { ScaffoldPage } from "@/components/scaffold-page";

const TITLE = "在宅勤務・テレワークの安全衛生管理";
const DESCRIPTION =
  "テレワーク・在宅勤務者への安全配慮義務。VDT（ディスプレイ）作業、メンタルヘルスケア、労働時間管理、自宅作業環境の整備基準を厚労省テレワークガイドラインに基づき解説します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
};

export default function DiversityRemotePage() {
  return (
    <ScaffoldPage
      backLabel="多様性と安全に戻る"
      backHref="/diversity"
      eyebrow="多様性 / 在宅勤務・テレワーク"
      title={TITLE}
      lead={DESCRIPTION}
      keyPoints={[
        "テレワーク実施ルール：労働契約・就業規則への明記、在宅勤務に関する取り決め（通信費・機器負担等）",
        "VDT作業の安全衛生（厚労省VDTガイドライン）：1時間に10〜15分の休憩、画面輝度・照度・視距離の基準",
        "作業環境の整備：椅子・デスク・照明の適切な設定と腰痛・頸肩腕障害の予防",
        "メンタルヘルスケア：孤立感・過重労働リスクへの対応、上司との定期1on1、EAP活用推奨",
        "労働時間管理：中抜け・フレックス適用時のPC記録等客観的時間管理とサテライトオフィス利用",
        "通信・情報セキュリティと安全衛生の接続：VPN義務化・端末管理と心理的プレッシャーへの配慮",
      ]}
      relatedLaws={[
        {
          label: "労安衛法 第65条（作業環境管理）・第66条（健康管理）",
          href: "/laws",
          description: "テレワーク中も事業者の安全配慮義務は継続して適用",
        },
        {
          label: "労働基準法（テレワーク時の労働時間管理）",
          href: "/laws",
          description: "事業場外みなし労働時間制の要件と客観的記録の必要性",
        },
        {
          label: "労働者の心身の健康確保に関する指針",
          href: "/laws",
          description: "過重労働防止・メンタルヘルス指針のテレワーク版適用",
        },
      ]}
      resources={[
        { label: "多様性と安全 トップ", href: "/diversity" },
        { label: "メンタル・カスハラ", href: "/mental-health" },
        { label: "Eラーニング（安全教育）", href: "/elearning" },
      ]}
      officialRefs={[
        {
          label: "テレワークにおける適切な労務管理のためのガイドライン（厚生労働省）",
          href: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/shigoto/guideline.html",
        },
        {
          label: "情報機器作業（VDT作業）における労働衛生管理のためのガイドライン",
          href: "https://www.mhlw.go.jp/content/000580827.pdf",
        },
      ]}
    />
  );
}
