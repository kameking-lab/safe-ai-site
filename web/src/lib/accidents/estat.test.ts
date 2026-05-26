import { describe, expect, it } from "vitest";
import { parseEstatStatsList } from "@/lib/accidents/estat";

const sample = {
  GET_STATS_LIST: {
    RESULT: { STATUS: 0, ERROR_MSG: "正常に終了しました。" },
    DATALIST_INF: {
      NUMBER: 2,
      TABLE_INF: [
        {
          "@id": "0003408508",
          STAT_NAME: { "@code": "00501001", $: "労災統計" },
          GOV_ORG: { "@code": "00501", $: "厚生労働省" },
          TITLE: { "@no": "4-1", $: "雇用労働者の労働災害数" },
          STATISTICS_NAME: "労災統計 確報",
          SURVEY_DATE: 0,
          UPDATED_DATE: "2024-01-15",
        },
      ],
    },
  },
};

describe("parseEstatStatsList", () => {
  it("STATUS=0 のカタログを正規化", () => {
    const r = parseEstatStatsList(sample);
    expect(r.ok).toBe(true);
    expect(r.status).toBe(0);
    expect(r.tables).toHaveLength(1);
    expect(r.tables[0].id).toBe("0003408508");
    expect(r.tables[0].govOrg).toBe("厚生労働省");
    expect(r.tables[0].title).toBe("雇用労働者の労働災害数");
    expect(r.tables[0].url).toContain("0003408508");
  });

  it("TABLE_INF が単一オブジェクトでも配列化", () => {
    const single = JSON.parse(JSON.stringify(sample));
    single.GET_STATS_LIST.DATALIST_INF.TABLE_INF = sample.GET_STATS_LIST.DATALIST_INF.TABLE_INF[0];
    expect(parseEstatStatsList(single).tables).toHaveLength(1);
  });

  it("STATUS!=0 は ok=false", () => {
    const err = { GET_STATS_LIST: { RESULT: { STATUS: 1 }, DATALIST_INF: {} } };
    const r = parseEstatStatsList(err);
    expect(r.ok).toBe(false);
    expect(r.tables).toEqual([]);
  });

  it("不正な入力は ok=false・空", () => {
    expect(parseEstatStatsList(null).tables).toEqual([]);
    expect(parseEstatStatsList({}).ok).toBe(false);
  });
});
