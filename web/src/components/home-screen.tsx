"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel, type ChatMessage } from "@/components/chat-panel";
import { AccidentDatabasePanel } from "@/components/accident-database-panel";
import { ELearningPanel } from "@/components/elearning-panel";
import { HomeValueHero } from "@/components/home-value-hero";
import { KyRecordList } from "@/components/ky-record-list";
import { KySheetPanel } from "@/components/ky-sheet-panel";
import { KyInstructionRecordForm } from "@/components/ky-instruction-record-form";
import { LawRevisionList } from "@/components/law-revision-list";
import { MailDeliveryPanel } from "@/components/mail-delivery-panel";
import { MhlwDisasterDatabasesPanel } from "@/components/mhlw-disaster-databases-panel";
import { NotificationSettingsPanel } from "@/components/notification-settings-panel";
import { PdfExportPanel } from "@/components/pdf-export-panel";
import { SummaryPanel } from "@/components/summary-panel";
import { TabNavigation, type TabId } from "@/components/tab-navigation";
import { WeatherRiskCard } from "@/components/weather-risk-card";
import { createServices } from "@/lib/services/service-factory";
import type { ServiceError, ServiceStatus } from "@/lib/types/api";
import type {
  AccidentCase,
  AccidentWorkCategory,
  AccidentType,
  RevisionSummary,
  SiteRiskWeather,
} from "@/lib/types/domain";
import type {
  KyInstructionRecordState,
  KyRecordSummary,
  KySheetDraft,
  MailDeliverySettings,
  NotificationSettings,
  PdfExportTarget,
} from "@/lib/types/operations";

export type HomeScreenVariant =
  | "portal"
  | "risk"
  | "laws"
  | "accidents"
  | "elearning"
  | "ky"
  | "notifications"
  | "pdf";

type HomeScreenProps = {
  children: React.ReactNode;
  variant?: HomeScreenVariant;
  initialLawTab?: TabId;
};

function makeInitialKyInstruction(): KyInstructionRecordState {
  const y = new Date().getFullYear().toString();
  const emptyWork = (): KyInstructionRecordState["workRows"][number] => ({
    workPlace: "",
    workDetail: "",
    machinery: "",
    fireMark: "",
    heightMark: "",
    ppeNote: "",
    safetyInstruction: "",
    responsible: "",
    primeSign: "",
  });
  const emptyRisk = (label: string): KyInstructionRecordState["riskRows"][number] => ({
    targetLabel: label,
    hazard: "",
    qualNo: "",
    likelihood: 1,
    severity: 1,
    reduction: "",
    reLikelihood: 1,
    reSeverity: 1,
    reducedBelow2: "",
    primeSign: "",
  });
  const emptyP = (): KyInstructionRecordState["participants"][number] => ({
    name: "",
    qualNo: "",
    preWork: "",
    onExit: "",
  });
  return {
    reportStamps: ["", "", "", "", ""],
    workDateYear: y,
    workDateMonth: String(new Date().getMonth() + 1),
    workDateDay: String(new Date().getDate()),
    workDateNote: "",
    weather: "",
    coop1Name: "",
    coop1Chief: "",
    coop2Name: "",
    coop2Chief: "",
    coop3Name: "",
    coop3Chief: "",
    workRows: [emptyWork(), emptyWork(), emptyWork(), emptyWork()],
    riskRows: [
      emptyRisk("上記"),
      emptyRisk("①"),
      emptyRisk("②"),
      emptyRisk("③"),
      emptyRisk("④"),
    ],
    participants: Array.from({ length: 6 }, () => emptyP()),
    participantTotal: "",
    breaks: ["", "", "", "", ""],
    safetyVest: "",
    exitLarge: "",
    exitMedium: "",
    exitSmall: "",
    closingNote: "",
    fallChecks: [
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
      { good: "", bad: "", done: "" },
    ],
    correctionNote: "",
  };
}

export function HomeScreen({ children, variant: variantProp, initialLawTab }: HomeScreenProps) {
  const variant = variantProp ?? "portal";
  const services = useMemo(() => createServices(), []);
  const [revisions, setRevisions] = useState(() => services.revision.getCachedRevisions());
  const [activeTab, setActiveTab] = useState<TabId>(() => initialLawTab ?? "laws");
  const [selectedRevisionId, setSelectedRevisionId] = useState(
    () => services.revision.getInitialRevisionId() ?? ""
  );
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [isChatSending, setIsChatSending] = useState(false);
  const [loadingRevisionId, setLoadingRevisionId] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<ServiceError | null>(null);
  const [chatError, setChatError] = useState<ServiceError | null>(null);
  const [revisionError, setRevisionError] = useState<ServiceError | null>(null);
  const [revisionStatus, setRevisionStatus] = useState<ServiceStatus>("idle");
  const [summaryStatus, setSummaryStatus] = useState<ServiceStatus>("idle");
  const [chatStatus, setChatStatus] = useState<ServiceStatus>("idle");
  const [weatherRiskStatus, setWeatherRiskStatus] = useState<ServiceStatus>("idle");
  const [selectedSummary, setSelectedSummary] = useState<RevisionSummary | null>(null);
  const [weatherRisk, setWeatherRisk] = useState<SiteRiskWeather | null>(null);
  const [weatherRiskError, setWeatherRiskError] = useState<ServiceError | null>(null);
  const [accidentCases, setAccidentCases] = useState<AccidentCase[]>([]);
  const [accidentStatus, setAccidentStatus] = useState<ServiceStatus>("idle");
  const [accidentError, setAccidentError] = useState<ServiceError | null>(null);
  const [selectedAccidentType, setSelectedAccidentType] = useState<AccidentType | "すべて">("すべて");
  const [selectedAccidentCategory, setSelectedAccidentCategory] = useState<AccidentWorkCategory | "すべて">("すべて");
  const [selectedRegionName, setSelectedRegionName] = useState(
    () => services.weatherRisk.getAvailableRegions()[0]?.regionName ?? ""
  );
  const [selectedWorkType, setSelectedWorkType] = useState<"高所作業" | "電気作業" | "足場作業" | "一般作業">(
    "一般作業"
  );
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    weatherAlerts: true,
    lawRevisions: true,
    accidentUpdates: true,
    morningReminder: false,
    reminderTime: "07:45",
  });
  const [mailSettings, setMailSettings] = useState<MailDeliverySettings>({
    enabled: false,
    email: "",
    frequency: "daily",
    includeWeather: true,
    includeLaws: true,
    includeAccidents: true,
    includeLearning: false,
  });
  const [kySheetDraft, setKySheetDraft] = useState<KySheetDraft>({
    date: new Date().toISOString().slice(0, 10),
    siteName: "",
    workSummary: "",
    expectedRisks: "",
    countermeasures: "",
    callAndResponse: "",
    notes: "",
  });
  const [kyInstructionRecord, setKyInstructionRecord] = useState<KyInstructionRecordState>(makeInitialKyInstruction);
  const [kyRecordList, setKyRecordList] = useState<KyRecordSummary[]>([]);
  const [pdfTarget, setPdfTarget] = useState<PdfExportTarget>("ky-sheet");
  const [mailPreview, setMailPreview] = useState("配信プレビューを表示します。");
  const [pdfPreview, setPdfPreview] = useState("PDFプレビューを表示します。");
  const [opsSavedLabel, setOpsSavedLabel] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(services.chat.createInitialMessages());
  const [chatInput, setChatInput] = useState("");
  const chatListRef = useRef<HTMLDivElement | null>(null);

  const selectedRevision = useMemo(
    () => revisions.find((revision) => revision.id === selectedRevisionId) ?? null,
    [revisions, selectedRevisionId]
  );

  useEffect(() => {
    if (variant !== "laws") return;
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
  }, [variant, services.revision]);

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

  useEffect(() => {
    if (variant !== "risk" && variant !== "pdf") return;
    let active = true;
    async function loadWeatherRisk() {
      setWeatherRiskStatus("loading");
      const result = await services.weatherRisk.getTodaySiteRisk({
        regionName: selectedRegionName || undefined,
      });
      if (!active) return;
      if (!result.ok) {
        setWeatherRiskStatus("error");
        setWeatherRiskError(result.error);
        setWeatherRisk(null);
        return;
      }
      setWeatherRiskStatus("success");
      setWeatherRiskError(null);
      setWeatherRisk(result.data);
    }
    void loadWeatherRisk();
    return () => {
      active = false;
    };
  }, [variant, services.weatherRisk, selectedRegionName]);

  useEffect(() => {
    if (variant !== "accidents") return;
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
  }, [variant, services.accident, selectedAccidentType, selectedAccidentCategory]);

  useEffect(() => {
    if (variant !== "notifications" && variant !== "pdf" && variant !== "ky") return;
    let active = true;
    async function loadOps() {
      if (variant === "notifications") {
        const [noti, mail] = await Promise.all([
          services.operations.getNotificationSettings(),
          services.operations.getMailSettings(),
        ]);
        if (!active) return;
        if (noti.ok) setNotificationSettings(noti.data);
        if (mail.ok) setMailSettings(mail.data);
      }
      if (variant === "pdf" || variant === "ky") {
        const ky = await services.operations.getKyDraft();
        if (!active) return;
        if (ky.ok) setKySheetDraft(ky.data);
      }
      if (variant === "ky") {
        const paper = await services.operations.getKyInstructionRecord();
        if (!active) return;
        if (paper.ok) setKyInstructionRecord(paper.data);
        const list = await services.operations.getKyRecordList();
        if (!active) return;
        if (list.ok) setKyRecordList(list.data);
      }
    }
    void loadOps();
    return () => {
      active = false;
    };
  }, [variant, services.operations]);

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
      {variant === "portal" ? (
        <>
          <section id="section-home" className="px-4 pt-4 lg:px-8">
            {children}
          </section>
          <section id="section-home-hero" className="px-4 pt-4 pb-6 lg:px-8">
            <HomeValueHero />
          </section>
        </>
      ) : null}

      {variant === "risk" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section id="section-weather-risk" className="px-4 pt-4 lg:px-8">
            <WeatherRiskCard
              data={weatherRisk}
              status={weatherRiskStatus}
              errorMessage={weatherRiskError?.message ?? null}
              availableRegions={services.weatherRisk.getAvailableRegions()}
              selectedRegionName={selectedRegionName}
              onRegionChange={setSelectedRegionName}
              workType={selectedWorkType}
              onWorkTypeChange={setSelectedWorkType}
            />
          </section>
        </>
      ) : null}

      {variant === "ky" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section className="border-b border-slate-200/80 bg-slate-50 px-4 py-2 lg:px-8">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <p>
                KY用紙専用画面です。天候・リスクの朝礼用サマリーは
                <a href="/risk" className="mx-1 font-semibold text-emerald-700 underline">
                  今日の現場リスク
                </a>
                で確認できます。
              </p>
            </div>
          </section>
        </>
      ) : null}

      {variant === "accidents" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section id="section-accidents" className="space-y-4 px-4 pt-4 lg:px-8">
            <AccidentDatabasePanel
              cases={accidentCases}
              allCases={services.accident.getAllAccidentCases()}
              selectedCategory={selectedAccidentCategory}
              selectedType={selectedAccidentType}
              onSelectCategory={setSelectedAccidentCategory}
              onSelectType={setSelectedAccidentType}
              status={accidentStatus}
              errorMessage={accidentError?.message ?? null}
            />
            <MhlwDisasterDatabasesPanel />
          </section>
        </>
      ) : null}

      {variant === "laws" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
          <section
            id="section-laws"
            className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start lg:gap-6 lg:px-8"
          >
            {activeTab === "laws" && (
              <LawRevisionList
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

            {activeTab !== "laws" && (
              <LawRevisionList
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

      {variant === "elearning" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section id="section-elearning" className="px-4 pb-3 lg:px-8">
            <ELearningPanel />
          </section>
        </>
      ) : null}

      {variant === "ky" ? (
        <section
          id="section-ky-sheet"
          className="px-4 pb-3 lg:px-8"
        >
          <KyInstructionRecordForm
            onChange={setKyInstructionRecord}
            onSave={(current) => {
              void services.operations.saveKyInstructionRecord(current).then(async (result) => {
                if (result.ok) {
                  setOpsSavedLabel(`作業指示・現地KY記録を保存: ${new Date().toLocaleTimeString("ja-JP")}`);
                  const list = await services.operations.getKyRecordList();
                  if (list.ok) setKyRecordList(list.data);
                }
              });
            }}
            savedLabel={opsSavedLabel}
            value={kyInstructionRecord}
          />
        </section>
      ) : null}

      {variant === "ky" ? (
        <section className="px-4 pb-6 lg:px-8">
          <KyRecordList
            records={kyRecordList}
            onDelete={(id) => {
              void services.operations.deleteKyRecord(id).then((result) => {
                if (result.ok) setKyRecordList(result.data);
              });
            }}
          />
        </section>
      ) : null}

      {variant === "pdf" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section id="section-ky-sheet" className="px-4 pb-3 lg:px-8">
            <KySheetPanel
              briefingLines={
                weatherRisk?.riskEvidences?.slice(0, 3) ?? [
                  "現地確認を優先し、危険を感じたら作業を止める",
                  "退避導線と連絡系統を先に共有する",
                ]
              }
              onBuildPdfPreview={() => {
                void services.operations
                  .buildPdfPreview({
                    target: "ky-sheet",
                    kyDraft: kySheetDraft,
                    briefingLines: weatherRisk?.riskEvidences ?? [],
                  })
                  .then((result) => {
                    if (result.ok) setPdfPreview(result.data);
                  });
              }}
              onChange={setKySheetDraft}
              onSave={() => {
                void services.operations.saveKyDraft(kySheetDraft).then((result) => {
                  if (result.ok) setOpsSavedLabel(`KY保存: ${new Date().toLocaleTimeString("ja-JP")}`);
                });
              }}
              savedLabel={opsSavedLabel}
              value={kySheetDraft}
            />
          </section>
          <section id="section-pdf-export" className="px-4 pb-3 lg:px-8">
            <PdfExportPanel
              onRefreshPreview={() => {
                void services.operations
                  .buildPdfPreview({
                    target: pdfTarget,
                    kyDraft: kySheetDraft,
                    briefingLines: weatherRisk?.riskEvidences ?? [],
                  })
                  .then((result) => {
                    if (result.ok) setPdfPreview(result.data);
                  });
              }}
              onTargetChange={setPdfTarget}
              previewText={pdfPreview}
              target={pdfTarget}
            />
          </section>
        </>
      ) : null}

      {variant === "notifications" ? (
        <>
          <section className="px-4 pt-4 lg:px-8">{children}</section>
          <section id="section-notification-settings" className="px-4 pb-5 lg:px-8">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <NotificationSettingsPanel
                onChange={setNotificationSettings}
                onSave={() => {
                  void services.operations.saveNotificationSettings(notificationSettings).then((result) => {
                    if (result.ok) setOpsSavedLabel(`通知設定を保存: ${new Date().toLocaleTimeString("ja-JP")}`);
                  });
                }}
                savedLabel={opsSavedLabel}
                value={notificationSettings}
              />
              <MailDeliveryPanel
                onBuildPreview={() => {
                  void services.operations
                    .buildMailPreview({ notification: notificationSettings, mail: mailSettings })
                    .then((result) => {
                      if (result.ok) setMailPreview(result.data);
                    });
                }}
                onChange={setMailSettings}
                onSave={() => {
                  void services.operations.saveMailSettings(mailSettings).then((result) => {
                    if (result.ok) setOpsSavedLabel(`配信設定を保存: ${new Date().toLocaleTimeString("ja-JP")}`);
                  });
                }}
                previewText={mailPreview}
                savedLabel={opsSavedLabel}
                value={mailSettings}
              />
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
