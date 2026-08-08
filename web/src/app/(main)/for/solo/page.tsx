import type { Metadata } from "next";
import {
  RoleActionPortal,
  type RoleAction,
} from "@/components/role-action-portal";

const TITLE = "一人親方向け安全確認入口";
const DESCRIPTION =
  "一人親方が位置情報を必須にせず、今日の気象、ひとりKY、資格、事故、化学物質を確認する入口。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/for/solo" },
};

const ACTIONS: readonly RoleAction[] = [
  {
    href: "/risk",
    label: "地域を選んで今日の安全を確認",
    description:
      "位置情報を使わず地域を選択でき、古い・欠落した気象情報では安全と断定しません。",
    priority: "primary",
  },
  {
    href: "/ky/paper",
    label: "一人KYを記録",
    description:
      "作業、場所、設備、変更点、緊急時の連絡方法を確認してから印刷します。",
  },
  {
    href: "/education-certification/finder",
    label: "資格・教育の条件を確認",
    description:
      "ゼロ件を資格不要と扱わず、条件不足時は判定不能として公式窓口へ案内します。",
  },
  {
    href: "/accident-news",
    label: "重大災害情報を確認",
    description:
      "公表事実・匿名・出典付きの情報を確認し、自分の作業へ適用する前に条件を照合します。",
  },
  {
    href: "/chemical-ra",
    label: "化学物質・SDSを確認",
    description:
      "SDSや濃度等が不足する場合は簡易評価を止め、公式ツールでの確認へ進みます。",
  },
  {
    href: "/services/automation",
    label: "帳票・集計の相談",
    description:
      "小規模でも使える範囲から、毎日の記録や集計を整理する相談へ進みます。",
  },
];

export default function ForSoloPage() {
  return (
    <RoleActionPortal
      roleLabel="一人親方・小規模事業者向け"
      heading="片手で、今日の確認と一人KYを始める。"
      introduction="現在地の送信を必須にせず、自分で地域と作業条件を選びます。資格不要や警報なしを、情報不足のまま断定しません。"
      actions={ACTIONS}
    />
  );
}
