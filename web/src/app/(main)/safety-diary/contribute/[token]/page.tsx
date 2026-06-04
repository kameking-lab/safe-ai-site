import type { Metadata } from "next";
import { ContributeClient } from "./contribute-client";

export const metadata: Metadata = {
  title: "協力会社 入力フォーム｜安全工程打合せ書",
  description: "元請から共有された打合せ書に、自社の作業内容・予想災害・安全対策を入力します（リンクをお持ちの方のみ）。",
  robots: { index: false },
};

export default async function ContributePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ContributeClient token={token} />;
}
