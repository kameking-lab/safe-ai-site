"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { ChatMessage } from "@/components/chat-panel";
// C-1: law-revision-list を home-screen から静的 import すると /accidents の
// バンドルにも同梱されるため、コンポーネント本体は laws-page-client が
// LawsListComponent prop で注入する（型のみここで参照）。
// dynamic(ssr:true)化はチェーンが1段深くなり simulated LCP が悪化したため不採用。
import type { LawRevisionListProps } from "@/components/law-revision-list";
import { TabNavigation, type TabId } from "@/components/tab-navigation";

// C-1: 既定タブの初期描画に不要なバリアント/タブ別パネルは dynamic import で遅延。
// /accidents・/laws のページバンドルから他バリアント（KY・通知・PDF・Eラーニング等）
// のコードを排除して LCP を下げる。タブ切替・該当バリアント表示時にチャンクが届く。
const ChatPanel = dynamic(
  () => import("@/components/chat-panel").then((m) => m.ChatPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-slate-100" /> }
);
// C-1: 既定タブ(mhlw-search)で初期描画される唯一のパネルのため静的 import。
// dynamic() は ssr:true でも React.lazy として SSR 初回パスでサスペンドし、
// ページの Suspense 境界（さらに app/loading.tsx 境界まで連鎖）が「フォールバック
// 先行ペイント→$RC スワップ」として静的HTMLに焼き込まれ、/accidents の間欠 CLS 0.25
// （Lighthouse 実測で約2回に1回）と LCP 遅延の根因になっていた。
// コンポーネント本体は軽量（事故データ・死亡災害DBは内部で呼び出し時 dynamic import）
// なので静的 import でもページバンドルは増えない。
import { AccidentExtrasPanel } from "@/components/accident-extras-panel";
const AccidentDatabasePanel = dynamic(
  () => import("@/components/accident-database-panel").then((m) => m.AccidentDatabasePanel),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-lg bg-slate-100" /> }
);

const AccidentAnalysisPanel = dynamic(
  () => import("@/components/accident-analysis-panel").then((m) => m.AccidentAnalysisPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-slate-100" /> }
);
const MhlwAccidentAnalysisPanel = dynamic(
  () =>
    import("@/components/mhlw-accident-analysis-panel").then(
      (m) => m.MhlwAccidentAnalysisPanel
    ),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-slate-100" /> }
);
const IndustryRiskRanking = dynamic(
  () =>
    import("@/components/industry-risk-ranking").then((m) => m.IndustryRiskRanking),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-slate-100" /> }
);

const MhlwDeathsPanel = dynamic(
  () => import("@/components/mhlw-deaths-panel").then((m) => m.MhlwDeathsPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-slate-100" /> }
);
const MhlwDisasterDatabasesPanel = dynamic(
  () => import("@/components/mhlw-disaster-databases-panel").then((m) => m.MhlwDisasterDatabasesPanel),
  { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-lg bg-slate-100" /> }
);
const SummaryPanel = dynamic(
  () => import("@/components/summary-panel").then((m) => m.SummaryPanel),
  { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-lg bg-slate-100" /> }
);
import { SITE_STATS } from "@/data/site-stats";
import { createServices } from "@/lib/services/service-factory";
import type { ServiceError, ServiceStatus } from "@/lib/types/api";
import {
  ALL_ACCIDENT_TYPES,
  type AccidentCase,
  type AccidentWorkCategory,
  type AccidentType,
  type LawRevision,
  type RevisionSummary,
} from "@/lib/types/domain";

// C-1（柱1是正・死コード削除）: 旧 variant（portal/risk/ky/elearning/pdf/notifications）
// はどのルートからも描画されなくなって久しい（/ky は /ky/paper へ一本化、/e-learning は
// HomeScreen 経由を廃止済み等）が、コードが残り /laws・/accidents のページチャンクに
// KY用紙・PDF出力・通知設定等のコードが同梱され LCP を悪化させていた。
// 実際に使われている laws / accidents の2 variant のみ残す。
export type HomeScreenVariant = "laws" | "accidents";

type HomeScreenProps = {
  children: React.ReactNode;
  variant?: HomeScreenVariant;
  initialLawTab?: TabId;
  /**
   * C-1: /laws の法改正一覧の SSR 初期データ。server page から渡す。
   * クライアントの revision-service は同期キャッシュを持たない
   * （データ静的 import がバンドルに同梱されるのを防ぐため）。
   */
  initialRevisions?: LawRevision[];
  /** C-1: 法改正一覧コンポーネント本体。laws variant のページが注入する */
  LawsListComponent?: React.ComponentType<LawRevisionListProps>;
};

const ACCIDENT_TABS = [
  "list",
  "mhlw-search",
  "mhlw-deaths",
  "mhlw",
  "industry",
  "analysis",
] as const;
type AccidentTab = (typeof ACCIDENT_TABS)[number];

function readAccidentTabFromUrl(
  value: string | null | undefined,
): AccidentTab | null {
  return ACCIDENT_TABS.includes(value as AccidentTab)
    ? (value as AccidentTab)
    : null;
}

export function HomeScreen({ children, variant: variantProp, initialLawTab, initialRevisions, LawsListComponent }: HomeScreenProps) {
  const variant = variantProp ?? "laws";
  const router = useRouter();
  const pathname = usePathname();
  const services = useMemo(() => createServices(), []);
  const [revisions, setRevisions] = useState(
    () => initialRevisions ?? services.revision.getCachedRevisions()
  );
  const [activeTab, setActiveTab] = useState<TabId>(() => initialLawTab ?? "laws");
  const [selectedRevisionId, setSelectedRevisionId] = useState(
    () => initialRevisions?.[0]?.id ?? services.revision.getInitialRevisionId() ?? ""
  );
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [loadingRevisionId, setLoadingRevisionId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<ServiceError | null>(null);
  const [chatError, setChatError] = useState<ServiceError | null>(null);
  const [revisionError, setRevisionError] = useState<ServiceError | null>(null);
  // C-1: SSR 初期データがあれば取得済み扱いで開始（マウント時の再フェッチをしない）
  const [revisionStatus, setRevisionStatus] = useState<ServiceStatus>(
    initialRevisions && initialRevisions.length > 0 ? "success" : "idle"
  );
  const [summaryStatus, setSummaryStatus] = useState<ServiceStatus>("idle");
  const [chatStatus, setChatStatus] = useState<ServiceStatus>("idle");
  const [selectedSummary, setSelectedSummary] = useState<RevisionSummary | null>(null);
  const [accidentCases, setAccidentCases] = useState<AccidentCase[]>([]);
  // C-1: 全件データはバンドル同梱の同期取得をやめ、非同期サービス経由で遅延取得
  const [allAccidentCases, setAllAccidentCases] = useState<AccidentCase[]>([]);
  const [accidentStatus, setAccidentStatus] = useState<ServiceStatus>("idle");
  const [accidentError, setAccidentError] = useState<ServiceError | null>(null);
  // 型グリッド（柱0）からの acc_type 付きフル遷移で、型フィルタを初期反映する。
  // C-1: useSearchParams を使うと静的プリレンダーが Suspense フォールバックへ落ち、
  // 本文全体がクライアント差し替え（LCP/CLS悪化）になるため、URLはマウント後に
  // window.location から一度だけ読む。SSR/初回描画は既定タブで確定させる。
  const [selectedAccidentType, setSelectedAccidentType] = useState<AccidentType | "すべて">("すべて");
  const [selectedAccidentCategory, setSelectedAccidentCategory] = useState<AccidentWorkCategory | "すべて">("すべて");
  const [accidentActiveTab, setAccidentActiveTab] = useState<AccidentTab>("mhlw-search");

  // マウント時にURLクエリから状態を復元（?tab= / ?acc_type=。laws は ?tab=chat|summary）
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (variant === "accidents") {
      const tab = readAccidentTabFromUrl(params.get("tab"));
      if (tab) setAccidentActiveTab(tab);
      const rawType = params.get("acc_type");
      if (rawType && ALL_ACCIDENT_TYPES.includes(rawType as AccidentType)) {
        setSelectedAccidentType(rawType as AccidentType);
      }
    } else if (variant === "laws") {
      const tab = params.get("tab");
      if (tab === "chat" || tab === "summary") setActiveTab(tab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 初回マウント時のみURLを読む
  }, []);

  // Sync /accidents tab state -> URL (replace, scroll preserved)
  // 初回実行はスキップ（既定state でURLの ?tab=/?acc_type= を消さないため。
  // URL復元エフェクトが state を更新すれば、その再実行で正しく同期される）
  const skippedFirstUrlSync = useRef(false);
  useEffect(() => {
    if (variant !== "accidents") return;
    if (!skippedFirstUrlSync.current) {
      skippedFirstUrlSync.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (accidentActiveTab === "mhlw-search") {
      params.delete("tab");
    } else {
      params.set("tab", accidentActiveTab);
    }
    // 型フィルタもURLへ同期（型グリッド遷移後の解除や共有URLが正しくなる）
    if (selectedAccidentType === "すべて") {
      params.delete("acc_type");
    } else {
      params.set("acc_type", selectedAccidentType);
    }
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    const current =
      window.location.pathname + (window.location.search || "");
    if (next !== current) {
      router.replace(next, { scroll: false });
    }
  }, [accidentActiveTab, selectedAccidentType, variant, pathname, router]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(services.chat.createInitialMessages());
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [revisions, selectedRevisionId]
  );

  useEffect(() => {
    if (variant !== "laws") return;
    // C-1: server page から initialRevisions（lawRevisionCores・一覧と同一データ源）を
    // 受け取った場合は再フェッチしない。マウント直後に法改正データチャンク
    // （生約130KB）を重ねてロードして同じ内容で差し替えるだけの通信だったため。
    if (initialRevisions && initialRevisions.length > 0) return;
    let active = true;

    async function loadRevisions() {
      setRevisionStatus("loading");
      const result = await services.revision.getLawRevisions();
      if (!active) return;

      if (result.ok) {
        setRevisions(result.data);
        setRevisionStatus("success");
        setRevisionError(null);
        setSelectedRevisionId((prev) => prev || result.data[0]?.id || "");
        return;
      }

      setRevisionStatus("error");
      setRevisionError(result.error);
    }

    void loadRevisions();
    return () => {
      active = false;
    };
  }, [variant, services.revision, initialRevisions]);

  useEffect(() => {
    if (!isSummaryLoading) return;

    const timer = window.setTimeout(() => {
      setIsSummaryLoading(false);
      setLoadingRevisionId(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [isSummaryLoading]);

  const handleSelectSummary = (revisionId: string) => {
    setSummaryError(null);
    if (revisionId === selectedRevisionId) {
      setActiveTab("summary");
      setIsSummaryLoading(true);
      setLoadingRevisionId(revisionId);
      void services.summary
        .getSummaryByRevisionId({ revisionId })
        .then((response) => {
          if (!response.ok) {
            setSummaryStatus("error");
            setSummaryError(response.error);
            setSelectedSummary(null);
          } else {
            setSummaryStatus("success");
            setSummaryError(null);
            setSelectedSummary(response.data.summary);
          }
        })
        .finally(() => {
          setIsSummaryLoading(false);
          setLoadingRevisionId(null);
        });
      return;
    }
    setSelectedRevisionId(revisionId);
    setActiveTab("summary");
    setIsSummaryLoading(true);
    setLoadingRevisionId(revisionId);
    setSelectedSummary(null);
  };

  const handleSelectForQuestion = (revisionId: string) => {
    setSelectedRevisionId(revisionId);
    setActiveTab("chat");
  };

  const selectedRevisionTitle = selectedRevision?.title ?? "法改正が未選択です";

  useEffect(() => {
    if (variant !== "laws" || !selectedRevisionId) return;
    let active = true;
    async function loadSummary() {
      setSummaryStatus("loading");
      const response = await services.summary.getSummaryByRevisionId({ revisionId: selectedRevisionId });
      if (!active) return;
      if (!response.ok) {
        setSummaryStatus("error");
        setSummaryError(response.error);
        setSelectedSummary(null);
        return;
      }
      setSummaryStatus("success");
      setSummaryError(null);
      setSelectedSummary(response.data.summary);
    }
    void loadSummary();
    return () => {
      active = false;
    };
  }, [variant, selectedRevisionId, services.summary]);

  useEffect(() => {
    if (variant !== "laws") return;
    if (!chatListRef.current) {
      return;
    }
    chatListRef.current.scrollTop = chatListRef.current.scrollHeight;
  }, [chatMessages, activeTab, variant]);

  // 全件データ（リスト件数表示・分析タブ用）。
  // C-1: 消費者は「サイト収録事例(list)」「詳細事例(analysis)」タブのみ。
  // 既定タブ(mhlw-search)のままならデータチャンク(生約340KB)を一切ロードしない。
  useEffect(() => {
    if (variant !== "accidents") return;
    if (accidentActiveTab !== "list" && accidentActiveTab !== "analysis") return;
    let active = true;
    void services.accident.getAllAccidentCases().then((cases) => {
      if (active) setAllAccidentCases(cases);
    });
    return () => {
      active = false;
    };
  }, [variant, services.accident, accidentActiveTab]);

  useEffect(() => {
    if (variant !== "accidents") return;
    // C-1: フィルタ済み一覧は list タブでしか描画しない。タブ表示時に初めて取得する
    if (accidentActiveTab !== "list") return;
    let active = true;
    async function loadAccidentCases() {
      setAccidentStatus("loading");
      const result = await services.accident.getAccidentCases({
        type: selectedAccidentType,
        category: selectedAccidentCategory,
      });
      if (!active) return;
      if (!result.ok) {
        setAccidentStatus("error");
        setAccidentError(result.error);
        setAccidentCases([]);
        return;
      }
      setAccidentStatus("success");
      setAccidentError(null);
      setAccidentCases(result.data);
    }
    void loadAccidentCases();
    return () => {
      active = false;
    };
  }, [variant, services.accident, selectedAccidentType, selectedAccidentCategory, accidentActiveTab]);

  const handleSendChat = async () => {
    const trimmed = chatInput.trim();
    if (!trimmed || isChatSending) {
      return;
    }

    setIsChatSending(true);
    setChatStatus("loading");
    setChatError(null);

    const userMessageId = `user-${Date.now()}`;
    const response = await services.chat.sendMessage({
      revision: selectedRevision,
      question: trimmed,
    });

    if (!response.ok) {
      setChatStatus("error");
      setChatError(response.error);
      setIsChatSending(false);
      return;
    }

    setChatMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: trimmed },
      response.data,
    ]);
    setChatStatus("success");
    setChatInput("");
    window.setTimeout(() => setIsChatSending(false), 320);
  };

  const retrySummary = () => {
    if (!selectedRevisionId) return;
    handleSelectSummary(selectedRevisionId);
  };

  const retryRevisions = async () => {
    setRevisionStatus("loading");
    const result = await services.revision.getLawRevisions();
    if (!result.ok) {
      setRevisionStatus("error");
      setRevisionError(result.error);
      return;
    }
    setRevisions(result.data);
    setRevisionStatus("success");
    setRevisionError(null);
  };

  return (
    <>
      {variant === "accidents" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          {/* タブ切り替え */}
          <div className="px-4 pt-4 lg:px-8">
            <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 w-fit">
              {(
                [
                  { id: "mhlw-search", label: `全件検索 (${SITE_STATS.accidentDbCount}件)` },
                  { id: "mhlw-deaths", label: `死亡災害 (${SITE_STATS.mhlwDeathsCount}件)` },
                  { id: "industry", label: "業種別ランキング" },
                  { id: "mhlw", label: "MHLW実データ分析" },
                  { id: "list", label: `サイト収録事例 (${SITE_STATS.siteCuratedCaseCount}件)` },
                  { id: "analysis", label: "詳細事例（参考）" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setAccidentActiveTab(tab.id)}
                  className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-colors ${
                    accidentActiveTab === tab.id
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <section id="section-accidents" className="space-y-4 px-4 pt-4 lg:px-8">
            {accidentActiveTab === "list" && (
              <>
                <AccidentExtrasPanel />
                <AccidentDatabasePanel
                  cases={accidentCases}
                  allCases={allAccidentCases}
                  selectedCategory={selectedAccidentCategory}
                  selectedType={selectedAccidentType}
                  onSelectCategory={setSelectedAccidentCategory}
                  onSelectType={setSelectedAccidentType}
                  status={accidentStatus}
                  errorMessage={accidentError?.message ?? null}
                />
                <MhlwDisasterDatabasesPanel />
              </>
            )}
            {accidentActiveTab === "mhlw-search" && <AccidentExtrasPanel />}
            {accidentActiveTab === "mhlw-deaths" && <MhlwDeathsPanel />}
            {accidentActiveTab === "industry" && <IndustryRiskRanking />}
            {accidentActiveTab === "mhlw" && <MhlwAccidentAnalysisPanel />}
            {accidentActiveTab === "analysis" && (
              <AccidentAnalysisPanel cases={allAccidentCases} />
            )}
          </section>
        </>
      ) : null}

      {variant === "laws" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          <section
            id="section-laws"
            className={
              activeTab === "laws"
                ? "grid grid-cols-1 gap-4 px-4 py-4 lg:px-8"
                : "grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-8"
            }
          >
            {activeTab === "laws" && LawsListComponent && (
              <LawsListComponent
                revisions={revisions}
                selectedRevisionId={selectedRevisionId}
                loadingRevisionId={loadingRevisionId}
                status={revisionStatus}
                error={revisionError}
                onRetry={retryRevisions}
                retryLabel="一覧を再取得"
                onSelectSummary={handleSelectSummary}
                onSelectForQuestion={handleSelectForQuestion}
              />
            )}

            {activeTab === "summary" && (
              <SummaryPanel
                selectedRevisionId={selectedRevisionId}
                selectedRevisionTitle={selectedRevisionTitle}
                summaryContent={selectedSummary}
                isLoading={isSummaryLoading}
                status={summaryStatus}
                error={summaryError}
                onRetry={retrySummary}
              />
            )}

            {activeTab === "chat" && (
              <ChatPanel
                selectedRevisionTitle={selectedRevisionTitle}
                chatMessages={chatMessages}
                chatInput={chatInput}
                isSending={isChatSending}
                status={chatStatus}
                error={chatError}
                onChatInputChange={setChatInput}
                onSend={handleSendChat}
                onRetry={handleSendChat}
                errorTitle="チャット応答の取得に失敗しました"
                retryLabel="同じ質問を再送"
                chatListRef={chatListRef}
              />
            )}

            {activeTab !== "laws" && LawsListComponent && (
              <LawsListComponent
                revisions={revisions}
                selectedRevisionId={selectedRevisionId}
                loadingRevisionId={loadingRevisionId}
                status={revisionStatus}
                error={revisionError}
                onRetry={retryRevisions}
                retryLabel="一覧を再取得"
                onSelectSummary={handleSelectSummary}
                onSelectForQuestion={handleSelectForQuestion}
              />
            )}
          </section>
        </>
      ) : null}

    </>
  );
}
