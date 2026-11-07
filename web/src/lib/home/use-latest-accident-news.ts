"use client";

import { useEffect, useState } from "react";
import type { HomeLatestAccidentNews } from "@/lib/home/home-accident-server";

// The iOS app ships these pages as a static export, so the server-rendered list is frozen at
// build time (usually empty). In the app only, refresh it from the live API once per page load.
let pending: Promise<HomeLatestAccidentNews | null> | null = null;

function isNews(value: unknown): value is HomeLatestAccidentNews {
  const news = value as Partial<HomeLatestAccidentNews> | null;
  return !!news && Array.isArray(news.items) && (news.status === "live" || news.status === "unavailable") && typeof news.checkedAt === "string";
}

export function useLatestAccidentNews(initial: HomeLatestAccidentNews): HomeLatestAccidentNews {
  const [news, setNews] = useState(initial);
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ANZEN_NATIVE !== "true") return;
    let active = true;
    pending ??= fetch("/api/mobile/v1/home-news", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((value: unknown) => (isNews(value) ? value : null))
      .catch(() => null);
    void pending.then((value) => {
      if (!value) pending = null;
      else if (active) setNews(value);
    });
    return () => {
      active = false;
    };
  }, []);
  return news;
}
