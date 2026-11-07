"use client";

import Link from "next/link";
import {
  ArrowRight,
  Bot,
  ClipboardList,
  Database,
  GraduationCap,
  LayoutGrid,
  ListChecks,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { isPublicRouteAvailable } from "@/lib/public-content-policy";

type FeatureLink = { href: string; label: string };
type FeatureCategory = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  visible: FeatureLink[];
  more: FeatureLink[];
};

const DIRECTORY_STYLES = `
.hd-s{position:relative;overflow:hidden;border-top:2px solid #e2e8f0;background:#f3efe5;padding:3rem 1rem}.hd-p{pointer-events:none;position:absolute;inset:0;background-image:radial-gradient(circle at 1px 1px,rgb(15 23 42/.08) 1px,transparent 0);background-size:22px 22px}.hd-i{position:relative;max-width:80rem;margin-inline:auto}.hd-e{color:#065f46;font-size:.75rem;font-weight:900;letter-spacing:.18em}.hd-t{margin-top:.5rem;color:#020617;font-size:1.875rem;font-weight:900;line-height:1.15;letter-spacing:-.025em}.hd-lead{max-width:42rem;margin-top:.5rem;color:#334155;font-size:.875rem;font-weight:500;line-height:1.5rem}.hd-g{display:grid;gap:1rem;margin-top:1.75rem}.hd-c{--b:#6ee7b7;--bg:#ecfdf5;--a:#047857;overflow:hidden;padding:.75rem;border:2px solid var(--b);border-radius:1.5rem;background:var(--bg);box-shadow:0 20px 45px -35px rgb(15 23 42/.65);transition:transform .2s,box-shadow .2s}.hd-c:nth-child(1){--b:#fdba74;--bg:#fff7ed;--a:#ea580c}.hd-c:nth-child(2){--b:#7dd3fc;--bg:#f0f9ff;--a:#0369a1}.hd-c:nth-child(3){--b:#a5b4fc;--bg:#eef2ff;--a:#4338ca}.hd-c:nth-child(4){--b:#fcd34d;--bg:#fffbeb;--a:#d97706}.hd-c:nth-child(5){--b:#fda4af;--bg:#fff1f2;--a:#be123c}.hd-c:nth-child(6){--b:#5eead4;--bg:#f0fdfa;--a:#0f766e}.hd-c:nth-child(7){--b:#c4b5fd;--bg:#f5f3ff;--a:#6d28d9}.hd-c:hover{box-shadow:0 12px 25px -16px rgb(15 23 42/.55);transform:translateY(-.25rem)}.hd-h{display:flex;min-height:4rem;align-items:center;gap:.75rem;padding-inline:.5rem}.hd-h h3{color:#020617;font-size:1rem;font-weight:900}.hd-icon{display:flex;width:2.75rem;height:2.75rem;flex:none;align-items:center;justify-content:center;border-radius:.75rem;background:var(--a);color:#fff;box-shadow:0 1px 2px rgb(15 23 42/.16)}.hd-icon svg,.hd-arrow{width:1.1rem;height:1.1rem}.hd-n{margin-left:auto;color:#334155;font-size:.75rem;font-weight:900}.hd-list{display:grid;gap:.25rem}.hd-link{display:flex;min-height:2.75rem;align-items:center;justify-content:space-between;gap:.5rem;border-radius:.5rem;padding:.5rem .75rem;color:#1e293b;font-size:.875rem;font-weight:700}.hd-link:hover{background:rgb(255 255 255/.72)}.hd-link:focus-visible,.hd-summary:focus-visible{outline:4px solid #6ee7b7;outline-offset:1px}.hd-arrow{flex:none;color:#065f46;transition:transform .2s}.hd-link:hover .hd-arrow{transform:translateX(.25rem)}.hd-more{margin-top:.25rem;padding-top:.25rem;border-top:1px solid #cbd5e1}.hd-summary{min-height:2.75rem;cursor:pointer;border-radius:.5rem;padding:.75rem;color:#064e3b;font-size:.875rem;font-weight:900}
@media(min-width:640px){.hd-s{padding-block:4rem}.hd-t{font-size:2.25rem}.hd-g{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(min-width:1280px){.hd-g{grid-template-columns:repeat(4,minmax(0,1fr))}}@media(max-width:480px){.hd-e,.hd-n{font-size:.875rem;line-height:1.45}}@media(prefers-reduced-motion:reduce){.hd-c,.hd-arrow{transition:none}.hd-c:hover,.hd-link:hover .hd-arrow{transform:none}}
.dark .hd-s{border-color:#1e293b;background:#020617}.dark .hd-p{opacity:.2}.dark .hd-e{color:#a7f3d0}.dark .hd-t{color:#fff}.dark .hd-lead{color:#cbd5e1}.dark .hd-c{--b:#334155;--bg:#0f172a}.dark .hd-h h3,.dark .hd-link,.dark .hd-n{color:#f1f5f9}.dark .hd-more{border-color:#334155}.dark .hd-summary,.dark .hd-arrow{color:#a7f3d0}.dark .hd-link:hover{background:rgb(6 78 59/.4)}
@media(forced-colors:active){.hd-p{display:none}.hd-c{border-color:CanvasText;background:Canvas}.hd-icon{border:1px solid CanvasText;background:Canvas;color:CanvasText}}
`;

const CATEGORIES: FeatureCategory[] = [
  {
    title: "今日使う",
    icon: ShieldCheck,
    visible: [
      { href: "/risk", label: "朝礼3分セット" },
      { href: "/risk", label: "今日の安全" },
      { href: "/signage", label: "サイネージ" },
    ],
    more: [
      { href: "/notifications", label: "通知設定" },
      { href: "/whats-new", label: "新着情報" },
    ],
  },
  {
    title: "帳票を作る",
    icon: ClipboardList,
    visible: [
      { href: "/ky/paper", label: "KY用紙" },
      { href: "/safety-diary", label: "安全工程打合せ書" },
      { href: "/site-records", label: "現場帳票" },
    ],
    more: [
      { href: "/strategy/plan-generator", label: "年次安全衛生計画" },
      { href: "/work-environment-measurement", label: "作業環境測定" },
    ],
  },
  {
    title: "法令・資格",
    icon: Scale,
    visible: [
      { href: "/law-search", label: "法令検索" },
      { href: "/education-certification/finder", label: "資格Finder" },
      { href: "/law-navi", label: "法令ナビ" },
    ],
    more: [
      { href: "/laws", label: "法改正" },
      { href: "/circulars", label: "通達・判例" },
      { href: "/law-hierarchy", label: "法令体系" },
    ],
  },
  {
    title: "事故・化学物質",
    icon: Database,
    visible: [
      { href: "/accidents", label: "事故検索" },
      { href: "/chemical-ra", label: "化学物質RA" },
      { href: "/chemical-database", label: "化学物質DB" },
    ],
    more: [
      { href: "/accidents-analytics", label: "事故統計" },
      { href: "/accident-news", label: "国内の死亡事故速報" },
    ],
  },
  {
    title: "教育・講習",
    icon: GraduationCap,
    visible: [
      { href: "/training/visual-ky", label: "5分ビジュアルKYT" },
      { href: "/education-certification", label: "特別教育・技能講習" },
      { href: "/guides", label: "安全ガイド" },
    ],
    more: [
      { href: "/e-learning", label: "Eラーニング（検証状況）" },
      { href: "/glossary", label: "安全用語" },
      { href: "/faq", label: "よくある質問" },
    ],
  },
  {
    title: "計画・管理",
    icon: ListChecks,
    visible: [
      { href: "/strategy/plan-generator", label: "年次計画" },
      { href: "/safety-ai", label: "安全AIの導入" },
      { href: "/favorites", label: "お気に入り" },
    ],
    more: [
      { href: "/industries", label: "業種別対策" },
      { href: "/mental-health-management", label: "メンタル対策" },
    ],
  },
  {
    title: "AI・自動化",
    icon: Bot,
    visible: [
      { href: "/services/automation", label: "業務自動化相談" },
      { href: "/chatbot", label: "法令の根拠検索" },
      { href: "/risk-prediction", label: "リスク予測" },
    ],
    more: [
      { href: "/safety-ai", label: "安全AI" },
      { href: "/contact", label: "改善提案" },
    ],
  },
  {
    title: "全機能",
    icon: LayoutGrid,
    visible: [
      { href: "/features", label: "全機能一覧" },
      { href: "/search", label: "サイト内検索" },
      { href: "/goods", label: "安全グッズ" },
    ],
    more: [
      { href: "/about", label: "運営情報" },
      { href: "/whats-new", label: "更新情報" },
    ],
  },
];

function FeatureList({ links }: { links: FeatureLink[] }) {
  const availableLinks = links.filter((item) =>
    isPublicRouteAvailable(item.href),
  );
  return (
    <ul className="hd-list">
      {availableLinks.map((item) => (
        <li key={`${item.href}-${item.label}`}>
          <Link href={item.href} prefetch={false} className="hd-link">
            {item.label}
            <ArrowRight className="hd-arrow" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function HomeFeatureDirectory() {
  return (
    <section
      aria-labelledby="home-feature-directory"
      className="hd-s home-render-skip-section home-skip-directory"
    >
      <style>{DIRECTORY_STYLES}</style>
      <div className="hd-p" aria-hidden="true" />
      <div className="hd-i">
        <p className="hd-e">EXPLORE THE PORTAL</p>
        <h2
          id="home-feature-directory"
          aria-label="カテゴリから探す"
          className="hd-t"
        >
          目的を変えて、もっと探す
        </h2>
        <p className="hd-lead">
          同じ見た目の一覧ではなく、仕事の場面ごとに入口を色分けしました。
        </p>
        <div className="hd-g">
          {CATEGORIES.map(({ title, icon: Icon, visible, more }, index) => (
            <article key={title} className="hd-c">
              <div className="hd-h">
                <span className="hd-icon">
                  <Icon aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <span className="hd-n">0{index + 1}</span>
              </div>
              <FeatureList links={visible} />
              <details className="hd-more">
                <summary className="hd-summary">
                  <span aria-hidden="true">すべて見る</span>
                  <span className="sr-only">：{title}</span>
                </summary>
                <FeatureList links={more} />
              </details>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
