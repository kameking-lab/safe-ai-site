import type { Metadata } from "next";
import { NetisSafetyGuide } from "@/components/netis-safety-guide";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "安全に特化したNETIS新技術の探し方";
const DESCRIPTION =
  "重機接触、立入禁止、墜落・転落、暑熱・作業環境の課題からNETIS公式検索へ進むための検索語と比較観点を整理します。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources/netis-safety" },
};

export default function NetisSafetyPage() {
  return (
    <div className="bg-amber-50 px-4 py-9 sm:px-6 sm:py-12 dark:bg-slate-950">
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/resources/netis-safety" />
      <div className="mx-auto max-w-6xl">
        <header className="max-w-4xl">
          <p className="text-sm font-black tracking-[.14em] text-sky-800 dark:text-sky-300">NETIS SAFETY GUIDE</p>
          <h1 className="mt-2 text-4xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl dark:text-white">
            安全課題からNETISを探す
          </h1>
          <p className="mt-4 text-base font-semibold leading-8 text-slate-700 dark:text-slate-200">
            国土交通省のNETISは技術検索・チャット・比較支援を備えています。
            このページでは、安全担当者が公式検索へ入る前に、課題と比較条件を短く整理できます。
          </p>
        </header>
        <div className="mt-8"><NetisSafetyGuide /></div>
      </div>
    </div>
  );
}
