"use client";

import Link from "next/link";
import { Mail, Sparkles } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

export function AboutResearchDeclaration() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <section
      aria-labelledby="research-project-heading"
      className="mt-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 shadow-sm"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-800">
        <Sparkles className="h-4 w-4 text-emerald-600" aria-hidden="true" />
        {isEn ? "Research & demonstration project" : "研究・実証プロジェクト"}
      </div>
      <h2 id="research-project-heading" className="mt-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
        {isEn
          ? "Anzen AI Portal is an independent project researching and demonstrating AI/DX in occupational safety and health."
          : "安全AIポータル は、労働安全衛生分野における AI・DX 活用の研究・実証を目的とした個人プロジェクトです。"}
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        {isEn
          ? "Operating costs are covered personally by the maintainer. Notices, accident cases, and chemical-substance information are published free of charge with primary sources, and we welcome feedback from field practitioners, researchers, and regulators."
          : "運営費用は運営者個人が負担しています。通達・事故事例・化学物質情報を一次ソース付きで無料公開し、現場担当者・研究者・行政の皆さまから広くフィードバックを募っています。"}
      </p>
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        {isEn
          ? "* No paid feature is offered at this time. Pricing discussions in the M6 phase are at concept stage."
          : "※ 本サイトは現時点で課金機能を提供していません。M6 期に検討される料金設計はあくまで構想段階です。"}
      </p>
    </section>
  );
}

export function AboutContactBlock() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5 text-center">
      <p className="text-sm font-semibold text-emerald-800 mb-1">
        {isEn ? "Questions or feedback are welcome" : "ご質問・ご要望はお気軽に"}
      </p>
      <p className="text-xs text-slate-600 mb-4">
        {isEn
          ? "Implementation consulting, feature requests, bug reports — feel free to reach out."
          : "システムの導入相談・機能リクエスト・不具合報告など何でもお問い合わせください。"}
      </p>
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <Mail className="h-4 w-4" />
        {isEn ? "Contact us" : "お問い合わせはこちら"}
      </Link>
    </div>
  );
}

export function AboutDisclaimer() {
  const { language } = useLanguage();
  const isEn = language === "en";
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800 leading-6">
      <p className="font-semibold mb-1">{isEn ? "Disclaimer" : "免責事項"}</p>
      <p>
        {isEn
          ? "Information on this service is intended as general guidance on occupational safety and health. Always consult a qualified expert for specific legal or safety decisions. The maintainer accepts no liability for damages arising from use of this service."
          : "本サービスが提供する情報は、労働安全衛生に関する一般的な情報提供を目的としています。個別の法的判断・安全管理措置については、必ず専門家にご相談ください。本サービスの利用によって生じた損害について、運営者は責任を負いかねます。"}
      </p>
    </div>
  );
}
