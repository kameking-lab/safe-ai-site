import { PageContainer } from "@/components/layout";
import { FatalAccidentsResultsFallback } from "./fatal-accidents-results-fallback";

export default function FatalAccidentsLoading() {
  return (
    <PageContainer width="wide">
      <header className="pt-6 sm:pt-9">
        <p className="text-xs font-black tracking-[.15em] text-rose-700">
          厚生労働省 公表データ
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          死亡事故データベース
        </h1>
      </header>
      <FatalAccidentsResultsFallback />
    </PageContainer>
  );
}
