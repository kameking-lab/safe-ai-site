"use client";

import dynamic from "next/dynamic";

const StatsDashboardImpl = dynamic(
  () => import("./StatsDashboardImpl").then((m) => m.StatsDashboardImpl),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <div className="h-8 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    ),
  },
);

export function StatsDashboard() {
  return <StatsDashboardImpl />;
}
