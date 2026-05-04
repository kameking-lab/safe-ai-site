import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "労働安全衛生 法令用語集（条文・通達・行政用語）｜ANZEN AI",
  description:
    "「公布日と施行日の違い」「告示・通達・指針の拘束力」「省令・規則・規程」など、労働安全衛生法令を読むときに必要な用語を一次出典付きで整理。",
  alternates: { canonical: "/laws/glossary" },
};

type Term = {
  term: string;
  reading: string;
  definition: string;
  example?: string;
  source?: { label: string; url: string };
};

const TERMS: Term[] = [
  {
    term: "公布",
    reading: "こうふ",
    definition:
      "法令の内容を国民に正式に知らせる行為。官報での掲載をもって公布が成立する。条文にある「公布の日」は官報掲載日を指す。",
    example: "「平成27年法律第65号」のように西暦と法律番号で識別される。",
    source: {
      label: "内閣官報局 官報",
      url: "https://kanpou.npb.go.jp/",
    },
  },
  {
    term: "施行",
    reading: "せこう",
    definition:
      "法令が効力を持ち、適用が開始される日。公布日とは別に「施行日」が定められることが多く、政省令への委任で個別に定まる場合もある。",
    example:
      "化学物質管理者選任義務（安衛則第12条の5）は2024年4月1日施行。",
  },
  {
    term: "法律",
    reading: "ほうりつ",
    definition:
      "国会の議決によって成立する規範。労働安全衛生法（昭和47年法律第57号）はこの「法律」。",
    source: {
      label: "e-Gov 労働安全衛生法",
      url: "https://laws.e-gov.go.jp/law/347AC0000000057",
    },
  },
  {
    term: "政令",
    reading: "せいれい",
    definition:
      "内閣が制定する命令。法律の委任を受けて細目を定める。例: 労働安全衛生法施行令（昭和47年政令第318号）。",
    example:
      "「政令で定めるもの」と法律にあれば、対応する政令（施行令）を引く必要がある。",
    source: {
      label: "e-Gov 労働安全衛生法施行令",
      url: "https://laws.e-gov.go.jp/law/347CO0000000318",
    },
  },
  {
    term: "省令（規則）",
    reading: "しょうれい（きそく）",
    definition:
      "各省の大臣が制定する命令。労働安全衛生規則（昭和47年労働省令第32号）がこれに相当する。略称として「○○則」（安衛則・有機則・特化則など）が使われる。",
    source: {
      label: "e-Gov 労働安全衛生規則",
      url: "https://laws.e-gov.go.jp/law/347M50002000032",
    },
  },
  {
    term: "告示",
    reading: "こくじ",
    definition:
      "公の機関が一定事項を広く一般に知らせるために行う通知。法律・政省令の委任を受けて基準値や指定対象を確定する形で用いられる。例: 厚生労働省告示第○号。",
    example:
      "石綿則対象業務の指定告示など、リスト化された対象を示す典拠として参照する。",
  },
  {
    term: "通達",
    reading: "つうたつ",
    definition:
      "上級行政機関が下級行政機関に対し、法令解釈や運用方針を示すために発する文書。事業者を直接拘束する法的強制力はないが、監督指導の根拠として実務上極めて重要。",
    example:
      "「基発0115第1号」のように 発出官庁＋年月日＋連番 で識別。",
    source: {
      label: "厚労省 通達検索（中災防 安衛情報センター）",
      url: "https://www.jaish.gr.jp/user/anzen/hor/tsutatsu.html",
    },
  },
  {
    term: "指針・ガイドライン",
    reading: "ししん・がいどらいん",
    definition:
      "事業者に望ましい取組み等を示す行政の指導文書。直接の拘束力は無いが、安全配慮義務の判断材料として裁判例で参照されることがある。",
    example:
      "「労働者の心の健康の保持増進のための指針」等。",
  },
  {
    term: "規程",
    reading: "きてい",
    definition:
      "事業場ごとに定める社内ルール（就業規則・安全衛生管理規程など）。法令ではないが、労働契約上の効力を持つ場合がある。",
  },
  {
    term: "条・項・号",
    reading: "じょう・こう・ごう",
    definition:
      "条文の構成単位。条 > 項 > 号 の順で枝分かれする。「第○条第△項第□号」のように完全な形で引用するのが正式。",
    example:
      "安衛法第60条 / 同第60条の2 / 安衛令第19条第1号 など。",
  },
  {
    term: "本則 / 附則",
    reading: "ほんそく／ふそく",
    definition:
      "法令の本体である「本則」と、施行日・経過措置・関連規定改廃を定める「附則」。改正法を読むときは附則の経過措置の確認が必須。",
  },
  {
    term: "新旧対照表",
    reading: "しんきゅうたいしょうひょう",
    definition:
      "改正前後の条文を 2 列で並べた表。何がどう変わったかを一目で把握できる。法令改正時に厚労省・各省庁が公開することが多い。",
    source: {
      label: "厚労省 安衛法 改正法令の新旧対照表（例）",
      url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/anzen/index.html",
    },
  },
  {
    term: "経過措置",
    reading: "けいかそち",
    definition:
      "改正法令の施行に伴って、既存事業者・既設設備等への適用を一定期間猶予する規定。附則に置かれる。",
    example:
      "化学物質規制 2024 改正の経過措置（既存物質への 2026/4 開始など）。",
  },
  {
    term: "事業者責務（安衛法第3条）",
    reading: "じぎょうしゃせきむ",
    definition:
      "「事業者は、単にこの法律で定める労働災害の防止のための最低基準を守るだけでなく、快適な職場環境の実現と労働条件の改善を通じて職場における労働者の安全と健康を確保するようにしなければならない」（安衛法第3条第1項）。",
    source: {
      label: "e-Gov 労働安全衛生法 第3条",
      url: "https://laws.e-gov.go.jp/law/347AC0000000057",
    },
  },
  {
    term: "罰則",
    reading: "ばっそく",
    definition:
      "義務違反に対する刑事罰。安衛法は第119条〜第123条に懲役・罰金・両罰規定（事業主と行為者双方）を置く。",
  },
  {
    term: "両罰規定",
    reading: "りょうばつきてい",
    definition:
      "違反行為者だけでなく、その雇用主である法人・個人にも罰金を科す規定。安衛法第122条が該当。",
  },
  {
    term: "拘束力レベル",
    reading: "こうそくりょくれべる",
    definition:
      "本サイトの通達一覧で表示するラベル。「法令」「告示」「通達」「指針」「事務連絡」の順で強い順から表示し、罰則の有無を示す目安として用いる。",
  },
  {
    term: "e-Gov 法令検索",
    reading: "いーがぶ ほうれいけんさく",
    definition:
      "総務省が運営する公式の法令検索ポータル。条文・改正履歴・告示の最新版が無償公開されている。",
    source: {
      label: "e-Gov 法令検索",
      url: "https://laws.e-gov.go.jp/",
    },
  },
];

export default function LawsGlossaryPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav aria-label="パンくず" className="mb-4 text-xs text-slate-500">
        <Link href="/laws" className="hover:underline">
          法改正情報
        </Link>
        <span className="mx-2">/</span>
        <span>用語集</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
        労働安全衛生 法令用語集
      </h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        「公布」と「施行」の違い、告示・通達・指針の拘束力、政省令の関係など、
        労働安全衛生法令を読むうえで前提となる用語を一次出典付きで整理しました。
        法改正情報を読む前のリファレンスとしてご利用ください。
      </p>
      <p className="mt-2 text-xs text-slate-500">
        現場用語（KY・TBM・職長など）は{" "}
        <Link href="/glossary" className="underline hover:text-slate-700">
          /glossary（一般用語集）
        </Link>{" "}
        にあります。
      </p>

      <ul className="mt-6 space-y-4">
        {TERMS.map((t) => (
          <li
            key={t.term}
            id={t.reading}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-base font-bold text-slate-900">{t.term}</h2>
              <span className="text-[11px] text-slate-500">（{t.reading}）</span>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-slate-700">{t.definition}</p>
            {t.example && (
              <p className="mt-1.5 rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600">
                例: {t.example}
              </p>
            )}
            {t.source && (
              <p className="mt-1.5 text-xs">
                出典:{" "}
                <a
                  href={t.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline hover:text-blue-900"
                >
                  {t.source.label} ↗
                </a>
              </p>
            )}
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h2 className="text-base font-bold text-slate-900">関連リソース</h2>
        <ul className="mt-2 space-y-1 text-sm text-slate-700">
          <li>
            ・{" "}
            <Link href="/laws" className="text-blue-700 underline">
              法改正情報一覧
            </Link>{" "}
            — 最新の法改正と施行日・新旧の差分
          </li>
          <li>
            ・{" "}
            <Link href="/laws/notices-precedents" className="text-blue-700 underline">
              通達・判例（第2層出典）
            </Link>{" "}
            — 行政解釈と最高裁判例
          </li>
          <li>
            ・{" "}
            <Link href="/resources" className="text-blue-700 underline">
              厚労省 一次資料DB
            </Link>{" "}
            — 通達 527 件・告示 244 件・指針 98 件
          </li>
          <li>
            ・{" "}
            <Link href="/glossary" className="text-blue-700 underline">
              現場用語集
            </Link>{" "}
            — KY/KYT/SDS/TBM など
          </li>
        </ul>
      </section>
    </main>
  );
}
