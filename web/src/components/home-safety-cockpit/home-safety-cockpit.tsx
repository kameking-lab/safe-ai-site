import {
  FlaskConical,
  MessageSquareText,
} from "lucide-react";
import type {
  EnvironmentNationalHeatAlertSummary,
  EnvironmentWbgtStatus,
} from "@/lib/heat-illness/environment-wbgt";
import type { HomeLocationSource } from "@/lib/area/coarse-location";
import type { ReactNode } from "react";
import { UsageNotesLink } from "@/components/usage-notes-link";
import { HomeAreaPickerClient } from "./home-area-picker-client";
import { HomeDirectChatClient } from "./home-chat-quick-ask";
import { HomeDirectChemicalClient } from "./home-chemical-quick-search";
import { HomeHeatSlideDeck, HomeHeatSnapshot } from "./home-heat-content";
import type { HomeHeatSlideSummary } from "./home-types";

const HOME_HEAT_SLIDES: HomeHeatSlideSummary[] = [
  {
    id: "cover",
    eyebrow: "今日のリスク",
    title: "熱中症を防ぐ現場ブリーフィング",
    lead: "測る。変える。声をかける。迷わずつなぐ。",
    fieldAction: "地域のWBGTと警戒情報を確認してから、今日の作業計画へ進む。",
  },
  {
    id: "measure-and-change",
    eyebrow: "作業前・作業中",
    title: "WBGTを測り、作業を変える",
    lead: "値と作業強度に合わせて、時間帯・人数・休憩を調整します。",
    fieldAction: "測定値を共有し、休憩と水分・塩分の時刻を決める。",
  },
  {
    id: "stop-and-connect",
    eyebrow: "異常を感じたら",
    title: "一人にせず、作業を止める",
    lead: "涼しい場所へ移し、衣服を緩めて冷却します。",
    fieldAction: "意識がない、反応がおかしい、自力で飲めない時は119へ連絡する。",
  },
];

export function HomeHeatSectionFrame({ children }: { children: ReactNode }) {
  return (
    <section
      id="home-heat"
      aria-labelledby="home-heat-title"
      className="scroll-mt-24 overflow-hidden border-b border-orange-200 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,.2),transparent_34%),linear-gradient(180deg,#fff7ed_0%,#ffffff_100%)] px-3 pb-2 pt-1 sm:px-6 lg:pb-8 lg:pt-2"
      data-home-section="heat"
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-1 lg:mb-2">
          <h1
            id="home-heat-title"
            className="text-xl font-black leading-tight tracking-[-.035em] text-slate-950 sm:text-3xl lg:text-4xl"
          >
            今日の熱中症リスク
          </h1>
        </header>
        {children}
      </div>
    </section>
  );
}

export function HomeHeatExperience({
  initialAreaId,
  initialAreaLabel,
  initialLocationSource,
  initialWbgt,
  nationalSummary,
}: {
  initialAreaId: string | null;
  initialAreaLabel: string | null;
  initialLocationSource: HomeLocationSource;
  initialWbgt: EnvironmentWbgtStatus | null;
  nationalSummary: EnvironmentNationalHeatAlertSummary | null;
}) {
  return (
    <div className="grid min-w-0 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)]">
      <div className="min-w-0">
        <HomeHeatSnapshot
          areaId={initialAreaId}
          areaLabel={initialAreaLabel}
          initialWbgt={initialWbgt}
          nationalSummary={nationalSummary}
        />
        <HomeAreaPickerClient
          initialAreaId={initialAreaId}
          initialAreaLabel={initialAreaLabel}
          initialLocationSource={initialLocationSource}
        />
      </div>
      <div className="min-w-0">
        <HomeHeatSlideDeck slides={HOME_HEAT_SLIDES} />
      </div>
    </div>
  );
}

export function HomeHeatSection({
  initialAreaId,
  initialAreaLabel,
  initialLocationSource,
  initialWbgt,
  nationalSummary,
}: {
  initialAreaId: string | null;
  initialAreaLabel: string | null;
  initialLocationSource: HomeLocationSource;
  initialWbgt: EnvironmentWbgtStatus | null;
  nationalSummary: EnvironmentNationalHeatAlertSummary | null;
}) {
  return (
    <HomeHeatSectionFrame>
      <HomeHeatExperience
        initialAreaId={initialAreaId}
        initialAreaLabel={initialAreaLabel}
        initialLocationSource={initialLocationSource}
        initialWbgt={initialWbgt}
        nationalSummary={nationalSummary}
      />
    </HomeHeatSectionFrame>
  );
}

export function HomeDirectChatSection() {
  return (
    <section
      id="home-chat"
      aria-labelledby="home-direct-chat-title"
      className="scroll-mt-24 border-y border-sky-200 bg-[linear-gradient(112deg,#eff6ff_0%,#ffffff_55%,#ecfeff_100%)] px-4 py-2 sm:py-6"
      data-home-section="chat"
    >
      <div className="mx-auto grid max-w-7xl gap-1 lg:grid-cols-[minmax(0,.48fr)_minmax(0,1.52fr)] lg:items-center">
        <header>
          <div className="flex items-center gap-2">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-black tracking-[.08em] text-sky-800">
              <MessageSquareText className="h-4 w-4" aria-hidden="true" />
              安衛法AI
            </span>
            <h2
              id="home-direct-chat-title"
              className="text-lg font-black tracking-tight text-slate-950 sm:text-3xl"
            >
              法令の疑問を、その場で聞く
            </h2>
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-700 sm:text-sm">
            作業や設備について、普段の言葉で質問できます。
          </p>
        </header>
        <HomeDirectChatClient />
      </div>
    </section>
  );
}

export function HomeDirectChemicalSection() {
  return (
    <section
      id="home-chemical"
      aria-labelledby="home-direct-chemical-title"
      className="scroll-mt-24 px-4 py-6 sm:py-8"
      data-home-section="chemical"
    >
      <div className="mx-auto max-w-7xl">
        <header>
          <span className="inline-flex items-center gap-2 text-xs font-black tracking-[.16em] text-amber-800">
            <FlaskConical className="h-4 w-4" aria-hidden="true" />
            化学物質RA
          </span>
          <h2
            id="home-direct-chemical-title"
            className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white"
          >
            物質名・CAS番号から始める
          </h2>
          <p className="mt-1 text-xs text-portal-muted sm:text-sm">
            物質名・CAS番号・SDS記載名で検索できます。
          </p>
        </header>
        <div className="mt-3">
          <HomeDirectChemicalClient />
        </div>
        <UsageNotesLink className="mt-1 text-slate-600 dark:text-slate-300" />
      </div>
    </section>
  );
}

/** @deprecated Home now uses independent effect-first sections. */
export function HomeSafetyCockpit() {
  return (
    <HomeHeatExperience
      initialAreaId={null}
      initialAreaLabel={null}
      initialLocationSource="national"
      initialWbgt={null}
      nationalSummary={null}
    />
  );
}
