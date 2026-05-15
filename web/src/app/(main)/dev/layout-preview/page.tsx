import type { Metadata } from "next";
import {
  PageContainer,
  Section,
  Stack,
  Cluster,
  CardGrid,
  SidebarLayout,
  SplitView,
} from "@/components/layout";

export const metadata: Metadata = {
  title: "Layout primitives preview (dev)",
  description: "Internal preview for layout primitive QA. Not indexed.",
  robots: { index: false, follow: false },
  alternates: { canonical: undefined },
};

function Box({ label, h = "h-16" }: { label: string; h?: string }) {
  return (
    <div
      className={`flex ${h} items-center justify-center rounded-lg border border-dashed border-emerald-300 bg-emerald-50/60 text-xs font-semibold text-emerald-800`}
    >
      {label}
    </div>
  );
}

function ViewportHint() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
      <p className="font-bold">Viewport reference (Tailwind v4 defaults)</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        <li>sm: 640 — large phones / phone landscape</li>
        <li>md: 768 — iPad mini portrait</li>
        <li>lg: 1024 — iPad portrait, notebook PC</li>
        <li>xl: 1280 — desktop</li>
        <li>2xl: 1536 — wide desktop</li>
      </ul>
      <p className="mt-1">
        Smartphone targets: 360 / 375 / 390. Resize the browser to verify each
        primitive collapses cleanly without horizontal scroll.
      </p>
    </div>
  );
}

export default function LayoutPreviewPage() {
  return (
    <PageContainer>
      <Stack gap="lg">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Layout primitives preview
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Internal QA surface for PageContainer / Section / Stack / Cluster /
            CardGrid / SidebarLayout / SplitView. Not linked from production
            navigation; robots: noindex.
          </p>
        </header>

        <ViewportHint />

        <Section title="PageContainer widths" description="narrow / prose / wide / full">
          <Stack gap="sm">
            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">width=&quot;narrow&quot; (max-w-2xl)</p>
              <PageContainer width="narrow" paddingX="tight" paddingY="tight">
                <Box label="narrow" />
              </PageContainer>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">width=&quot;prose&quot; (max-w-4xl)</p>
              <PageContainer width="prose" paddingX="tight" paddingY="tight">
                <Box label="prose" />
              </PageContainer>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">width=&quot;wide&quot; (max-w-6xl)</p>
              <PageContainer width="wide" paddingX="tight" paddingY="tight">
                <Box label="wide" />
              </PageContainer>
            </div>
            <div className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">width=&quot;full&quot; (max-w-7xl, default)</p>
              <PageContainer width="full" paddingX="tight" paddingY="tight">
                <Box label="full" />
              </PageContainer>
            </div>
          </Stack>
        </Section>

        <Section title="CardGrid (cols=2)" description="1 col below sm (640), 2 cols at sm and above">
          <CardGrid cols={2}>
            <Box label="A" />
            <Box label="B" />
            <Box label="C" />
            <Box label="D" />
          </CardGrid>
        </Section>

        <Section title="CardGrid (cols=3)" description="1 → 2 (sm) → 3 (lg)">
          <CardGrid cols={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Box key={i} label={`Card ${i + 1}`} />
            ))}
          </CardGrid>
        </Section>

        <Section title="CardGrid (cols=4)" description="1 → 2 (sm) → 3 (lg) → 4 (xl)">
          <CardGrid cols={4}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Box key={i} label={`#${i + 1}`} h="h-14" />
            ))}
          </CardGrid>
        </Section>

        <Section title="CardGrid (cols='auto')" description="auto-fit minmax(16rem, 1fr): column count adapts to width">
          <CardGrid cols="auto" minColRem={14}>
            {Array.from({ length: 7 }).map((_, i) => (
              <Box key={i} label={`auto ${i + 1}`} />
            ))}
          </CardGrid>
        </Section>

        <Section title="Cluster (toolbar / tag row)" description="flex wrap with consistent gap">
          <Cluster gap="sm">
            {["建設", "製造", "医療福祉", "運輸", "林業", "食品", "小売", "化学"].map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {t}
              </span>
            ))}
          </Cluster>
        </Section>

        <Section
          title="SidebarLayout (breakpoint=lg, default width)"
          description="Stacks below 1024px; 16rem sidebar at lg and above"
        >
          <SidebarLayout
            sidebar={
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-xs font-semibold text-sky-900">
                Sidebar pane
                <p className="mt-1 text-[11px] font-normal text-sky-700">
                  Hidden below lg = stacked above main.
                </p>
              </div>
            }
          >
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900">
              Main pane
              <p className="mt-1 text-[11px] font-normal text-emerald-700">
                Takes full width below lg.
              </p>
            </div>
          </SidebarLayout>
        </Section>

        <Section
          title="SidebarLayout (breakpoint=md, narrow, right placement)"
          description="iPad mini portrait friendly: sidebar appears from 768px on the right"
        >
          <SidebarLayout
            breakpoint="md"
            sidebarWidth="narrow"
            sidebarPlacement="right"
            sidebar={
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 text-xs font-semibold text-violet-900">
                Right sidebar (narrow)
              </div>
            }
          >
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
              Main pane (with right sidebar at md+)
            </div>
          </SidebarLayout>
        </Section>

        <Section
          title="SplitView (list + detail)"
          description="iPad landscape (≥768) shows both; below stacks. detailOpen toggles which pane is visible while stacked."
        >
          <SplitView
            list={
              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:bg-slate-800">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">List pane (20rem)</p>
                <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-300">
                  <li>Item 1</li>
                  <li>Item 2</li>
                  <li>Item 3</li>
                </ul>
              </div>
            }
            detail={
              <div className="rounded-lg border border-slate-300 bg-white p-4 dark:bg-slate-800">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Detail pane (1fr)</p>
                <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                  Detail content for the selected list item appears here.
                </p>
              </div>
            }
          />
        </Section>
      </Stack>
    </PageContainer>
  );
}
