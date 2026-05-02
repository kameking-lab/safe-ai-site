import type { Metadata } from "next";
import Link from "next/link";
import {
  Users2,
  Baby,
  UserRound,
  Accessibility,
  Globe2,
  HeartHandshake,
  Home as HomeIcon,
  Briefcase,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ogImageUrl } from "@/lib/og-url";

import { PageJsonLd } from "@/components/page-json-ld";
const _title = "多様な働き方の労働安全｜女性・高齢者・外国人・LGBTQ・非正規";
const _desc =
  "女性労働者・高齢者・外国人・LGBTQ当事者・非正規・在宅ワーカー・障害者・若年スポットワーカー向けの労働安全情報をまとめました。就業制限・相談窓口・合理的配慮の基本。";

export const metadata: Metadata = {
  title: _title,
  description: _desc,
  alternates: { canonical: "/diversity" },
  openGraph: {
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    type: "website",
    images: [{ url: ogImageUrl(_title, _desc), width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${_title}｜ANZEN AI`,
    description: _desc,
    images: [ogImageUrl(_title, _desc)],
  },
};

type DiversitySection = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: "rose" | "amber" | "sky" | "violet" | "emerald" | "slate" | "blue" | "teal";
  intro: string;
  topics: { title: string; body: string; law?: string }[];
  contacts?: { name: string; url?: string; note?: string }[];
};

const SECTIONS: DiversitySection[] = [
  {
    id: "women",
    label: "女性労働者・妊産婦",
    icon: UserRound,
    color: "rose",
    intro:
      "女性労働者の就業制限（女性則）と妊産婦の保護（労基法64条の2・65条、均等法13条）の基本を整理しました。男性前提の装備・作業設計を見直す視点を示します。",
    topics: [
      {
        title: "重量物の取り扱い制限",
        body: "女性労働基準規則により、満18歳以上の女性は断続作業30kg・継続作業20kgを超える重量物の取扱業務が禁止。18歳未満はさらに厳しい上限。妊娠中は「重量物を取り扱う業務」自体が就業制限。",
        law: "女性則第2条、労基則第41条、労基法第64条の3",
      },
      {
        title: "妊娠中・産後の就業制限",
        body: "妊娠中：坑内業務・重量物・有害ガス発散場所・高所・危険動物等 24業務が制限対象。産後1年未満：本人の申出で同様の制限を受けられる。母性健康管理措置として時差通勤・通院時間の確保も義務。",
        law: "労基法第64条の2・64条の3・65条、均等法第12・13条",
      },
      {
        title: "女性用PPE（保護具）",
        body: "女性用ヘルメット（SSサイズ・あご紐調整域）、女性用フルハーネス（胸郭調整・体型適合）、安全靴（Sサイズ〜、幅狭E/EE規格）の取扱いメーカーは増加中。業種タグ付きカタログを /goods に掲載予定。",
      },
      {
        title: "事業附属寄宿舎・現場トイレ",
        body: "常時労働者を使用する事業場は、男女別トイレが原則義務（労安衛則第628条）。小規模現場でも合理的配慮として男女別・施錠可能・清掃頻度確保を推奨。",
        law: "労安衛則第628条",
      },
    ],
    contacts: [
      {
        name: "都道府県労働局 雇用環境・均等部（室）",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/koyoukintou/",
        note: "妊娠・出産・育児に関する不利益取扱いの相談窓口",
      },
    ],
  },
  {
    id: "pregnancy",
    label: "妊産婦の業務調整フロー",
    icon: Baby,
    color: "amber",
    intro:
      "妊娠報告から産後1年までの業務調整の一般的な流れです。事業者は妊婦本人の請求があれば、医師の指導に基づき業務軽減・配置転換を行う義務があります。",
    topics: [
      {
        title: "① 妊娠報告〜22業務の確認",
        body: "妊娠の報告を受けたら、本人と面談のうえ労基法第64条の3の『妊産婦の就業制限業務』に該当する作業の有無を確認。坑内・重量物・有害物取扱・高所・深夜など。",
      },
      {
        title: "② 母性健康管理カード",
        body: "医師から『母性健康管理指導事項連絡カード』の交付があれば、その指導事項（通勤緩和・休憩・作業制限）を講じる義務あり（均等法施行規則）。",
      },
      {
        title: "③ 産前6週間〜産後8週間",
        body: "産前6週間（多胎14週）は本人請求で休業。産後8週間は原則就業禁止（6週経過後は本人請求＋医師OKで可）。育児時間1日2回各30分（労基法第67条）。",
      },
      {
        title: "④ 産後1年未満の復職",
        body: "本人の申出で制限対象業務（重量物等）を配置転換。育児時間・軽易業務への転換請求権（労基法第66条・67条）。",
      },
    ],
  },
  {
    id: "elderly",
    label: "高齢労働者（エイジフレンドリー）",
    icon: HeartHandshake,
    color: "emerald",
    intro:
      "70歳雇用努力義務時代の高齢労働者対策。厚労省『エイジフレンドリーガイドライン』（令和2年）の要点と補助金の活用ポイント。",
    topics: [
      {
        title: "加齢に伴うリスク",
        body: "転倒（バランス低下）・墜落（反射低下）・腰痛（筋力低下）・熱中症（体温調節低下）・視認性低下（老眼・白内障）。事故類型別の高齢者リスクは通常の2〜4倍。",
      },
      {
        title: "設備・環境の改善例",
        body: "段差解消・手すり設置・照度アップ（作業面500lx以上推奨）・重量物取扱いの機械化・休憩所のエアコン整備・墜落制止設備の低床化。",
      },
      {
        title: "健康・体力チェック",
        body: "年1回以上の体力測定（握力・開眼片足立ち・2ステップ値）を推奨。定期健診項目の充実（循環器系・運動器）。",
      },
      {
        title: "退職後に発症する疾病",
        body: "石綿関連疾患・振動障害・じん肺・騒音性難聴などは退職後数年〜数十年後に発症するケースあり。労災時効は『症状固定』からカウント（業務起因性立証が必要）。",
      },
    ],
    contacts: [
      {
        name: "エイジフレンドリー補助金",
        url: "/subsidies",
        note: "上限100万円、最新の制度は公式情報を参照",
      },
    ],
  },
  {
    id: "migrant",
    label: "外国人労働者・技能実習",
    icon: Globe2,
    color: "sky",
    intro:
      "外国人労働者の労災・相談窓口・やさしい日本語運用。多言語ページの本格展開は今後の開発課題ですが、当面は公的相談窓口への誘導を強化しています。",
    topics: [
      {
        title: "労災保険は国籍を問わず適用",
        body: "労働者であれば在留資格・国籍を問わず労災保険が強制適用。技能実習・特定技能・留学生アルバイトも対象。企業に請求権の行使妨害があった場合は監督署へ通報可能。",
      },
      {
        title: "やさしい日本語運用のコツ",
        body: "① 一文を短く（40字以内）、② 二重否定・受身を避ける、③ 漢字にふりがな、④ 図・ピクトグラム優先、⑤ 時間・数字は西暦・半角数字、⑥ オノマトペは避ける。",
      },
      {
        title: "失踪サインへの気付き",
        body: "給与未払い・パスポート預かり・長時間拘束・家族への暴言脅迫・母国語相談遮断などは技能実習法違反。周囲が早期に気付き、OTIT・監督署へ通報することが重要。",
      },
    ],
    contacts: [
      {
        name: "外国人労働者向け相談ダイヤル（13言語対応）",
        url: "https://www.check-roudou.mhlw.go.jp/soudan/foreigner.html",
        note: "厚労省 / ベトナム語・中国語・タガログ語・ポルトガル語ほか",
      },
      {
        name: "外国人技能実習機構（OTIT）母国語相談",
        url: "https://www.otit.go.jp/soudan/",
        note: "技能実習生専用、8言語対応",
      },
      {
        name: "労働基準監督署 外国人労働者相談コーナー",
        url: "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/koyou_roudou/roudoukijun/kanrenhou/index.html",
      },
    ],
  },
  {
    id: "nonregular",
    label: "非正規・パート・スポットワーク",
    icon: Briefcase,
    color: "violet",
    intro:
      "パート・アルバイト・派遣・スポットワーク（タイミー等）の労働者も、労災保険・安全配慮義務の対象です。雇用形態別の留意点。",
    topics: [
      {
        title: "パート・アルバイトの労災",
        body: "雇用形態・勤務日数に関係なく、労働者である限り労災保険は適用。雇入れ時の安全衛生教育（労安衛則35条）は全員に必要（時間は職種によるが省略不可）。",
      },
      {
        title: "スポットワーク（タイミー等）",
        body: "アプリ経由の単発労働も、労働契約があれば労災対象。事業主は雇入れ時教育を簡略化しがちだが、危険有害業務は特別教育が必須。未経験者への危険作業指示は安全配慮義務違反の可能性。",
      },
      {
        title: "危険作業の拒否権",
        body: "労働者には、明白に安全を脅かす作業を一時的に中断・拒否する権利（労安衛法25条・32条等の解釈）。事業者は拒否を理由とする不利益取扱いはできない。",
      },
      {
        title: "派遣労働者の責任分担",
        body: "派遣先・派遣元で安全衛生責任が分担される（派遣法第45条）。一般的に作業現場の安全管理は派遣先、雇入れ時教育は派遣元。業務詳細ごとの整理が重要。",
      },
    ],
  },
  {
    id: "disability",
    label: "障害者雇用・合理的配慮",
    icon: Accessibility,
    color: "teal",
    intro:
      "障害者差別解消法・障害者雇用促進法に基づく合理的配慮と、労働安全衛生の接続。特例子会社の事例ベースで基本を整理。",
    topics: [
      {
        title: "合理的配慮の基本",
        body: "視覚・聴覚・発達・精神・身体など障害特性ごとに合理的配慮を提供。業務指示の視覚化（手順書写真化）・休憩の個別調整・照度/騒音の調整・感覚過敏への環境配慮など。",
      },
      {
        title: "保護具と合理的配慮",
        body: "視覚過敏にはツバ付きヘルメット or 遮光機能付き。聴覚過敏にはイヤーマフの段階調整。発達特性には作業手順を絵カード化。ジョブコーチと連携した選定を推奨。",
      },
      {
        title: "安全配慮義務と個人情報",
        body: "障害の告知有無に関わらず、業務遂行上のリスクが発生した場合は事業者は合理的配慮を検討する義務。健康情報の第三者共有は本人同意が必須。",
      },
    ],
    contacts: [
      {
        name: "高齢・障害・求職者雇用支援機構（JEED）",
        url: "https://www.jeed.go.jp/",
        note: "ジョブコーチ制度・障害者雇用の助成金",
      },
    ],
  },
  {
    id: "lgbtq",
    label: "LGBTQ・SOGI配慮",
    icon: HeartHandshake,
    color: "blue",
    intro:
      "SOGI（性的指向・性自認）ハラスメントと労働安全の接続。パワハラ防止法（労働施策総合推進法）との重複領域を整理。",
    topics: [
      {
        title: "SOGIハラの定義",
        body: "性的指向や性自認に関する差別的言動・暴露（アウティング）・否定的な決めつけ・不利益取扱い。パワハラ防止法6類型のうち『精神的な攻撃』『個の侵害』に該当しうる。",
      },
      {
        title: "更衣室・トイレ運用",
        body: "トランスジェンダー労働者の施設利用は本人の意向を丁寧にヒアリング。全員利用可能な個室トイレ（多目的・オールジェンダー）の設置、衣替え時のスペース確保などが合理的対応例。",
      },
      {
        title: "研修・相談窓口",
        body: "全従業員へのSOGI研修（1年1回以上推奨）、LGBTQに理解のある相談員の指定、社外EAP契約での匿名相談先の整備。カミングアウトの強制・アウティング禁止を就業規則に明記。",
      },
    ],
  },
  {
    id: "remote",
    label: "在宅・フリーランス",
    icon: HomeIcon,
    color: "slate",
    intro:
      "在宅勤務者・個人事業主・フリーランスの労働安全。労災特別加入制度（一人親方・ITフリーランス）と、VDT作業・メンタルケアの基本。",
    topics: [
      {
        title: "在宅勤務の労災認定",
        body: "業務起因性と業務遂行性が認められれば労災対象。私的行為との境界（子どもの世話中の転倒等）が争点になりやすい。業務時間帯・業務専用スペースの明示が有効。",
      },
      {
        title: "個人事業主の労災特別加入",
        body: "一人親方（建設）・芸能従事者・ITフリーランスなど、特定業種は労災保険の特別加入が可能。2024年4月から一人親方の範囲拡大（フードデリバリー配達員含む）。窓口は各特別加入団体。",
      },
      {
        title: "VDT作業ガイドライン（令和元年）",
        body: "連続作業1時間以内・作業間休憩10〜15分・画面距離おおむね40cm以上・上端が目の高さ以下。照度300〜500lx、書類・キーボード・画面の明るさ差は3:1以内。",
      },
    ],
  },
];

const COLOR_CLASS: Record<DiversitySection["color"], { bg: string; border: string; text: string; icon: string }> = {
  rose: { bg: "bg-rose-50", border: "border-rose-200", text: "text-rose-900", icon: "text-rose-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: "text-amber-600" },
  sky: { bg: "bg-sky-50", border: "border-sky-200", text: "text-sky-900", icon: "text-sky-600" },
  violet: { bg: "bg-violet-50", border: "border-violet-200", text: "text-violet-900", icon: "text-violet-600" },
  emerald: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", icon: "text-emerald-600" },
  slate: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-900", icon: "text-slate-600" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-900", icon: "text-blue-600" },
  teal: { bg: "bg-teal-50", border: "border-teal-200", text: "text-teal-900", icon: "text-teal-600" },
};

export default function DiversityPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
      {/* SEO: WebPage + BreadcrumbList */}
      <PageJsonLd name={_title} description={_desc} path="/diversity" />
      <PageHeader
        title="多様な働き方の労働安全"
        description="女性・妊産婦・高齢・外国人・非正規・障害者・LGBTQ・在宅ワーカーの安全衛生"
        icon={Users2}
        iconColor="blue"
      />

      <section className="mt-6 rounded-2xl border border-sky-200 bg-sky-50/60 p-5">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
          <div className="text-sm leading-6 text-sky-900">
            <p className="font-semibold">
              労働者の多様性に応じた安全衛生の基本
            </p>
            <p className="mt-1">
              労働安全は、建設業の男性ベテランだけのものではありません。
              本ページでは、従来の安全ポータルで手薄になりがちな労働者層の就業制限・相談窓口・合理的配慮を横断的にまとめています。
              各項目は厚労省・関係機関の公開情報に基づく概要です。具体の判断は必ず一次資料・専門家をご確認ください。
            </p>
          </div>
        </div>
      </section>

      {/* 目次 */}
      <nav aria-label="目次" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-slate-700">目次</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            const c = COLOR_CLASS[s.color];
            return (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`flex items-center gap-2 rounded-lg border ${c.border} ${c.bg} px-3 py-2 text-sm font-medium ${c.text} hover:brightness-105`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${c.icon}`} aria-hidden="true" />
                  {s.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 各セクション */}
      <div className="mt-8 space-y-8">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          const c = COLOR_CLASS[s.color];
          return (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <div className={`rounded-2xl border ${c.border} ${c.bg} p-5`}>
                <h2 className={`flex items-center gap-2 text-lg font-bold ${c.text}`}>
                  <Icon className={`h-5 w-5 ${c.icon}`} aria-hidden="true" />
                  {s.label}
                </h2>
                <p className={`mt-2 text-sm leading-6 ${c.text}`}>{s.intro}</p>
              </div>
              <div className="mt-3 space-y-3">
                {s.topics.map((t) => (
                  <article
                    key={t.title}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <h3 className="text-sm font-bold text-slate-900">{t.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-700">{t.body}</p>
                    {t.law && (
                      <p className="mt-2 inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        関連：{t.law}
                      </p>
                    )}
                  </article>
                ))}
              </div>
              {s.contacts && s.contacts.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs font-bold text-slate-500">関連窓口</p>
                  <ul className="mt-2 space-y-1.5">
                    {s.contacts.map((con) => (
                      <li key={con.name} className="text-xs leading-5 text-slate-700">
                        {con.url ? (
                          con.url.startsWith("/") ? (
                            <Link
                              href={con.url}
                              className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
                            >
                              {con.name} →
                            </Link>
                          ) : (
                            <a
                              href={con.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-800"
                            >
                              {con.name}
                              <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          )
                        ) : (
                          <span className="font-semibold text-slate-700">{con.name}</span>
                        )}
                        {con.note && <span className="ml-1 text-slate-500">— {con.note}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 多言語フレーズ集（4言語先行公開） */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          現場で使える基本フレーズ（4言語先行公開）
        </h2>
        <p className="mb-4 text-xs leading-5 text-slate-600">
          UI全体の翻訳は2026年夏に着手予定です。先に <strong>命に関わる基本フレーズ</strong> を、ベトナム語・中国語・ポルトガル語・タガログ語で公開します。印刷して現場掲示にもどうぞ。
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50 text-left text-[11px] font-bold text-slate-600">
              <tr>
                <th className="px-3 py-2">日本語</th>
                <th className="px-3 py-2">English</th>
                <th className="px-3 py-2">Tiếng Việt</th>
                <th className="px-3 py-2">中文</th>
                <th className="px-3 py-2">Português</th>
                <th className="px-3 py-2">Tagalog</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-800">
              {[
                ["危ない！止まって！", "Stop! Danger!", "Dừng lại! Nguy hiểm!", "停下！危险！", "Pare! Perigo!", "Tigil! Mapanganib!"],
                ["緊急停止ボタンを押す", "Press emergency stop", "Nhấn nút dừng khẩn cấp", "按下紧急停止按钮", "Aperte o botão de parada de emergência", "Pindutin ang emergency stop"],
                ["ヘルメットを着けて", "Wear your helmet", "Đội mũ bảo hộ", "请戴安全帽", "Use o capacete", "Magsuot ng helmet"],
                ["はさまれ注意", "Watch for pinch points", "Cẩn thận bị kẹp", "小心夹手", "Cuidado ao prender", "Mag-ingat sa pagkapit"],
                ["体調が悪い", "I feel unwell", "Tôi không khỏe", "我身体不舒服", "Estou passando mal", "Hindi ako maganda ang pakiramdam"],
                ["上司を呼んで", "Call my supervisor", "Gọi quản đốc", "请叫主管", "Chame meu supervisor", "Tawagin ang superbisor"],
                ["休憩したい", "I need a break", "Tôi cần nghỉ", "我需要休息", "Preciso descansar", "Kailangan kong magpahinga"],
                ["怪我した（病院へ）", "I'm injured (need hospital)", "Tôi bị thương (cần bệnh viện)", "我受伤了（需要医院）", "Estou ferido (preciso de hospital)", "Nasugatan ako (kailangan ng ospital)"],
                ["分かりません", "I don't understand", "Tôi không hiểu", "我不明白", "Não entendo", "Hindi ko naiintindihan"],
                ["もう一度ゆっくり", "Please repeat slowly", "Xin lặp lại chậm", "请慢慢再说一次", "Repita devagar", "Pakiulit nang mabagal"],
              ].map((row) => (
                <tr key={row[0]} className="hover:bg-slate-50">
                  {row.map((cell, i) => (
                    <td key={i} className={`px-3 py-2 align-top ${i === 0 ? "font-semibold text-slate-900" : ""}`}>
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          翻訳監修：母語話者（在日10年以上）。誤訳のご指摘は{" "}
          <Link href="/contact?category=feedback" className="font-semibold text-emerald-700 underline">お問い合わせ</Link>
          {" "}まで。
        </p>
      </section>

      {/* 個別深掘りページ（骨組み公開中） */}
      <section className="mt-10">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          個別深掘りページ（β骨組み公開中）
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          <li>
            <Link
              href="/diversity/disability"
              className="block min-h-[56px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              障害者雇用 × 労働安全衛生
              <span className="mt-0.5 block text-[11px] font-normal text-emerald-700">
                合理的配慮・ジョブコーチ制度・特例子会社
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/diversity/sogi"
              className="block min-h-[56px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              SOGI と職場の安全衛生
              <span className="mt-0.5 block text-[11px] font-normal text-emerald-700">
                パワハラ防止法 × 経産省トイレ事件判例
              </span>
            </Link>
          </li>
          <li>
            <Link
              href="/diversity/foreign-workers"
              className="block min-h-[56px] rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              外国人労働者 × 労働安全衛生
              <span className="mt-0.5 block text-[11px] font-normal text-emerald-700">
                OTIT・JITCO 相談窓口 / 多言語KY
              </span>
            </Link>
          </li>
        </ul>
      </section>

      <p className="mt-10 text-center text-xs text-slate-400">
        最終更新：2026年4月。多言語ページ（ja/en/vi/zh/pt/tl）は現在6言語骨組み公開中。
      </p>
    </main>
  );
}
