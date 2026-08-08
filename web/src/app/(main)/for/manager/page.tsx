import type { Metadata } from "next";
import {
  RoleActionPortal,
  type RoleAction,
} from "@/components/role-action-portal";

const TITLE = "安全衛生担当者向け現場運用入口";
const DESCRIPTION =
  "安全衛生担当者が今日の安全、委員会、点検、教育、化学物質、法令確認を正規機能で始めるための入口。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for/manager" },
};

const ACTIONS: readonly RoleAction[] = [
  {
    href: "/risk",
    label: "今日の警報・予報・作業リスクを確認",
    description:
      "地域を自分で選び、取得時刻・情報が古い状態・公式情報を確認して朝礼へ進みます。",
    priority: "primary",
  },
  {
    href: "/site-records",
    label: "現場記録・帳票を作る",
    description:
      "委員会、点検、パトロール、教育など、用途に合う正規帳票を選びます。",
  },
  {
    href: "/site-records/committee",
    label: "安全衛生委員会の記録",
    description:
      "議題と決定事項を記録し、印刷前に確認者と保存内容を見直します。",
  },
  {
    href: "/chemical-ra",
    label: "化学物質リスクを確認",
    description:
      "SDS、CAS、濃度、換気、作業時間等が不足する場合は評価を停止します。",
  },
  {
    href: "/education-certification/finder",
    label: "資格・教育の確認条件を整理",
    description:
      "作業、設備、高さ、能力、役割等を入力し、不足条件があれば判定不能とします。",
  },
  {
    href: "/law-search",
    label: "法令・通達の原典を探す",
    description:
      "現場語から候補を探し、e-Govや厚生労働省の公式原文で最終確認します。",
  },
];

export default function ForManagerPage() {
  return (
    <RoleActionPortal
      roleLabel="安全衛生担当者・総務・人事向け"
      heading="今日の確認と記録から、安全衛生運用を始める。"
      introduction="未確認テンプレートで義務を断定せず、気象、作業条件、帳票、資格、化学物質、法令をそれぞれの正規機能で確認します。"
      actions={ACTIONS}
    />
  );
}
