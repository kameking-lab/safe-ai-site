/** 報道ベースの労働災害ニュース（見出し例）。リンクは検索エンジン経由で偽URLを避ける。 */
export type NewsLaborAccident = {
  id: string;
  title: string;
  source: string;
  occurredOn: string;
  /** 検索クエリに足す語（省略時は「労働災害」） */
  searchKeyword?: string;
};

export const newsLaborAccidentsMock: NewsLaborAccident[] = [
  {
    id: "news-1",
    title: "建設現場で足場から転落、作業員が重体",
    source: "報道検索",
    occurredOn: "2026-03-28",
    searchKeyword: "建設 転落",
  },
  {
    id: "news-2",
    title: "工場内で挟まれ事故、生産ライン停止",
    source: "報道検索",
    occurredOn: "2026-03-22",
    searchKeyword: "工場 挟まれ",
  },
  {
    id: "news-3",
    title: "高所作業中の墜落、安全帯未着用が焦点",
    source: "報道検索",
    occurredOn: "2026-03-15",
    searchKeyword: "高所作業 墜落",
  },
  {
    id: "news-4",
    title: "解体現場で飛来物、歩行者に軽傷",
    source: "報道検索",
    occurredOn: "2026-03-10",
    searchKeyword: "解体 飛来物",
  },
  {
    id: "news-5",
    title: "熱中症疑いで搬送、屋外作業の見直し呼びかけ",
    source: "報道検索",
    occurredOn: "2026-03-05",
    searchKeyword: "熱中症 労働",
  },
];
