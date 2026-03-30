"use client";

import { useState } from "react";

const tabs = [
  { id: "laws", label: "法改正一覧" },
  { id: "summary", label: "AI要約" },
  { id: "chat", label: "質問チャット" },
];

export function TabNavigation() {
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <nav
      aria-label="メインタブ"
      className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur"
    >
      <ul className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;

          return (
            <li key={tab.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {tab.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
