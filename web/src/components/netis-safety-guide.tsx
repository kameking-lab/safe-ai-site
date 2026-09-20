import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ExternalLink,
  HardHat,
  RadioTower,
  ScanEye,
  ShieldCheck,
  ThermometerSun,
} from "lucide-react";

const NETIS_SEARCH_URL = "https://www.netis.mlit.go.jp/netis/input/pubsearch/search";
const NETIS_RELEASE_URL = "https://www.mlit.go.jp/report/press/kanbo08_hh_001326.html";

function netisDetailUrl(registrationNumber: string) {
  // NETISの詳細画面は、評価記号（-A / -VE など）を除いた登録番号を
  // regNo に渡す。searchresult?contextData=... は登録番号検索にならず、
  // 条件なしの全件一覧へ遷移するため使用しない。
  const detailRegistrationNumber = registrationNumber.replace(/-(?:A|V?E)$/i, "");
  return `https://www.netis.mlit.go.jp/netis/pubsearch/details?regNo=${detailRegistrationNumber}`;
}

export const FEATURED_NETIS_TECHNOLOGIES = [
  {
    category: "重機接触",
    name: "ヒヤリハンター（接近検知警報システム）",
    registrationNumber: "CG-200009-VE",
    mechanism: "作業員が携帯するICタグを重機側の磁界で識別し、接近時に運転者へブザーと表示灯で知らせます。",
    useCase: "死角・夜間・粉じん下を含む、重機やフォークリフト周辺の接近管理。",
    productUrl: "https://matrix-inc.co.jp/product/hiyarihunter/hiyari-v2.html",
  },
  {
    category: "立入警報",
    name: "超音波警報センサー・パノラマ0プレミアム",
    registrationNumber: "KT-180097-VE",
    mechanism: "重機後部の超音波センサーが人や物体を検知し、周辺作業員には音声、運転者には電子音で警告します。",
    useCase: "重機後端・旋回範囲など、立入禁止区域への接近の注意喚起。",
    productUrl: "https://www.tukusi.co.jp/commodity/list/631.html",
  },
  {
    category: "AI人物検知",
    name: "重機取付型セーフティカメラシステム「ドボレコJK」",
    registrationNumber: "KK-210060-VE",
    mechanism: "2台の広角カメラとAI人物検知で重機周辺の死角を監視し、映像とアラートで運転者へ通知します。",
    useCase: "タグを持たない来訪者も通る現場での、重機後方・側方の接触防止支援。",
    productUrl: "https://www.iwasakinet.co.jp/rental/construction-ict-support/xacti-doboleko-jk/",
  },
  {
    category: "墜落防止",
    name: "安全帯フックかけ忘れ防止装置「ハーネスノーティファイ」",
    registrationNumber: "KT-230282-A",
    mechanism: "後付けスイッチでフックの使用状態を検出し、不使用時に本人へ音と光で警告します。",
    useCase: "高所作業でのフック掛け忘れ防止と、使用状況ログによる安全管理。",
    productUrl: "https://ronk-jp.com/wp-content/uploads/2024/08/923a78cb58e3840064f71fca56ccd563.pdf",
  },
  {
    category: "危険区域監視",
    name: "移動式ネットワークカメラ「MICS AI」",
    registrationNumber: "QS-210006-A",
    mechanism: "設定した侵入エリアへの人物進入をAIカメラが検知し、現地警報と写真付き通知を行います。",
    useCase: "資材ヤード、開口部周辺、無人時間帯を含む危険区域の遠隔監視。",
    productUrl: "https://assistyou-m.com/mics/mics_ai/",
  },
] as const;

const SAFETY_TECHNOLOGY_AREAS = [
  {
    title: "重機接触を減らす",
    searchTerms: "重機 接触 人検知 接近警報",
    description: "カメラ、AI画像認識、ビーコン、測距などで作業員の接近を検知し、運転者・作業員へ知らせる技術。",
    checks: "死角、検知範囲、遅延、雨天・粉じん、誤報時の運用",
    icon: ScanEye,
  },
  {
    title: "立入禁止区域を守る",
    searchTerms: "立入 検知 警報 区画",
    description: "侵入検知、仮設ゲート、無線通知などで、吊り荷下・旋回範囲・掘削部への立入りを知らせる技術。",
    checks: "区域の定義、警報対象、電源喪失、誘導員との役割分担",
    icon: RadioTower,
  },
  {
    title: "墜落・転落を防ぐ",
    searchTerms: "墜落 転落 高所 足場 安全",
    description: "高所作業の状態把握、開口部対策、足場点検、フルハーネス使用確認などを支援する技術。",
    checks: "法定措置を代替しないこと、使用環境、取付条件、点検方法",
    icon: HardHat,
  },
  {
    title: "暑熱・作業環境を見える化",
    searchTerms: "暑熱 WBGT 作業環境 遠隔監視",
    description: "WBGT、温湿度、作業者状態などを計測・共有し、休憩・中止判断を支援する技術。",
    checks: "校正、測定位置、通信断、個人情報、判断責任者",
    icon: ThermometerSun,
  },
] as const;

export function NetisSafetyGuide({ compact = false }: { compact?: boolean }) {
  return (
    <section
      aria-labelledby={compact ? "netis-cross-link-title" : "netis-safety-guide-title"}
      className={
        compact
          ? "rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 p-5 dark:border-sky-900 dark:from-sky-950/30 dark:via-slate-950 dark:to-emerald-950/30"
          : "py-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-black tracking-[.14em] text-sky-800 dark:text-sky-300">
            <Boxes className="h-4 w-4" aria-hidden="true" />
            国土交通省 NETIS
          </p>
          <h2
            id={compact ? "netis-cross-link-title" : "netis-safety-guide-title"}
            className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white"
          >
            安全課題から新技術を探す
          </h2>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            技術名を先に決めず、「どの危険を減らしたいか」から検索語と確認条件を整理します。
            掲載状態・登録番号・評価情報は、購入や採用の直前にNETIS公式画面で再確認してください。
          </p>
        </div>
        <a
          href={NETIS_SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-sky-800 px-4 text-sm font-black text-white hover:bg-sky-900"
        >
          NETIS公式検索
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>

      <div className={compact ? "mt-5" : "mt-7"}>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-black tracking-[.12em] text-emerald-800 dark:text-emerald-300">VERIFIED EXAMPLES</p>
            <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
              具体的な安全技術 5選
            </h3>
          </div>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">2026年9月19日確認</p>
        </div>

        {compact ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {FEATURED_NETIS_TECHNOLOGIES.map((technology) => (
              <a
                key={technology.registrationNumber}
                href={netisDetailUrl(technology.registrationNumber)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${technology.name} ${technology.registrationNumber}をNETIS公式で確認`}
                className="group rounded-xl border border-sky-200 bg-white px-3 py-3 transition hover:border-sky-400 hover:shadow-sm dark:border-sky-900 dark:bg-slate-900"
              >
                <span className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300">{technology.category}</span>
                <span className="mt-1 block text-xs font-black leading-5 text-slate-950 group-hover:text-sky-900 dark:text-white dark:group-hover:text-sky-200">{technology.name}</span>
                <span className="mt-1 block font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">{technology.registrationNumber}</span>
              </a>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {FEATURED_NETIS_TECHNOLOGIES.map((technology) => (
              <article key={technology.registrationNumber} className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-black text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{technology.category}</span>
                  <span className="font-mono text-xs font-black text-sky-800 dark:text-sky-300">{technology.registrationNumber}</span>
                </div>
                <h4 className="mt-3 text-base font-black leading-6 text-slate-950 dark:text-white">{technology.name}</h4>
                <dl className="mt-3 space-y-2 text-sm leading-6">
                  <div>
                    <dt className="font-black text-slate-950 dark:text-white">仕組み</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{technology.mechanism}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-slate-950 dark:text-white">向いている現場</dt>
                    <dd className="text-slate-700 dark:text-slate-200">{technology.useCase}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-black">
                  <a href={netisDetailUrl(technology.registrationNumber)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sky-900 underline underline-offset-4 dark:text-sky-200">
                    NETIS公式で照合
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                  <a href={technology.productUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-emerald-900 underline underline-offset-4 dark:text-emerald-200">
                    技術・製品情報
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
          登録番号の末尾、掲載期間、評価情報、販売・レンタル条件は更新されます。導入前に必ずNETIS公式と提供元の最新情報を照合してください。
        </p>
      </div>

      {!compact ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {SAFETY_TECHNOLOGY_AREAS.map((area) => {
            const Icon = area.icon;
            return (
              <article key={area.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="text-lg font-black text-slate-950 dark:text-white">{area.title}</h3>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-200">{area.description}</p>
                <dl className="mt-4 space-y-2 text-xs leading-5">
                  <div>
                    <dt className="font-black text-slate-950 dark:text-white">公式検索へ入れる語</dt>
                    <dd className="mt-1 rounded-lg bg-slate-100 px-3 py-2 font-mono font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-100">{area.searchTerms}</dd>
                  </div>
                  <div>
                    <dt className="font-black text-slate-950 dark:text-white">比較前に確認</dt>
                    <dd className="mt-1 text-slate-600 dark:text-slate-300">{area.checks}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          {SAFETY_TECHNOLOGY_AREAS.map((area) => (
            <span key={area.title} className="rounded-full border border-sky-200 bg-white px-3 py-2 text-xs font-black text-sky-950 dark:border-sky-800 dark:bg-slate-900 dark:text-sky-100">
              {area.title}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-slate-600 dark:text-slate-300">
        <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-300" aria-hidden="true" />NETIS掲載は現場適合・安全性の自動保証ではありません</span>
        {compact ? (
          <Link href="/resources/netis-safety" className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline underline-offset-4 dark:text-sky-200">
            安全技術の探し方を見る
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <a href={NETIS_RELEASE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 font-black text-sky-900 underline underline-offset-4 dark:text-sky-200">
            国交省のAI検索機能発表
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </section>
  );
}
