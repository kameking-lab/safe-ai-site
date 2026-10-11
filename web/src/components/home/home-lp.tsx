import Link from "next/link";
import { ChihuahuaButtonContent } from "@/components/chihuahua-button-content";
import Image from "next/image";
import { ArrowUpRight, BarChart3, Bot, Calculator, FlaskConical, Newspaper, ShieldCheck, Siren } from "lucide-react";
import { HomeChihuahuaCompanion } from "./home-chihuahua-companion";
import { HOME_FEATURED_LAW_REFORM } from "@/lib/home/effect-first-data";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import { homeLpClasses as styles } from "./home-lp-classes";
import { homeLpCriticalCss } from "./home-lp-critical-css";

const uses = [
  { id: "search", title: "安衛法・化学物質を調べる", copy: "現場の疑問を、根拠のある情報へ。", mascot: "chemical-lab", alt: "フラスコを持ち、化学物質の確認を案内するチワワ", tools: [
    { href: "/chatbot", title: "安衛法AI", copy: "作業や設備の疑問を質問し、適用条件と公式根拠を確認。", icon: Bot },
    { href: "/chemical-database", title: "化学物質検索", copy: "物質名・CAS番号から収録情報と出典へ。SDSはメーカーの最新版も確認。", icon: FlaskConical },
  ] },
  { id: "updates", title: "法改正・事故速報・統計を見る", copy: "新しい情報と、その背景を確かめる。", mascot: "news-read", alt: "新聞を持ち、最新情報の確認を案内するチワワ", tools: [
    { href: "/laws", title: "法改正", copy: "施行日、対象者、今やることを公式原文と確認。", icon: Newspaper },
    { href: "/accident-news", title: "労災事故速報", copy: "報道の見出しと出典・確認日へ。原因未確認の情報を区別。", icon: Siren },
    { href: "/accidents-analytics", title: "事故統計ダッシュボード", copy: "公式統計と収録事例を区別し、業種や事故型の傾向を確認。", icon: BarChart3 },
  ] },
  { id: "practice", title: "計算・保護具選定に使う", copy: "条件を整理して、次の確認へ進む。", mascot: "ppe-check", alt: "墜落制止用器具を確認し、保護具の選び方を案内するチワワ", tools: [
    { href: "/tools/construction-calculators", title: "現場計算ツール", copy: "数量や換算を条件とともに計算。安全適合の判定には使いません。", icon: Calculator },
    { href: "/goods", title: "保護具の選び方", copy: "危険・作業・現場条件から、選定時に確認することを整理。", icon: ShieldCheck },
  ] },
] as const;
const wrap = "mx-auto max-w-[1280px] px-5 lg:px-10";
const focus = "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
const quietLink = `inline-flex min-h-11 min-w-11 items-center gap-2 underline underline-offset-4 ${focus}`;
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

export function HomeLP({ availability, latestNews }: { availability: AutomationConsultAvailability; latestNews: HomeLatestAccidentNews }) {
  const reform = HOME_FEATURED_LAW_REFORM;
  const report = latestNews.status === "live" ? latestNews.items[0] : undefined;
  const consultHref = availability.webFormEnabled === true ? "/services/automation#consult-form" : availability.contactMode === "mail_client" ? "/contact/automation-email" : "/services/automation";
  return (
    <div data-home-lp className={styles.root}>
      <style data-home-lp-critical>{homeLpCriticalCss}</style>
      <section aria-labelledby="home-lp-title" className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>現場を支える人のための、安全と業務の道具。</p>
            <h1 id="home-lp-title" className={styles.title}><span>その書類、</span><span>AIに任せて、</span><span>現場に行こう。</span></h1>
            <p className={styles.heroDescription}>安衛法や化学物質を調べる。法改正や事故の情報を確かめる。計算や保護具選定に使う。必要な情報への道筋をつくり、現場で判断する時間を支えます。</p>
            <div className={styles.actions}>
              <Link href="#tools" className={styles.primary}><ChihuahuaButtonContent variant="tools" trailing={<ArrowUpRight size={16} aria-hidden="true" />}>道具を使う</ChihuahuaButtonContent></Link>
              <Link href="#consult" className={styles.secondary}><ChihuahuaButtonContent variant="consult" trailing={<ArrowUpRight size={16} aria-hidden="true" />}>自動化を相談する</ChihuahuaButtonContent></Link>
            </div>
          </div>
          <div>
            <div className={styles.demoPaper} data-information-preview>
              <div className={styles.demoHeading}><span>調べる、確かめる。</span><span>機能の案内</span></div>
              <nav aria-label="すぐ使う道具" className={styles.previewLinks}>
                <Link href="/chatbot" prefetch={false}><Bot size={20} aria-hidden="true" /><span><strong>安衛法AI</strong><small>作業条件 → 条文・公式根拠</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
                <Link href="/chemical-database" prefetch={false}><FlaskConical size={20} aria-hidden="true" /><span><strong>化学物質検索</strong><small>物質名・CAS番号 → 収録情報・出典</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
                <Link href="/accidents-analytics" prefetch={false}><BarChart3 size={20} aria-hidden="true" /><span><strong>事故統計</strong><small>公式統計と収録事例を分けて確認</small></span><ArrowUpRight size={16} aria-hidden="true" /></Link>
              </nav>
              <p className={styles.demoFoot}>条文や出典、集計の対象を、各機能で確認できます。</p>
            </div>
            <HomeChihuahuaCompanion />
          </div>
        </div>
      </section>
      <section id="tools" aria-labelledby="home-tools-heading" className={styles.section}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionLabel}>TOOLS FOR YOUR DAY</p><h2 id="home-tools-heading">今日の仕事に、すぐ使える。</h2><p>調べる。情報を確かめる。条件を整理する。現場の仕事に合わせて、3つの入口から。</p></div><Link href="/features" className={quietLink}>すべての機能を見る <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className={styles.purposeGrid}>{uses.map((use, index) => <div key={use.id} data-lp-use={use.id} className={styles.purpose}>
          <div className={styles.purposeHeading}><span className={styles.purposeNumber}>0{index + 1}</span><Image src={`/mascot/mascot-${use.mascot}.webp`} alt={use.alt} width={120} height={140} sizes="120px" className={styles.purposeMascot} /></div>
          <h3 className={styles.purposeTitle}>{use.title}</h3><p className={styles.purposeCopy}>{use.copy}</p>
          <div className={styles.toolGrid}>{use.tools.map(({ href, title, copy, icon: Icon }) => <Link key={href} href={href} prefetch={false} data-lp-tool className={styles.tool}><div className={styles.toolCaption}><Icon size={22} aria-hidden="true" />{href === "/tools/construction-calculators" ? <Image src="/mascot/mascot-calculator.webp" alt="電卓を持ち、計算を案内するチワワ" width={72} height={84} sizes="72px" /> : <ArrowUpRight size={20} aria-hidden="true" />}</div><h4>{title}</h4><p>{copy}</p></Link>)}</div>
        </div>)}</div>
        <nav aria-label="ほかの現場支援ツール" className={styles.supportLinks}><Link href="/chemical-ra" prefetch={false}>化学物質RA</Link><Link href="/ky/paper" prefetch={false}>KY用紙</Link><Link href="/training/safety-seminars" prefetch={false}>安全研修スライド</Link><Link href="/materials/safety-images" prefetch={false}>現場安全看板</Link></nav>

      </section>
      <section aria-labelledby="home-origin-heading" className={styles.value}>
        <div className={styles.valueGrid}><p className={styles.sectionLabel}>TIME FOR THE FIELD</p><div><h2 id="home-origin-heading">現場に向き合う時間を、もっと。</h2><div data-origin-copy><p>安全な仕事を支えるのは、現場を知る人の目と判断です。書類づくりや情報整理の負担を減らし、現場を確かめ、仲間と話す時間を増やす。安全AIポータルは、そのための道具をつくっています。</p><p>仲間を守り、仕事に誇りを持って働ける毎日を支えたいと考えています。</p></div><Link href="/about/project-story" className={`${quietLink} mt-7`}>このサイトについて <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
      </section>
      <section id="consult" aria-labelledby="home-consult-heading" className={styles.consult}>
        <div className={styles.consultGrid}><div><p className={styles.sectionLabel}>WORK WITH YOU</p><h2 id="home-consult-heading">その「毎回同じ作業」、<br />一緒に見直しませんか。</h2></div><div><p>転記、Excelの集計、通知、研修資料の準備。KY用紙などの帳票は現場ごとに書式や運用が異なります。いつもの手順と必要な項目を伺い、案件に合ったカスタマイズや自動化をご案内します。</p><Link href={consultHref} prefetch={false} className={`${styles.primary} mt-7`}><ChihuahuaButtonContent trailing={<ArrowUpRight size={16} aria-hidden="true" />}>自動化について相談する</ChihuahuaButtonContent></Link><p className={styles.consultNote}>対応できる内容や費用は、相談内容に応じてご案内します。</p><p className={styles.consultNote} data-consult-mode={availability.contactMode ?? "unavailable"}>現在の受付状態：{availability.label}{availability.contactMode === "mail_client" ? "（メールアプリを使います）" : !availability.accepting ? "。現在は受付停止中です。サービス内容は確認できます。" : ""}</p></div></div>
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


      <aside className={styles.quality}><p>AIは調べ物や整理を補助します。大切な判断は、一次資料と現場条件を確認して行ってください。</p><nav aria-label="利用と品質について" className="mt-2 flex flex-wrap gap-x-6"><Link href="/about/quality" className={quietLink}>品質について</Link><Link href="/about/data-sources" className={quietLink}>出典について</Link><Link href="/about/usage-notes" className={quietLink}>利用上の注意</Link></nav></aside>
    </div>
  );
}
