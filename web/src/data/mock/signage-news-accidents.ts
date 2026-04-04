/** 報道ベースの労働災害ニュース（モック）。リンク先は公開ニュース例。 */
export type NewsLaborAccident = {
  id: string;
  title: string;
  source: string;
  occurredOn: string;
  url: string;
};

export const newsLaborAccidentsMock: NewsLaborAccident[] = [
  {
    id: "news-1",
    title: "建設現場で足場から転落、作業員が重体",
    source: "共同通信",
    occurredOn: "2026-03-28",
    url: "https://www.mhlw.go.jp/",
  },
  {
    id: "news-2",
    title: "工場内で挟まれ事故、生産ライン停止",
    source: "地方紙",
    occurredOn: "2026-03-22",
    url: "https://www.mhlw.go.jp/",
  },
  {
    id: "news-3",
    title: "高所作業中の墜落、安全帯未着用が焦点",
    source: "日経",
    occurredOn: "2026-03-15",
    url: "https://www.mhlw.go.jp/",
  },
  {
    id: "news-4",
    title: "解体現場で飛来物、歩行者に軽傷",
    source: "報道各社",
    occurredOn: "2026-03-10",
    url: "https://www.mhlw.go.jp/",
  },
  {
    id: "news-5",
    title: "熱中症疑いで搬送、屋外作業の見直し呼びかけ",
    source: "NHK",
    occurredOn: "2026-03-05",
    url: "https://www.mhlw.go.jp/",
  },
];
