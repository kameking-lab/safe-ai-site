import Link from "next/link";
import { ArrowUpRight, Bot, Calculator, ClipboardList, FlaskConical, Images, Presentation } from "lucide-react";
import { HomeChihuahuaCompanion } from "./home-chihuahua-companion";
import { HOME_FEATURED_LAW_REFORM } from "@/lib/home/effect-first-data";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

const tools = [
  { href: "/ky/paper", title: "KY用紙", copy: "作業の危険と対策を整理し、用紙にまとめる。", icon: ClipboardList },
  { href: "/chatbot", title: "安衛法AI", copy: "現場の疑問から、条文と一次資料を確認する。", icon: Bot },
  { href: "/chemical-ra", title: "化学物質RA", copy: "物質名・CAS・SDSから、確認事項を整理する。", icon: FlaskConical },
  { href: "/training/safety-seminars", title: "安全研修スライド", copy: "公開中の教材を、スライドと確認クイズで使う。", icon: Presentation },
  { href: "/materials/safety-images", title: "現場安全看板", copy: "用途に合わせて、安全看板の画像を選ぶ。", icon: Images },
  { href: "/construction-calc", title: "建設計算ツール", copy: "施工に必要な計算を、条件とともに確認する。", icon: Calculator },
] as const;
const wrap = "mx-auto max-w-[1200px] px-5 lg:px-10";
const focus = "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
const quietLink = `inline-flex min-h-11 min-w-11 items-center gap-2 underline underline-offset-4 ${focus}`;
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

export function HomeLP({ availability, latestNews }: { availability: AutomationConsultAvailability; latestNews: HomeLatestAccidentNews }) {
  const reform = HOME_FEATURED_LAW_REFORM;
  const report = latestNews.status === "live" ? latestNews.items[0] : undefined;
  const consultHref = availability.webFormEnabled === true ? "/services/automation#consult-form" : availability.contactMode === "mail_client" ? "/contact/automation-email" : "/services/automation";
  return (
    <div data-home-lp className="bg-[#F4F1E8] text-[#19251F] forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
      <style>{`
        #home-lp-title { font-size: 2.5rem; line-height: 1.22; }
        [data-home-lp] h2 { font-size: 1.875rem; line-height: 1.45; }
        [data-lp-tool] h3 { font-size: 1.25rem; }
        #home-news-heading { font-size: 1.5rem; }
        @media(min-width:1024px) {
          #home-lp-title { font-size: 4.5rem; }
          [data-home-lp] h2 { font-size: 2.25rem; }
          #home-news-heading { font-size: 1.5rem; }
        }
        html.large-font #home-lp-title { font-size: 2.5rem; }
        html.large-font [data-home-lp] h2 { font-size: 1.875rem; }
        html.large-font [data-lp-tool] h3 { font-size: 1.25rem; }
        [data-origin-copy] p { font-size: 1.125rem; line-height: 1.9; }
        html.large-font [data-origin-copy] p { font-size: 1.125rem; }
        @media(min-width:1024px) {
          html.large-font #home-lp-title { font-size: 4.5rem; }
          html.large-font [data-home-lp] h2 { font-size: 2.25rem; }
        }
        html.high-contrast [data-home-lp],
        html.high-contrast [data-home-lp] :where(section,aside,article,div,p,h1,h2,h3,span,figcaption,button) {
          background-color: #fff !important; color: #000 !important;
        }
        html.high-contrast [data-home-lp] :where(article,button,a[data-lp-tool]) {
          border-color: #000 !important;
        }
      `}</style>
      <section aria-labelledby="home-lp-title" className="bg-[#12201B] py-14 text-[#F4F1E8] lg:py-24 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
        <div className={`${wrap} grid gap-10 lg:grid-cols-[1.38fr_1fr] lg:items-center`}>
          <div>
            <p className="text-sm tracking-[.12em]">現場を支える人のために。</p>
            <h1 id="home-lp-title" className="mt-6 text-[40px] font-bold leading-[1.22] tracking-[-.04em] lg:text-[72px]">
              <span className="block">その書類、</span><span className="block">AIに任せて、</span><span className="block">現場に行こう。</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-[1.9] text-[#F4F1E8] lg:text-lg">毎日の書類づくりや調べ物を、少し軽く。現場を見て、仲間と話す時間をつくるための道具です。</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="#tools" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#DCEF9A] px-7 font-bold text-[#12201B] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#F4F1E8]">道具を使う <ArrowUpRight className="ml-3 h-4 w-4" aria-hidden="true" /></Link>
              <Link href="#consult" className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#F4F1E8]/50 px-6 font-medium focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#DCEF9A]">個別の自動化を相談する</Link>
            </div>
            <nav aria-label="すぐ使う道具" className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {tools.slice(0, 3).map((tool) => <Link key={tool.href} href={tool.href} className="inline-flex min-h-11 min-w-11 items-center underline underline-offset-4 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#DCEF9A]">{tool.title}</Link>)}
            </nav>
          </div>
          <HomeChihuahuaCompanion />
        </div>
      </section>

      <section id="tools" aria-labelledby="home-tools-heading" className={`${wrap} scroll-mt-24 py-14 lg:py-24`}>
        <p className="text-sm tracking-[.12em]">TOOLS FOR YOUR DAY</p>
        <h2 id="home-tools-heading" className="mt-3 text-3xl font-bold leading-snug lg:text-4xl">今日の仕事を、少し軽く。</h2>
        <p className="mt-4 leading-relaxed">いま必要な道具から、そのまま使えます。</p>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map(({ href, title, copy, icon: Icon }, index) => (
            <Link key={href} href={href} prefetch={false} data-lp-tool className={`group flex min-h-48 flex-col border border-[#19251F]/20 bg-[#FAF8F2] p-6 ${focus}`}>
              <div className="flex items-center justify-between"><Icon className="h-6 w-6" aria-hidden="true" /><span className="text-sm text-[#516054]">0{index + 1}</span></div>
              <h3 className="mt-6 flex items-center justify-between gap-2 text-xl font-bold">{title}<ArrowUpRight className="h-5 w-5 shrink-0" aria-hidden="true" /></h3>
              <p className="mt-3 text-sm leading-7 text-[#435248]">{copy}</p>
            </Link>
          ))}
        </div>
        <Link href="/features" className={`${quietLink} mt-6`}>すべての機能を見る <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
      </section>

      <section aria-labelledby="home-origin-heading" className="border-y border-[#B79A62]/40 bg-[#FAF8F2] px-5 py-14 lg:px-10 lg:py-24">
        <div className="mx-auto max-w-[680px]">
          <p className="text-sm tracking-[.12em]">このサイトの原点</p>
          <h2 id="home-origin-heading" className="mt-4 text-3xl font-bold leading-relaxed">仲間を守りたい。<br />それが、出発点です。</h2>
          <div data-origin-copy className="mt-8 space-y-6 text-lg leading-[1.9]">
            <p>私は、死亡事故で同僚を失いました。安全な計画を立てていれば、防げたかもしれない。あの時、現場に行けば、防げたかもしれない。その思いが、このサイトの原点です。</p>
            <p>防災や社会基盤を支える現場には、人が見て、考え、声をかける仕事があります。その仕事を担う人に、もう少し楽に、効率よく、誇りを持って働いてほしい。AIで手間を減らし、現場に向き合う時間を支えたいと考えています。</p>
          </div>
          <Link href="/about/project-story" className={`${quietLink} mt-7`}>このサイトに込めた思い <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <section id="consult" aria-labelledby="home-consult-heading" className="scroll-mt-24 bg-[#12201B] py-14 text-[#F4F1E8] lg:py-24 forced-colors:bg-[Canvas] forced-colors:text-[CanvasText]">
        <div className={wrap}>
          <div className="max-w-[680px]">
            <p className="text-sm tracking-[.12em]">WORK WITH YOU</p>
            <h2 id="home-consult-heading" className="mt-4 text-3xl font-bold leading-snug lg:text-4xl">ここにない自動化も、<br />ご相談ください。</h2>
            <p className="mt-6 text-base leading-[1.9] lg:text-lg">毎回の転記、Excelの集計、帳票づくり、通知の手間。「この作業、もっと楽にならないかな」と思ったら、今のやり方を教えてください。掲載している道具以外のことも、個別にご相談いただけます。</p>
            <Link href={consultHref} prefetch={false} className="mt-8 inline-flex min-h-12 items-center rounded-full bg-[#DCEF9A] px-7 font-bold text-[#12201B] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#F4F1E8]">自動化について相談する <ArrowUpRight className="ml-3 h-4 w-4" aria-hidden="true" /></Link>
            <p className="mt-4 text-sm leading-7">対応できる内容や費用は、相談内容に応じてご案内します。</p>
            <p className="mt-3 text-sm" data-consult-mode={availability.contactMode ?? "unavailable"}>現在の受付状態：{availability.label}{availability.contactMode === "mail_client" ? "（メールアプリを使います）" : !availability.accepting ? "。現在は受付停止中です。サービス内容は確認できます。" : ""}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="home-news-heading" className={`${wrap} py-14 lg:py-24`}>
        <h2 id="home-news-heading" className="text-2xl font-bold">現場に関わる、最近の情報。</h2>
        <div className="mt-7 grid gap-8 md:grid-cols-2">
          <article data-lp-news="law" className="border-t border-[#19251F]/30 pt-5">
            <p className="text-sm">法改正 · 施行日 <time dateTime={reform.effectiveAt}>{reform.effectiveAt}</time></p>
            <h3 className="mt-3 text-lg font-bold leading-relaxed"><Link href={`/laws#${reform.id}`} className={quietLink}>{reform.title}</Link></h3>
            <p className="mt-3 text-sm leading-7">{reform.target}</p>
            <p className="mt-3 text-sm leading-7">{reform.sourceState} · 確認時点の状態：{reform.status} · 確認日 <time dateTime={reform.checkedAt}>{reform.checkedAt}</time></p>
            <a href={reform.sourceUrl} className={`${quietLink} text-sm`}>{reform.sourceLabel}</a>
            <div><Link href="/laws" className={`${quietLink} text-sm`}>法改正の一覧を見る</Link></div>
          </article>
          <article data-lp-news="accident" className="border-t border-[#19251F]/30 pt-5">
            <p className="text-sm">労災事故速報 · 報道見出し・原因未確認</p>
            {report ? <><h3 className="mt-3 text-lg font-bold leading-relaxed"><a href={report.href} className={quietLink}>{report.title}</a></h3><p className="mt-3 text-sm leading-7"><time dateTime={report.publishedAt}>{dateFormatter.format(new Date(report.publishedAt))}</time> · {report.publisher}</p></> : <p className="mt-3 leading-7">直近の報道は現在取得できません。事故がなかったことを示すものではありません。</p>}
            <p className="mt-3 text-sm leading-7">出典：{latestNews.sourceLabel} · {latestNews.checkedAt ? <>確認日 <time dateTime={latestNews.checkedAt}>{dateFormatter.format(new Date(latestNews.checkedAt))}</time></> : "確認日未取得"}</p>
            <Link href="/accident-news" className={`${quietLink} text-sm`}>事故速報の一覧を見る</Link>
          </article>
        </div>
      </section>

      <aside className="border-t border-[#19251F]/20 px-5 py-8 lg:px-10">
        <div className="mx-auto max-w-[1120px] text-sm leading-7">
          <p>AIは調べ物や整理を補助します。大切な判断は、一次資料と現場条件を確認して行ってください。</p>
          <nav aria-label="利用と品質について" className="mt-2 flex flex-wrap gap-x-6"><Link href="/about/quality" className={quietLink}>品質について</Link><Link href="/about/data-sources" className={quietLink}>出典について</Link><Link href="/about/usage-notes" className={quietLink}>利用上の注意</Link></nav>
        </div>
      </aside>
    </div>
  );
}
