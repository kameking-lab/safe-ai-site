import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout";
import { JsonLd } from "@/components/json-ld";

export const metadata: Metadata = {
  title: "Vercel Hobby復帰予測レポート 2026-05-19 — Dispatch A/Bベースライン",
  description:
    "2026-05-19時点のVercelクォータ実測値をベースに、Hobby復帰判定が「ready」になるまでの距離を3シナリオで定量化。Dispatch A（CDNキャッシュ）・B（ISR削減）の効果試算、6/15ダウングレード判断基準、次回再計測タイミングを収録。",
  alternates: {
    canonical: "https://www.anzen-ai-portal.jp/audits/hobby-recovery-forecast-2026-05-19",
  },
  openGraph: {
    title: "Vercel Hobby復帰予測レポート 2026-05-19",
    description:
      "Dispatch A/B実施前のベースライン。ISR Writes 540%・Edge Requests 159%の現状から、3シナリオで復帰可能性を試算。個人運営研究プロジェクト内部記録。",
    url: "https://www.anzen-ai-portal.jp/audits/hobby-recovery-forecast-2026-05-19",
    type: "article",
    publishedTime: "2026-05-19T00:00:00Z",
  },
  robots: { index: true, follow: true },
};

const schema = {
  "@context": "https://schema.org",
  "@type": "Report",
  name: "Vercel Hobby復帰予測レポート 2026-05-19",
  description:
    "安全AIポータル（anzen-ai-portal.jp）のVercelクォータ実測値ベースラインと、Hobby復帰可否を判定する3シナリオ予測。Dispatch A/Bの効果検証用参照ドキュメント。",
  datePublished: "2026-05-19",
  author: {
    "@type": "Organization",
    name: "安全AIポータル",
    url: "https://www.anzen-ai-portal.jp/about",
  },
  url: "https://www.anzen-ai-portal.jp/audits/hobby-recovery-forecast-2026-05-19",
  inLanguage: "ja",
  about: [
    { "@type": "Thing", name: "Vercelクォータ管理" },
    { "@type": "Thing", name: "ISR Writes最適化" },
    { "@type": "Thing", name: "Edge Requests削減" },
  ],
};

type Verdict = "ready" | "borderline" | "blocked" | "unchanged";

interface QuotaRow {
  key: string;
  label: string;
  mtd: string;
  limit: string;
  mtdPct: number | null;
  projected: string;
  projPct: number | null;
  verdict: Verdict;
}

interface ScenarioRow {
  key: string;
  label: string;
  projectedMonthly: string;
  projPct: number | null;
  verdict: Verdict;
  changeNote: string;
}

interface Scenario {
  id: string;
  title: string;
  verdict: Verdict;
  hobbyChancePct: number;
  summary: string;
  rows: ScenarioRow[];
  notes: string[];
}

const QUOTA_ROWS: QuotaRow[] = [
  {
    key: "isrWrites",
    label: "ISR Writes",
    mtd: "684,000",
    limit: "200,000 / 月",
    mtdPct: 342,
    projected: "1,080,000",
    projPct: 540,
    verdict: "blocked",
  },
  {
    key: "edgeRequests",
    label: "Edge Requests",
    mtd: "1,007,000",
    limit: "1,000,000 / 月",
    mtdPct: 100.7,
    projected: "1,590,000",
    projPct: 159,
    verdict: "blocked",
  },
  {
    key: "bandwidth",
    label: "Bandwidth",
    mtd: "11.40 GB",
    limit: "100 GB / 月",
    mtdPct: 11.4,
    projected: "18.0 GB",
    projPct: 18,
    verdict: "ready",
  },
  {
    key: "functionInvocations",
    label: "Function Invocations",
    mtd: "22,800",
    limit: "100,000 / 月",
    mtdPct: 22.8,
    projected: "36,000",
    projPct: 36,
    verdict: "ready",
  },
  {
    key: "buildExecution",
    label: "Build Execution",
    mtd: "570 分",
    limit: "6,000 分 / 月",
    mtdPct: 9.5,
    projected: "900 分",
    projPct: 15,
    verdict: "ready",
  },
  {
    key: "imageOptimization",
    label: "Image Optimization",
    mtd: "342",
    limit: "1,000 / 月",
    mtdPct: 34.2,
    projected: "540",
    projPct: 54,
    verdict: "ready",
  },
  {
    key: "fastOriginTransfer",
    label: "Fast Origin Transfer",
    mtd: "19.0 GB",
    limit: "上限なし",
    mtdPct: null,
    projected: "30.0 GB",
    projPct: null,
    verdict: "unchanged",
  },
];

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    title: "シナリオ1: 何もしない（現状維持）",
    verdict: "blocked",
    hobbyChancePct: 0,
    summary:
      "ISR Writes（540%）と Edge Requests（159%）の両方がHobby上限を超過したまま推移。Proプラン継続必須。",
    rows: [
      {
        key: "isrWrites",
        label: "ISR Writes",
        projectedMonthly: "1,080,000",
        projPct: 540,
        verdict: "blocked",
        changeNote: "変化なし",
      },
      {
        key: "edgeRequests",
        label: "Edge Requests",
        projectedMonthly: "1,590,000",
        projPct: 159,
        verdict: "blocked",
        changeNote: "変化なし",
      },
      {
        key: "functionInvocations",
        label: "Function Invocations",
        projectedMonthly: "36,000",
        projPct: 36,
        verdict: "ready",
        changeNote: "変化なし",
      },
      {
        key: "bandwidth",
        label: "Bandwidth",
        projectedMonthly: "18.0 GB",
        projPct: 18,
        verdict: "ready",
        changeNote: "変化なし",
      },
    ],
    notes: [
      "全クォータが現在ペースで推移した場合の14日平均×30日予測。",
      "ISR Writes は Hobby上限の5.4倍。Edge Requests は1.6倍。",
      "Proプラン継続コスト: 月 $20 USD（2026-06-15 請求期限）。",
    ],
  },
  {
    id: "s2",
    title: "シナリオ2: Dispatch A完了（F-005 CDNキャッシュ）",
    verdict: "blocked",
    hobbyChancePct: 0,
    summary:
      "AIルート10本にCDNキャッシュを適用。Function Invocationsは21%まで改善するが、ISR Writes・Edge Requestsは未解決。",
    rows: [
      {
        key: "isrWrites",
        label: "ISR Writes",
        projectedMonthly: "1,080,000",
        projPct: 540,
        verdict: "blocked",
        changeNote: "変化なし（AI routeキャッシュとISR writeは別メトリクス）",
      },
      {
        key: "edgeRequests",
        label: "Edge Requests",
        projectedMonthly: "1,590,000",
        projPct: 159,
        verdict: "blocked",
        changeNote: "変化なし（CDNキャッシュヒットもEdge Requestにカウント）",
      },
      {
        key: "functionInvocations",
        label: "Function Invocations",
        projectedMonthly: "21,600",
        projPct: 21.6,
        verdict: "ready",
        changeNote: "キャッシュヒット率40%想定 → 36%→21.6%（−40%）",
      },
      {
        key: "bandwidth",
        label: "Bandwidth",
        projectedMonthly: "18.0 GB",
        projPct: 18,
        verdict: "ready",
        changeNote: "変化なし",
      },
    ],
    notes: [
      "Dispatch A対象: /api/chat, /api/chatbot, /api/law-summary, /api/quiz-explain, /api/ky-assist, /api/summaries, /api/translate, /api/safety-alert, /api/sds, /api/goods-chat の10ルート。",
      "Vercelの課金モデルでは Edge Requests = CDNキャッシュヒット込みの全リクエスト数。キャッシュを増やしても Edge Requests は減少しない。",
      "Function Invocationsの大幅削減により Gemini API コスト節減効果は高い（Dispatch A の副次的価値）。",
      "ボトルネックの ISR Writes / Edge Requests は Dispatch B なしには解決しない。",
    ],
  },
  {
    id: "s3",
    title: "シナリオ3: Dispatch A+B両方完了",
    verdict: "borderline",
    hobbyChancePct: 30,
    summary:
      "ISR Writes は revalidate延長で 54% まで低下（ready）。Edge Requests はISRとの相関次第で blocked〜ready の幅がある。総合判定はborderline（中間推定）。Hobby復帰可能性は約30%。",
    rows: [
      {
        key: "isrWrites",
        label: "ISR Writes",
        projectedMonthly: "108,000",
        projPct: 54,
        verdict: "ready",
        changeNote: "revalidate 10倍延長想定 → 36,000/日→3,600/日（−90%）",
      },
      {
        key: "edgeRequests",
        label: "Edge Requests（中間推定）",
        projectedMonthly: "1,304,000",
        projPct: 130,
        verdict: "blocked",
        changeNote: "ISR相関20%想定 → 53,000/日→43,460/日（−18%）※不確実性大",
      },
      {
        key: "functionInvocations",
        label: "Function Invocations",
        projectedMonthly: "21,600",
        projPct: 21.6,
        verdict: "ready",
        changeNote: "Dispatch Aの効果継続",
      },
      {
        key: "bandwidth",
        label: "Bandwidth",
        projectedMonthly: "18.0 GB",
        projPct: 18,
        verdict: "ready",
        changeNote: "変化なし",
      },
    ],
    notes: [
      "Dispatch B主要施策: /api/signage/jma revalidate 300s→3600s（12倍）、/api/signage-data 3600s→21600s（6倍）、/api/weather-forecast 3600s→21600s（6倍）、[skip ci]徹底。",
      "Edge Requests削減の幅は広い：保守的（ISR相関なし）→159% blocked、楽観的（ISR相関60%）→64% ready。中間推定130%でblockedだが実測後に更新予定。",
      "ISR Writes は高確率で ready に到達（85%以上の削減が可能な施策あり）。",
      "Edge Requests が残存課題として残る場合は追加の第3レバーが必要（クローラー制御強化、Signageポーリング最適化等）。",
      "Hobby復帰可能性 30% の内訳: ISR readyの確率 ≈ 90%、Edge ready確率 ≈ 35% → 総合 0.9 × 0.35 ≈ 30%。",
    ],
  },
];

function verdictBadge(v: Verdict) {
  const styles: Record<Verdict, string> = {
    ready: "bg-emerald-100 text-emerald-800 border-emerald-300",
    borderline: "bg-amber-100 text-amber-800 border-amber-300",
    blocked: "bg-red-100 text-red-800 border-red-300",
    unchanged: "bg-slate-100 text-slate-600 border-slate-200",
  };
  const labels: Record<Verdict, string> = {
    ready: "ready",
    borderline: "borderline",
    blocked: "blocked",
    unchanged: "—",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${styles[v]}`}
    >
      {labels[v]}
    </span>
  );
}

function pctBar(pct: number | null) {
  if (pct === null)
    return <span className="text-xs text-slate-400">参考値</span>;
  const capped = Math.min(pct, 300);
  const color =
    pct >= 100
      ? "bg-red-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1 h-2 bg-slate-100 rounded-full overflow-hidden min-w-[80px]">
        <div
          className={`absolute inset-y-0 left-0 ${color} rounded-full`}
          style={{ width: `${(capped / 300) * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-700 w-14 text-right shrink-0">
        {pct.toFixed(1)}%
      </span>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-heading`} className="space-y-4" data-section={id}>
      <h2
        id={`${id}-heading`}
        className="border-b border-slate-200 pb-2 text-xl font-bold text-slate-900"
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function SubSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div className="space-y-3" data-subsection={id}>
      <h3 id={`${id}-heading`} className="text-base font-bold text-slate-800">
        {title}
      </h3>
      {children}
    </div>
  );
}

function Prose({ children }: { children: ReactNode }) {
  return <div className="space-y-3 text-sm leading-7 text-slate-700">{children}</div>;
}

function KeyVal({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 text-xs">
      <dt className="w-40 shrink-0 font-semibold text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value}</dd>
    </div>
  );
}

const OVERALL_VERDICT_STYLES: Record<Verdict, string> = {
  ready: "bg-emerald-50 border-emerald-300 text-emerald-900",
  borderline: "bg-amber-50 border-amber-300 text-amber-900",
  blocked: "bg-red-50 border-red-300 text-red-900",
  unchanged: "bg-slate-50 border-slate-200 text-slate-700",
};

export default function HobbyRecoveryForecast20260519() {
  return (
    <PageContainer width="narrow" className="space-y-12 py-10">
      <JsonLd schema={schema} />

      {/* Header */}
      <header className="space-y-4" data-section="header">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
          Performance Forecast · Dispatch A/B Baseline
        </p>
        <h1
          className="text-2xl font-bold leading-snug text-slate-900 sm:text-3xl"
          data-h1
        >
          Vercel Hobby復帰予測レポート 2026-05-19
        </h1>
        <p className="text-sm leading-7 text-slate-600">
          本レポートは個人運営研究プロジェクト「安全AIポータル」（
          <a href="https://www.anzen-ai-portal.jp" className="underline">
            anzen-ai-portal.jp
          </a>
          ）のVercelクォータ実測値をベースに、Hobby復帰判定が「ready」になる条件と現状からの距離を定量化したものです。
          並走Dispatch A（F-005 CDNキャッシュ）・B（ISR削減）の効果検証用ベースラインとして機能します。
        </p>
        <dl className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
          {[
            { label: "調査日", value: "2026-05-19" },
            { label: "データソース", value: "モック（引継ぎキャリブレーション済）" },
            { label: "Proプラン期限", value: "2026-06-15" },
            { label: "総合判定", value: "BLOCKED" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <dt className="text-[10px] font-semibold text-slate-500">{s.label}</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-900">{s.value}</dd>
            </div>
          ))}
        </dl>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <strong className="font-semibold">注意:</strong>{" "}
          VERCEL_TOKEN未設定のためモックデータを使用。引継ぎ文（ISR ~1.1M/月・Edge ~1.6M/月・FastOrigin ~30GB/月）をキャリブレーション根拠としています。
          実測値は{" "}
          <code className="font-mono">/admin/health-check?key=...</code> で取得可能。
        </div>
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900">
          <strong className="font-semibold">2026-05-19 followup 反映:</strong>{" "}
          本ベースライン公開後、Edge発生源削減 (signage polling / proxy.ts matcher / robots.txt cache) と
          ISR追加削減 (fetch revalidate 5件) を実装。Edge Requests は 159% → 約 135-150% (依然 blocked)、
          ISR Writes は 540% → 約 478% (依然 blocked) と試算。詳細は{" "}
          <code className="font-mono">docs/perf/edge-isr-followup-2026-05-19.md</code> を参照。
          <strong className="font-semibold"> Hobby復帰可能性は約30% → 5%未満に下方修正</strong>
          （構造的トラフィック構成のためコード変更だけでは到達不可。Pro継続が現実的）。
        </div>
      </header>

      {/* Section 1: Current Status */}
      <Section id="current-status" title="1. 現状クォータ実測（2026-05-19、月19日目）">
        <Prose>
          <p>
            Hobby復帰判定モデル（<code>vercel-monitoring/forecast.ts</code>）は直近14日の日次平均×30日で月間使用量を予測し、
            全クォータで予測≤Hobby上限×80%なら「ready」と判定します。
            現状はISR Writes（540%）とEdge Requests（159%）の2クォータが突出して超過しています。
          </p>
        </Prose>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">クォータ</th>
                <th className="px-4 py-3">MTD値（19日）</th>
                <th className="px-4 py-3">MTD使用率</th>
                <th className="px-4 py-3">月間予測（×30日）</th>
                <th className="px-4 py-3">Hobby上限</th>
                <th className="px-4 py-3 w-44">予測使用率</th>
                <th className="px-4 py-3">判定</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {QUOTA_ROWS.map((row) => (
                <tr key={row.key} className="align-middle">
                  <td className="px-4 py-3 font-semibold text-slate-900">{row.label}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.mtd}</td>
                  <td className="px-4 py-3">{pctBar(row.mtdPct)}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.projected}</td>
                  <td className="px-4 py-3 text-slate-500">{row.limit}</td>
                  <td className="px-4 py-3">{pctBar(row.projPct)}</td>
                  <td className="px-4 py-3">{verdictBadge(row.verdict)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Prose>
          <p>
            <strong>Hobby復帰の「ready」条件:</strong>
            全クォータ（上限あり）の月間予測 ≤ Hobby上限 × 80%。
            現状、ISR Writes は 1,080,000/200,000 = <strong>540%</strong>（必要削減率: 85%以上）、
            Edge Requests は 1,590,000/1,000,000 = <strong>159%</strong>（必要削減率: 50%以上）。
          </p>
          <p>
            日次平均の内訳: ISR Writes 36,000件/日、Edge Requests 53,000件/日、
            Fast Origin Transfer 1.0 GB/日（引継ぎ文の月次実績から逆算）。
          </p>
        </Prose>
      </Section>

      {/* Section 2: Scenarios */}
      <Section id="scenarios" title="2. 3シナリオ予測">
        <Prose>
          <p>
            Hobby復帰可能性は「直近14日平均が Dispatch 完了後に移行した場合、30日分がHobby上限内に収まるか」で判定します。
            各シナリオの判定は <code>judgeHobbyReadiness()</code> の同一ロジックを適用。
          </p>
        </Prose>

        {SCENARIOS.map((scenario) => (
          <div
            key={scenario.id}
            className={`rounded-xl border p-5 space-y-4 ${OVERALL_VERDICT_STYLES[scenario.verdict]}`}
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-bold text-slate-900">{scenario.title}</h3>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-600">総合判定:</span>
                {verdictBadge(scenario.verdict)}
                <span className="text-xs font-bold text-slate-700">
                  Hobby復帰可能性 {scenario.hobbyChancePct}%
                </span>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-700">{scenario.summary}</p>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs bg-white rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-left font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">クォータ</th>
                    <th className="px-3 py-2">月間予測</th>
                    <th className="px-3 py-2 w-36">予測使用率</th>
                    <th className="px-3 py-2">判定</th>
                    <th className="px-3 py-2">変化</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scenario.rows.map((row) => (
                    <tr key={row.key} className="align-middle">
                      <td className="px-3 py-2 font-semibold text-slate-800">{row.label}</td>
                      <td className="px-3 py-2 font-mono text-slate-700">{row.projectedMonthly}</td>
                      <td className="px-3 py-2">{pctBar(row.projPct)}</td>
                      <td className="px-3 py-2">{verdictBadge(row.verdict)}</td>
                      <td className="px-3 py-2 text-slate-500">{row.changeNote}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scenario.notes.length > 0 && (
              <ul className="space-y-1 text-xs text-slate-600">
                {scenario.notes.map((note) => (
                  <li key={note} className="flex gap-2">
                    <span className="shrink-0 text-slate-400" aria-hidden>
                      ▸
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </Section>

      {/* Section 3: Dispatch A/B Details */}
      <Section id="dispatches" title="3. Dispatch A / B の位置づけ">
        <SubSection id="dispatch-a" title="3.1 Dispatch A — F-005 CDNキャッシュ（並走中）">
          <Prose>
            <p>
              <strong>対象:</strong> 動的AIルート10本（/api/chat・/api/chatbot・/api/law-summary・/api/quiz-explain・/api/ky-assist・
              /api/summaries・/api/translate・/api/safety-alert・/api/sds・/api/goods-chat）に
              <code>Cache-Control: s-maxage=300, stale-while-revalidate=86400</code> を追加。
            </p>
            <p>
              <strong>本予測への影響:</strong> Function Invocations を 36% → 約22% に削減（Gemini API呼び出しコスト低減）。
              しかし ISR Writes・Edge Requests はいずれも変化しないため、Hobby復帰判定を single-handedly では覆せない。
            </p>
            <p>
              <strong>副次的価値:</strong> Gemini API レスポンスキャッシュによる応答速度改善・API費用削減。
              Dispatch A単独でも Function Invocations の改善は永続的に有効。
            </p>
            <p>
              <strong>完了後の再計測:</strong> デプロイ後24〜48時間で
              <code>docs/perf/hobby-post-dispatch-a-&lt;date&gt;.md</code> に記録し本ベースラインと比較。
              目標: Function Invocations の日次が 750/日以下（現状 1,200/日）。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="dispatch-b" title="3.2 Dispatch B — ISR削減（並走中）">
          <Prose>
            <p>
              <strong>対象:</strong> 高頻度ISRルートのrevalidate延長。
              /api/signage/jma（300s→3600s）、/api/signage-data内部fetch（3600s→21600s）、
              /api/weather-forecast（3600s→21600s）を主要対象とし、[skip ci]運用の徹底を並行実施。
            </p>
            <p>
              <strong>本予測への影響:</strong> ISR Writesを36,000/日→3,600/日（−90%）に削減し、
              月間 108,000（Hobby上限200,000の54%）に着地させる。ISR Writes単体では「ready」達成。
            </p>
            <p>
              <strong>Edge Requestsへの波及:</strong> ISR由来の背景再生成リクエストが Edge Requests に占める割合は不明。
              中間推定（20%相関）では 1,304,000/月（130%）とまだ blocked だが、
              楽観推定（60%相関）では 731,000/月（73%）と ready に到達する可能性もある。
              実測後に判断。
            </p>
            <p>
              <strong>完了後の再計測:</strong> デプロイ後48〜72時間で
              <code>docs/perf/hobby-post-dispatch-b-&lt;date&gt;.md</code> に記録。
              目標: ISR Writes 3,600/日以下、Edge Requestsの変化率を計測。
            </p>
          </Prose>
        </SubSection>

        <SubSection id="edge-analysis" title="3.3 Edge Requests — 追加調査が必要な理由">
          <Prose>
            <p>
              Edge Requestsが 53,000件/日 に達している主要因として現時点で3つの仮説があります。
            </p>
            <p>
              <strong>仮説A（クローラー起因）:</strong> Googlebot等が sitemap.ts の推計 2,800〜3,500 URLを日次巡回。
              PR #239（AIクローラー17種ブロック）実施後も Googlebot・BingBot は許可済のため残存。
              本仮説では A+B 実施後も Edge Requests は大幅に減少しない。
            </p>
            <p>
              <strong>仮説B（ISR背景処理起因）:</strong> ISR再生成時に Vercel 内部で発生する edge-internal リクエストが
              Edge Requests カウントに含まれる。Dispatch B で ISR を削減すると連動して減少する可能性あり。
              本仮説が正しければ A+B 後 Edge Requests も大幅改善。
            </p>
            <p>
              <strong>仮説C（Signageポーリング起因）:</strong> /api/signage/jma が 300s revalidate で複数の Signage クライアントから
              ポーリングされると、ポーリング数×288回/日の Edge Requests が発生。
              Dispatch B の signage revalidate 延長で同時に解消される可能性あり。
            </p>
            <p>
              正確な原因特定にはVercel Analyticsのログが必要。
              6/10時点再計測までに仮説を検証し、A+B後も blocked が続く場合は第3レバー（クローラー制御強化・ポーリング最適化）を検討。
            </p>
          </Prose>
        </SubSection>
      </Section>

      {/* Section 4: Decision criteria for 6/15 */}
      <Section id="decision-criteria" title="4. 6/15 ダウングレード判断基準">
        <Prose>
          <p>
            Vercel Proプラン期限は <strong>2026-06-15</strong>。
            期限の5日前（<strong>2026-06-10</strong>）を最終判断日として設定します。
          </p>
        </Prose>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-left font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">6/10時点の状態</th>
                <th className="px-4 py-3">条件</th>
                <th className="px-4 py-3">推奨アクション</th>
                <th className="px-4 py-3">リスク</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-emerald-50">
                <td className="px-4 py-3 font-semibold text-emerald-800">全クォータ ready</td>
                <td className="px-4 py-3 text-slate-700">全予測 ≤ Hobby上限 × 80%</td>
                <td className="px-4 py-3 text-slate-700">6/15 にHobby降格実行</td>
                <td className="px-4 py-3 text-slate-500">低（余裕あり）</td>
              </tr>
              <tr className="bg-amber-50">
                <td className="px-4 py-3 font-semibold text-amber-800">ISR ready、Edge borderline</td>
                <td className="px-4 py-3 text-slate-700">ISR ≤ 160K/月 かつ Edge ≤ 1M/月</td>
                <td className="px-4 py-3 text-slate-700">Hobby降格（上限超過時は機能低下を許容）</td>
                <td className="px-4 py-3 text-slate-500">中（超過でページ更新が遅延）</td>
              </tr>
              <tr className="bg-red-50">
                <td className="px-4 py-3 font-semibold text-red-800">いずれかのクォータ blocked</td>
                <td className="px-4 py-3 text-slate-700">予測 &gt; Hobby上限</td>
                <td className="px-4 py-3 text-slate-700">Pro継続 or 追加施策後に再判断</td>
                <td className="px-4 py-3 text-slate-500">高（Hobbyでは機能停止リスク）</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Prose>
          <p>
            注: HobbyプランでEdge Requestsが月間1M超過した場合、VercelはHTTP 429（レート制限）ではなく
            サービス強制停止の可能性があります。ISR Writes超過は新コンテンツのキャッシュ更新が止まるだけで
            既存キャッシュは閲覧可能なため、Edge Requestsオーバーの方が致命的なリスクです。
          </p>
        </Prose>
      </Section>

      {/* Section 5: Re-measurement schedule */}
      <Section id="remeasure" title="5. 次回再計測タイミング">
        <div className="space-y-3">
          {[
            {
              timing: "Dispatch A完了後 +24〜48h",
              goal: "Function Invocations削減率の検証",
              target: "750件/日以下（−37%以上）",
              doc: "docs/perf/hobby-post-dispatch-a-<date>.md",
            },
            {
              timing: "Dispatch B完了後 +48〜72h",
              goal: "ISR Writes削減率の検証＋Edge Requestsへの波及確認",
              target: "ISR Writes 3,600件/日以下（−90%以上）",
              doc: "docs/perf/hobby-post-dispatch-b-<date>.md",
            },
            {
              timing: "2026-06-10（最終判断5日前）",
              goal: "6/15 ダウングレード可否の最終判定",
              target: "全クォータ ready or borderline",
              doc: "docs/perf/hobby-final-check-2026-06-10.md",
            },
          ].map((item) => (
            <div
              key={item.timing}
              className="rounded-lg border border-slate-200 bg-white p-4 text-sm"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-4">
                <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-800">
                  {item.timing}
                </span>
                <div className="space-y-1">
                  <p className="font-semibold text-slate-900">{item.goal}</p>
                  <p className="text-xs text-slate-600">
                    <span className="font-medium">目標: </span>{item.target}
                  </p>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium">記録先: </span>
                    <code className="font-mono">{item.doc}</code>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <Prose>
          <p>
            再計測手順: <code>/admin/health-check?key=&lt;STRATEGY_AUTH_PASSWORD&gt;</code> でスナップショット取得
            → 本ベースライン（
            <a
              href="https://github.com/kameking-lab/safe-ai-site/blob/main/docs/perf/hobby-baseline-2026-05-19.md"
              className="underline"
            >
              docs/perf/hobby-baseline-2026-05-19.md
            </a>
            ）と日次平均を比較 → 削減率を記録。
          </p>
        </Prose>
      </Section>

      {/* Section 6: Summary */}
      <Section id="summary" title="6. サマリー">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4 text-sm">
          <p className="font-semibold text-slate-900">
            現状（2026-05-19）の総合判定: <span className="text-red-700">BLOCKED</span>
          </p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">✗</span>
              <span>ISR Writes: 1,080,000/月 予測 → Hobby上限（200,000）の <strong>540%</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-red-500 shrink-0">✗</span>
              <span>Edge Requests: 1,590,000/月 予測 → Hobby上限（1,000,000）の <strong>159%</strong></span>
            </li>
            <li className="flex gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span>その他5クォータ（Bandwidth / Function Invocations / Build / Image / FastOrigin）: 全て余裕あり（9〜54%）</span>
            </li>
          </ul>
          <p className="font-semibold text-slate-900">
            Dispatch A+B完了後の予測総合判定: <span className="text-amber-700">BORDERLINE</span>
            （Hobby復帰可能性 <strong>約30%</strong>）
          </p>
          <ul className="space-y-2 text-slate-700">
            <li className="flex gap-2">
              <span className="text-emerald-500 shrink-0">✓</span>
              <span>ISR Writes: 108,000/月 予測 → <strong>54%（ready）</strong>。Dispatch B で85%以上削減が必要で達成見込みあり。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-amber-500 shrink-0">?</span>
              <span>Edge Requests: 不確実（73〜159%）。ISR相関次第。A+B後の実測が判断の鍵。</span>
            </li>
            <li className="flex gap-2">
              <span className="text-slate-400 shrink-0">→</span>
              <span>6/10時点の実測で最終判定。Edge Requests が blocked 継続の場合は第3レバー（クローラー制御強化等）を検討。</span>
            </li>
          </ul>
        </div>
      </Section>

      {/* Footer */}
      <footer className="border-t border-slate-200 pt-6">
        <dl className="space-y-1 text-xs">
          <KeyVal label="調査日" value="2026-05-19" />
          <KeyVal label="データソース" value="モック（VERCEL_TOKEN未設定）/ 引継ぎ文キャリブレーション" />
          <KeyVal label="Hobby判定モデル" value="web/src/lib/vercel-monitoring/forecast.ts（14日trailing avg × 30日）" />
          <KeyVal label="Hobby判定閾値" value="ready ≤ 80%、borderline ≤ 100%、blocked > 100%（status.ts）" />
          <KeyVal label="ベースライン文書" value="docs/perf/hobby-baseline-2026-05-19.md（計算根拠・生データ）" />
          <KeyVal
            label="関連ページ"
            value="/audits/site-status-2026-05-19, /audits/post-2week-regression"
          />
          <KeyVal label="内部モニタリング" value="/admin/health-check（STRATEGY_AUTH_PASSWORD必要）" />
        </dl>
      </footer>
    </PageContainer>
  );
}
