import type { Metadata } from "next";
import { NetisSafetyGuide } from "@/components/netis-safety-guide";
import { PageJsonLd } from "@/components/page-json-ld";

const TITLE = "現場の安全・省力化に役立つNETIS技術の探し方";
const DESCRIPTION =
  "重機接触や墜落防止の安全技術と、測量・出来形、記録・点検の効率化技術を、現場の目的から探せます。";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/resources/netis-safety" },
};

export default function NetisSafetyPage() {
  return (
    <div className="bg-amber-50 px-3 py-5 sm:px-6 sm:py-9 dark:bg-slate-950">
      <PageJsonLd name={TITLE} description={DESCRIPTION} path="/resources/netis-safety" />
      <div className="mx-auto max-w-6xl">
        <header className="max-w-4xl">
          <p className="text-xs font-black tracking-[.14em] text-sky-800 dark:text-sky-300">NETIS FIELD GUIDE</p>
          <h1 className="mt-1 text-3xl font-black tracking-[-.04em] text-slate-950 sm:text-5xl dark:text-white">
            現場の安全・省力化技術を探す
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 sm:text-base dark:text-slate-200">
            安全対策と作業の効率化を選び、現場の課題から技術を絞れます。
          </p>
        </header>
        <div className="mt-4"><NetisSafetyGuide /></div>
      </div>
    </div>
  );
}
