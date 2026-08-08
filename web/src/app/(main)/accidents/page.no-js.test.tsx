import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { getAccidentCasesDataset } from "@/data/mock/accident-cases";
import {
  ACCIDENT_PROVENANCE_INFO,
  resolveAccidentProvenance,
  resolveAccidentSource,
} from "@/lib/accident-source";
import { AccidentsNoScriptFallback } from "@/components/accidents/accidents-noscript-fallback";

describe("/accidents JavaScript-disabled fallback", () => {
  it("実件数と確認済みの公表事例、公式検索導線をserver HTMLに含める", () => {
    const dataset = getAccidentCasesDataset();
    const verifiedCase = dataset.find(
      (accident) => resolveAccidentProvenance(accident) === "mhlw",
    );

    expect(verifiedCase).toBeDefined();
    if (!verifiedCase) return;

    const source = resolveAccidentSource(verifiedCase);
    expect(source?.url).toBeTruthy();

    const html = renderToStaticMarkup(
      <AccidentsNoScriptFallback
        totalCount={dataset.length}
        featuredCase={verifiedCase}
      />,
    );

    expect(html).toContain("data-accidents-noscript-result");
    expect(html).toContain("[data-accidents-client-only]");
    expect(html).toContain("display: none !important");
    expect(html).toContain(`サイト収録 ${dataset.length}件`);
    expect(html).toContain(verifiedCase.title);
    expect(html).toContain(ACCIDENT_PROVENANCE_INFO.mhlw.label);
    expect(html).toContain(`/accidents/${verifiedCase.id}`);
    expect(html).toContain(source?.url ?? "missing-official-source");
    expect(html).toContain(
      "https://anzeninfo.mhlw.go.jp/anzen_pg/SIB_FND.html",
    );
    expect(html).not.toContain("サイト収録の0件");
    expect(html).not.toContain("該当なし");
  });

  it("確認済み事例がない場合も0件と断定せず公式検索導線を残す", () => {
    const html = renderToStaticMarkup(
      <AccidentsNoScriptFallback totalCount={292} featuredCase={null} />,
    );

    expect(html).not.toContain("data-accidents-noscript-result");
    expect(html).not.toContain("該当なし");
    expect(html).toContain("厚労省の死亡災害データベースで探す");
  });
});
