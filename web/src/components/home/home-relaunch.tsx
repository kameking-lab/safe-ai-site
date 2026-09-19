import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Boxes,
  FileClock,
  FlaskConical,
  Images,
  Newspaper,
  PawPrint,
  Presentation,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Workflow,
} from "lucide-react";
const MAIN_SERVICES = [
  {
    href: "/chatbot",
    title: "安衛法AI",
    description:
      "現場の言葉で質問し、条文・通達・適用条件を一次資料つきで確認。",
    action: "AIに聞く",
    icon: Bot,
    mascot: "/mascot/mascot-law-reading.webp",
    mascotAlt: "法令集を開いて相談に答えるチワワ",
    role: "現場を知る法令相談役",
    surface: "bg-[#dcefe9]",
    accent: "bg-[#176b57]",
    accentText: "text-[#176b57]",
    softAccent: "bg-[#b9ddd2]",
  },
  {
    href: "/chemical-ra",
    title: "化学物質RA",
    description: "物質名・CAS・SDSから、確認事項と公式RAへの道筋を整理。",
    action: "RAを始める",
    icon: FlaskConical,
    mascot: "/mascot/mascot-chemical-lab.webp",
    mascotAlt: "試験器具を使って化学物質を確認するチワワ",
    role: "化学物質の健康相談係",
    surface: "bg-[#f6ebcf]",
    accent: "bg-[#a85d17]",
    accentText: "text-[#8b4c12]",
    softAccent: "bg-[#ebc983]",
  },
  {
    href: "/accident-news",
    title: "労災事故速報",
    description: "速報・重大災害・類似事例を、出典と確認状態を見ながら追う。",
    action: "事故を確認",
    icon: Newspaper,
    mascot: "/mascot/mascot-news-read.webp",
    mascotAlt: "新聞を開いて労災事故速報を伝えるチワワ",
    role: "現場速報アナウンサー",
    surface: "bg-[#f3dfe0]",
    accent: "bg-[#9a3f49]",
    accentText: "text-[#8f3541]",
    softAccent: "bg-[#e5aeb3]",
  },
  {
    href: "/laws",
    title: "法改正速報",
    description: "施行日、対象、現場で先に変えることを短く把握。",
    action: "改正を確認",
    icon: FileClock,
    mascot: "/mascot/mascot-calendar-plan.webp",
    mascotAlt: "カレンダーで法改正の施行日を確認するチワワ",
    role: "法改正を追う取材記者",
    surface: "bg-[#e8e2f2]",
    accent: "bg-[#65508d]",
    accentText: "text-[#604984]",
    softAccent: "bg-[#c8b9df]",
  },
  {
    href: "/contact/automation-email",
    title: "自動化相談",
    description: "帳票、集計、研修資料、通知などの定型業務を見本つきで相談。",
    action: "メールで相談",
    icon: Workflow,
    mascot: "/mascot/mascot-tablet-dx.webp",
    mascotAlt: "タブレットを使って仕事の自動化を考えるチワワ",
    role: "業務改善エンジニア",
    surface: "bg-[#e6e1ee]",
    accent: "bg-[#704e7b]",
    accentText: "text-[#674571]",
    softAccent: "bg-[#cdbbd3]",
  },
  {
    href: "/goods",
    title: "安全グッズ",
    description:
      "作業条件から保護具・測定器・区画用品を絞り、そのまま購入検索へ。",
    action: "選び方を見る",
    icon: ShoppingBag,
    mascot: "/mascot/mascot-ppe-check.webp",
    mascotAlt: "保護具を点検して安全用品選びを手伝うチワワ",
    role: "頼れる安全用品店長",
    surface: "bg-[#dfeadd]",
    accent: "bg-[#407044]",
    accentText: "text-[#37633c]",
    softAccent: "bg-[#bcd4b8]",
  },
  {
    href: "/training/safety-seminars",
    title: "自由に使えるスライド",
    description: "安全20テーマ・AI20テーマを軸に、音声・PPTX・PDFで展開。",
    action: "公開資料を見る",
    icon: Presentation,
    mascot: "/mascot/mascot-teacher.webp",
    mascotAlt: "黒板の前で安全教育をする先生役のチワワ",
    role: "安全を伝える先生",
    surface: "bg-[#dce9ef]",
    accent: "bg-[#356b82]",
    accentText: "text-[#2f6277]",
    softAccent: "bg-[#b5d1dd]",
  },
  {
    href: "/materials/safety-images",
    title: "自由に使える画像集",
    description: "立入禁止と着用・表示を中心に、最初の5+5案を公開。",
    action: "画像を確認",
    icon: Images,
    mascot: "/mascot/mascot-pointing.webp",
    mascotAlt: "安全画像を指し示して案内するチワワ",
    role: "素材づくりの案内役",
    surface: "bg-[#d9ece7]",
    accent: "bg-[#2b7569]",
    accentText: "text-[#24685e]",
    softAccent: "bg-[#acd7cd]",
  },
  {
    href: "/accidents-analytics",
    title: "事故統計分析",
    description:
      "厚労省データと収録事例を分け、業種・型・地域・年齢など多軸で分析。",
    action: "傾向を分析",
    icon: BarChart3,
    mascot: "/mascot/mascot-detective.webp",
    mascotAlt: "虫眼鏡で事故統計を調べる探偵役のチワワ",
    role: "事故データ研究員",
    surface: "bg-[#eee5d7]",
    accent: "bg-[#8a6235]",
    accentText: "text-[#79542d]",
    softAccent: "bg-[#dac29e]",
  },
] as const;

export function HomeRelaunch() {
  const focusRing =
    "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-300 focus-visible:ring-offset-4 focus-visible:ring-offset-[#071b17]";

  return (
    <div className="overflow-hidden bg-[#071b17] text-white">
      <section
        aria-labelledby="home-relaunch-title"
        className="relative border-b border-white/10 px-4 py-8 sm:px-6 sm:py-12 lg:py-16"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          aria-hidden="true"
          style={{
            background:
              "radial-gradient(circle at 10% 20%, rgba(52,211,153,.22), transparent 32%), radial-gradient(circle at 78% 18%, rgba(14,165,233,.18), transparent 34%), linear-gradient(145deg,#071b17 0%,#0b2720 50%,#07141e 100%)",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl gap-7 min-[1360px]:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)] min-[1360px]:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-xs font-black tracking-[.14em] text-emerald-200">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              現場の声を聴く、小さな安全相棒
            </p>
            <h1
              id="home-relaunch-title"
              className="mt-5 max-w-5xl text-[clamp(1.9rem,7vw,4rem)] font-black leading-[1.08] tracking-[-.045em] sm:leading-[1.05]"
            >
              <span className="block whitespace-nowrap">小さな気づきが、</span>
              <span className="block whitespace-nowrap bg-gradient-to-r from-emerald-300 via-cyan-200 to-sky-300 bg-clip-text text-transparent forced-colors:bg-none forced-colors:text-[CanvasText]">
                大きな事故を防ぐ。
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-base font-bold leading-8 text-slate-200 sm:text-lg">
              大きな耳で現場の声を聴き、わずかな違和感を見逃さない。
              チワワは、安全を上から指導するのではなく、そばで確認を手伝う小さな相棒です。
            </p>

            <nav
              aria-label="すぐに使う主要機能"
              className="mt-6 grid gap-2 sm:grid-cols-3"
            >
              <Link
                href="/chatbot"
                prefetch={false}
                className={`group inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-emerald-300 px-4 text-sm font-black text-slate-950 shadow-[0_14px_36px_-16px_rgba(52,211,153,.9)] hover:bg-emerald-200 motion-safe:transition motion-safe:hover:-translate-y-0.5 ${focusRing}`}
              >
                <Bot className="h-5 w-5" aria-hidden="true" />
                安衛法AIを開く
                <ArrowRight
                  className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/chemical-ra"
                prefetch={false}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 motion-safe:transition-colors ${focusRing}`}
              >
                <FlaskConical
                  className="h-5 w-5 text-amber-200"
                  aria-hidden="true"
                />
                化学物質RAを開く
              </Link>
              <Link
                href="/resources/netis-safety"
                prefetch={false}
                className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 text-sm font-black text-white hover:bg-white/15 motion-safe:transition-colors ${focusRing}`}
              >
                <Boxes className="h-5 w-5 text-sky-200" aria-hidden="true" />
                安全技術を探す
              </Link>
            </nav>

            <ul
              aria-label="サービスの特徴"
              className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-bold text-slate-300"
            >
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                一次資料へのリンク表示
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                主要機能は登録なしで利用可
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck
                  className="h-4 w-4 text-emerald-300"
                  aria-hidden="true"
                />
                労働安全衛生コンサルタント監修
              </li>
            </ul>
          </div>

          <div className="relative mx-auto w-full max-w-[11rem] sm:max-w-xl">
            <div
              className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-br from-emerald-300/20 via-cyan-300/5 to-transparent blur-2xl"
              aria-hidden="true"
            />
            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/20 bg-[#102b24] p-2 shadow-2xl shadow-black/40">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.8rem] bg-[#d9efe6]">
                <Image
                  src="/mascot/mascot-chat-talk-v4.webp"
                  alt="吹き出しと一緒に相談を案内する安全AIポータルのチワワ"
                  fill
                  priority
                  sizes="(max-width: 639px) 11rem, (max-width: 1359px) 36rem, 34vw"
                  className="object-contain p-2 sm:p-4"
                />
                <div className="absolute inset-x-3 bottom-3 hidden rounded-2xl border border-white/60 bg-white/92 p-4 text-slate-950 shadow-lg backdrop-blur sm:block">
                  <p className="text-xs font-black tracking-[.12em] text-emerald-800">
                    YOUR SAFETY PARTNER
                  </p>
                  <p className="mt-1 text-xl font-black">
                    気になること、聞いてみる？
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-600">
                    法令確認から保護具選びまで、必要な仕事へ案内します。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="main-services-title"
        className="bg-[#091f1a] px-4 py-10 sm:px-6 sm:py-14"
      >
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-emerald-300">
                <PawPrint className="h-4 w-4" aria-hidden="true" />
                いつもの仕事を、相棒と
              </p>
              <h2
                id="main-services-title"
                className="mt-2 text-3xl font-black tracking-[-.03em] sm:text-4xl"
              >
                仕事から選ぶ、9つの主機能
              </h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                入口を厳選しました。その他の機能はページ下部の一覧から探せます。
              </p>
            </div>
            <Link
              href="/features"
              prefetch={false}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-black text-emerald-200 underline underline-offset-4 ${focusRing}`}
            >
              すべての機能
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-7 grid gap-4 sm:grid-cols-2 min-[1280px]:grid-cols-3">
            {MAIN_SERVICES.map((service, index) => {
              const Icon = service.icon;
              const cardClass = `group relative block min-h-[21rem] overflow-hidden rounded-[1.8rem] border border-white/15 bg-[#fffdf8] text-slate-900 shadow-[0_22px_55px_-34px_rgba(0,0,0,.95)] hover:border-white/40 hover:shadow-[0_26px_65px_-32px_rgba(0,0,0,.9)] motion-safe:transition motion-safe:hover:-translate-y-1 ${focusRing}`;
              const content = (
                <>
                  <div
                    className={`relative h-36 overflow-hidden ${service.surface}`}
                  >
                    <span
                      className={`absolute -left-8 -top-10 h-28 w-28 rounded-full ${service.softAccent} opacity-55`}
                      aria-hidden="true"
                    />
                    <span className="absolute left-4 top-4 z-10 inline-flex max-w-[58%] items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-[11px] font-black tracking-[.04em] text-slate-700 shadow-sm backdrop-blur">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${service.accentText}`}
                        aria-hidden="true"
                      />
                      {service.role}
                    </span>
                    <span className="absolute right-4 top-4 z-10 font-mono text-xs font-black text-slate-700/45">
                      0{index + 1}
                    </span>
                    <span
                      className="absolute bottom-2 left-5 z-10 rotate-[-9deg] text-slate-700/20"
                      aria-hidden="true"
                    >
                      <PawPrint className="h-9 w-9" />
                    </span>
                    <Image
                      src={service.mascot}
                      alt={service.mascotAlt}
                      width={192}
                      height={176}
                      loading="lazy"
                      sizes="12rem"
                      className="absolute -bottom-6 right-0 h-44 w-48 object-contain object-bottom drop-shadow-[0_12px_14px_rgba(25,45,38,.2)] motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-1 motion-safe:group-hover:scale-[1.04]"
                    />
                    <span
                      className={`absolute bottom-3 right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white text-white shadow-md ${service.accent}`}
                      aria-hidden="true"
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="flex min-h-[12rem] flex-col p-5">
                    <h3 className="text-xl font-black tracking-[-.02em] text-slate-950">
                      {service.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm font-semibold leading-6 text-slate-600">
                      {service.description}
                    </p>
                    <span
                      className={`mt-4 inline-flex min-h-10 w-fit items-center gap-2 rounded-full px-4 py-2 text-sm font-black text-white shadow-sm ${service.accent}`}
                    >
                      {service.action}
                      <ArrowRight
                        className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </>
              );
              return (
                <li key={service.title}>
                  <Link
                    href={service.href}
                    prefetch={false}
                    className={cardClass}
                  >
                    {content}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
