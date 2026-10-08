import Link from "next/link";
import { ArrowUpRight, Bot, Calculator, ClipboardList, FlaskConical, Images, Presentation } from "lucide-react";
import { HomeChihuahuaCompanion } from "./home-chihuahua-companion";
import { HOME_FEATURED_LAW_REFORM } from "@/lib/home/effect-first-data";
import type { AutomationConsultAvailability } from "@/lib/automation-consult/availability";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";
import styles from "./home-lp.module.css";

const tools = [
  { href: "/ky/paper", title: "KY用紙", copy: "作業の危険と対策を整理し、用紙にまとめる。", icon: ClipboardList, kind: "ky" },
  { href: "/chatbot", title: "安衛法AI", copy: "現場の疑問から、条文と一次資料を確認する。", icon: Bot, kind: "law" },
  { href: "/chemical-ra", title: "化学物質RA", copy: "物質名・CAS・SDSから、確認事項を整理する。", icon: FlaskConical, kind: "chemical" },
  { href: "/training/safety-seminars", title: "安全研修スライド", copy: "公開中の教材を、スライドと確認クイズで使う。", icon: Presentation, kind: "slides" },
  { href: "/materials/safety-images", title: "現場安全看板", copy: "用途に合わせて、安全看板の画像を選ぶ。", icon: Images, kind: "sign" },
  { href: "/construction-calc", title: "建設計算ツール", copy: "施工に必要な計算を、条件とともに確認する。", icon: Calculator, kind: "calc" },
] as const;
const wrap = "mx-auto max-w-[1280px] px-5 lg:px-10";
const focus = "focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#638332]";
const quietLink = `inline-flex min-h-11 min-w-11 items-center gap-2 underline underline-offset-4 ${focus}`;
const dateFormatter = new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" });

function ToolSketch({ kind }: { kind: typeof tools[number]["kind"] }) {
  return <div className={styles.sketch} aria-hidden="true" data-tool-sketch={kind}>
    {kind === "ky" ? <><span className={styles.sketchLabel}>KY / 4 STEPS</span><div className={styles.flow}>{["作業", "危険", "対策", "確認"].map((step, i) => <span key={step}><b>0{i + 1}</b>{step}</span>)}</div><div className={styles.paperLines}><i /><i /><i /></div></>
      : kind === "law" ? <><span className={styles.sketchLabel}>QUESTION → SOURCE</span><div className={styles.questionLine}>現場の疑問</div><div className={styles.sourceCards}><span>条文</span><span>一次資料</span></div></>
        : <><span className={styles.sketchLabel}>{kind === "chemical" ? "IDENTIFY / REVIEW" : kind === "slides" ? "LEARN / CHECK" : kind === "sign" ? "SELECT / SHARE" : "INPUT / CALCULATE"}</span><div className={styles.miniDiagram}>{kind === "chemical" ? <><span>物質</span><i>→</i><span>確認事項</span></> : kind === "slides" ? <><span>教材</span><i>→</i><span>クイズ</span></> : kind === "sign" ? <><span>用途</span><i>→</i><span>看板</span></> : <><span>条件</span><i>→</i><span>計算</span></>}</div></>}
  </div>;
}

export function HomeLP({ availability, latestNews }: { availability: AutomationConsultAvailability; latestNews: HomeLatestAccidentNews }) {
  const reform = HOME_FEATURED_LAW_REFORM;
  const report = latestNews.status === "live" ? latestNews.items[0] : undefined;
  const consultHref = availability.webFormEnabled === true ? "/services/automation#consult-form" : availability.contactMode === "mail_client" ? "/contact/automation-email" : "/services/automation";
  return (
    <div data-home-lp className={styles.root}>
      <section aria-labelledby="home-lp-title" className={styles.hero}>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>現場を支える人のための、安全と業務の道具。</p>
            <h1 id="home-lp-title" className={styles.title}><span>その書類、</span><span>AIに任せて、</span><span>現場に行こう。</span></h1>
            <p className={styles.heroDescription}>書類づくりや調べ物の手間を減らし、現場を見て、仲間と話す時間へ。安全業務に使える道具と、仕事に合わせた自動化を届けます。</p>
            <div className={styles.actions}>
              <Link href="#tools" className={styles.primary}>道具を使う <ArrowUpRight size={16} aria-hidden="true" /></Link>
              <Link href="#consult" className={styles.secondary}>自動化を相談する <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </div>
            <nav aria-label="すぐ使う道具" className={styles.quickLinks}>{tools.slice(0, 3).map((tool, i) => <Link key={tool.href} href={tool.href}>{["KY", "安衛法AI", "化学RA"][i]} <ArrowUpRight size={13} aria-hidden="true" /></Link>)}</nav>
          </div>
          <HomeChihuahuaCompanion />
        </div>
      </section>
      <section id="tools" aria-labelledby="home-tools-heading" className={styles.section}>
        <div className={styles.sectionHeader}><div><p className={styles.sectionLabel}>TOOLS FOR YOUR DAY</p><h2 id="home-tools-heading">今日の仕事に、すぐ使える。</h2><p>書類をつくる。根拠を調べる。伝える資料をそろえる。いま必要な道具から始められます。</p></div><Link href="/features" className={quietLink}>すべての機能を見る <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        <div className={styles.toolGrid}>{tools.map(({ href, title, copy, icon: Icon, kind }, index) => <Link key={href} href={href} prefetch={false} data-lp-tool className={`${styles.tool} ${index < 2 ? styles.majorTool : ""}`}><div className={styles.toolCaption}><Icon size={22} aria-hidden="true" /><span>0{index + 1}</span></div><ToolSketch kind={kind} /><h3>{title}<ArrowUpRight size={20} aria-hidden="true" /></h3><p>{copy}</p></Link>)}</div>
      </section>
      <section aria-labelledby="home-origin-heading" className={styles.value}>
        <div className={styles.valueGrid}><p className={styles.sectionLabel}>TIME FOR THE FIELD</p><div><h2 id="home-origin-heading">現場に向き合う時間を、もっと。</h2><div data-origin-copy><p>安全な仕事を支えるのは、現場を知る人の目と判断です。書類づくりや情報整理の負担を減らし、現場を確かめ、仲間と話す時間を増やす。安全AIポータルは、そのための道具をつくっています。</p><p>仲間を守り、仕事に誇りを持って働ける毎日を支えたいと考えています。</p></div><Link href="/about/project-story" className={`${quietLink} mt-7`}>このサイトについて <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div>
      </section>
      <section id="consult" aria-labelledby="home-consult-heading" className={styles.consult}>
        <div className={styles.consultGrid}><div><p className={styles.sectionLabel}>WORK WITH YOU</p><h2 id="home-consult-heading">その「毎回同じ作業」、<br />一緒に見直しませんか。</h2></div><div><p>転記、Excelの集計、帳票づくり、通知、研修資料の準備。いつもの手順を教えてください。仕事に合った自動化の進め方をご案内します。</p><Link href={consultHref} prefetch={false} className={`${styles.primary} mt-7`}>自動化について相談する <ArrowUpRight size={16} aria-hidden="true" /></Link><p className={styles.consultNote}>対応できる内容や費用は、相談内容に応じてご案内します。</p><p className={styles.consultNote} data-consult-mode={availability.contactMode ?? "unavailable"}>現在の受付状態：{availability.label}{availability.contactMode === "mail_client" ? "（メールアプリを使います）" : !availability.accepting ? "。現在は受付停止中です。サービス内容は確認できます。" : ""}</p></div></div>
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
