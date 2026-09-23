import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { SafetyGoodsWizard } from "./safety-goods-wizard";

const { trackEventMock } = vi.hoisted(() => ({ trackEventMock: vi.fn() }));
vi.mock("@/components/Analytics", () => ({ trackEvent: trackEventMock }));

describe("SafetyGoodsWizard", () => {
  it("公開中の厚労省・NETIS公式URLだけを選定根拠に使う", () => {
    const source = readFileSync(
      resolve(process.cwd(), "src/components/safety-goods-wizard.tsx"),
      "utf8",
    );

    expect(source).not.toContain("0000187558.html");
    expect(source).not.toContain("www.mlit.go.jp/tec/tec_tk_000067.html");
    expect(source).toContain("dataId=00tc2747&dataType=1");
    expect(source).toContain("netis/input/pubsearch/search");
  });

  it("作業・条件を順に選び、呼吸用保護具の購入候補へ進める", () => {
    render(<SafetyGoodsWizard />);

    fireEvent.click(screen.getByRole("button", { name: /呼吸用保護具/ }));
    fireEvent.click(screen.getByRole("button", { name: /粉じん・研削・清掃/ }));
    fireEvent.click(screen.getByRole("button", { name: /換気が効いている/ }));

    expect(screen.getByRole("heading", { name: "防じんマスク（製品群）の購入候補" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "呼吸用保護具の実商品写真と高評価候補" })).toBeDefined();
    expect(screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href")).toContain("amazon.co.jp/s");
    expect(decodeURIComponent(screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href") ?? "")).toContain("DD02V-S2-2K");
    expect(screen.getByRole("link", { name: /楽天で候補を見る/ }).getAttribute("href")).toContain("rakuten.co.jp");
    expect(screen.getByText(/国家検定合格標章/)).toBeDefined();
    expect(
      screen.getByRole("heading", { name: /DD02V-S2-2K/ }),
    ).toBeDefined();
    expect(
      screen.getByRole("link", { name: "メーカー公式" }).getAttribute("href"),
    ).toBe("https://www.sts-japan.com/products/dd/");

    fireEvent.click(screen.getByRole("link", { name: /Amazonで候補を見る/ }));
    expect(trackEventMock).toHaveBeenCalledWith("affiliate_click", expect.objectContaining({
      product_id: expect.stringContaining("DD02V-S2-2K"),
    }));
  });

  it("酸欠のおそれを選ぶと、ろ過式マスクを候補にせず測定へ導く", () => {
    render(<SafetyGoodsWizard />);

    fireEvent.click(screen.getByRole("button", { name: /呼吸用保護具/ }));
    fireEvent.click(screen.getByRole("button", { name: /マンホール・槽・ピット/ }));
    fireEvent.click(screen.getByRole("button", { name: /酸素濃度が不明・低いおそれ/ }));

    expect(screen.getByRole("heading", { name: "まず酸素・有害ガスを測るための候補" })).toBeDefined();
    expect(screen.getByText(/防じん・防毒マスクを先に買う入口ではありません/)).toBeDefined();
    expect(screen.getByText(/安易に入らず/)).toBeDefined();
  });

  it("換気が弱い呼吸用保護具では濃度測定と換気改善を購入条件へ反映する", () => {
    render(<SafetyGoodsWizard />);

    fireEvent.click(screen.getByRole("button", { name: /呼吸用保護具/ }));
    fireEvent.click(screen.getByRole("button", { name: /塗装・洗浄・接着/ }));
    fireEvent.click(screen.getByRole("button", { name: /換気が弱い・屋内/ }));

    expect(screen.getByText(/購入前に濃度測定と局所排気の改善を優先/)).toBeDefined();
    expect(screen.getByText(/改善後に必要な防護係数/)).toBeDefined();
    expect(
      decodeURIComponent(
        screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href") ?? "",
      ),
    ).toContain("濃度測定");
  });

  it.each(["換気が効いている", "酸素濃度が不明・低いおそれ"])("危険有害性が不明な場合（%s）は通販候補を出さず、確認と相談へ導く", (condition) => {
    render(<SafetyGoodsWizard />);

    fireEvent.click(screen.getByRole("button", { name: /呼吸用保護具/ }));
    fireEvent.click(screen.getByRole("button", { name: /何が出ているか不明/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(condition) }));

    expect(screen.getByRole("heading", { name: "危険有害性が分かるまで、製品推薦を保留します" })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Amazonで候補を見る/ })).toBeNull();
    expect(screen.queryByRole("link", { name: /楽天で候補を見る/ })).toBeNull();
    expect(screen.queryByRole("heading", { name: /実商品写真と高評価候補/ })).toBeNull();
    expect(screen.getByRole("link", { name: "選定を相談する" }).getAttribute("href")).toBe("/contact/automation-email?subject=ppe-selection");
    expect(screen.getByText(/SDS・酸素濃度・作業環境を確認/)).toBeDefined();
  });

  it.each([
    ["呼吸用保護具", "塗装・洗浄・接着", "換気が効いている", "6001"],
    ["墜落・転落対策", "足場・屋根・高所", "取付設備がある", "1114080N"],
  ])("公式確認済み候補 %s/%s は型式指定の購入検索を使う", (category, task, condition, model) => {
    render(<SafetyGoodsWizard />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(category) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(task) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(condition) }));

    const href = decodeURIComponent(screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href") ?? "");
    expect(href).toContain(model);
  });

  it.each([
    ["墜落・転落対策", "足場・屋根・高所", "取付設備がある", "はしご・脚立", "取付設備がある"],
    ["薬液・化学物質", "薬液の飛散・注入", "SDSが手元にある", "洗浄・拭取り・配管", "SDSが手元にある"],
    ["重機・機械まわり", "重機・フォークリフト周辺", "動線を区画できる", "稼働中の機械の近く", "動線を区画できる"],
    ["騒音・飛来物", "研削・切断・はつり", "短時間・断続的", "溶接・光を使う作業", "短時間・断続的"],
    ["足元・移動", "濡れた床・油・段差", "屋外・不整地", "釘・金属片・解体材", "屋外・不整地"],
  ])("%s は作業を変えると購入検索が変わる", (category, firstTask, firstCondition, secondTask, secondCondition) => {
    const first = render(<SafetyGoodsWizard />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(category) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(firstTask) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(firstCondition) }));
    const firstHref = screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href");
    first.unmount();

    render(<SafetyGoodsWizard />);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(category) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(secondTask) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(secondCondition) }));
    const secondHref = screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href");
    expect(secondHref).not.toBe(firstHref);
  });

  it("同じ作業でも現場条件を変えると購入検索と確認事項が変わる", () => {
    const first = render(<SafetyGoodsWizard />);
    fireEvent.click(screen.getByRole("button", { name: /重機・機械まわり/ }));
    fireEvent.click(screen.getByRole("button", { name: /重機・フォークリフト周辺/ }));
    fireEvent.click(screen.getByRole("button", { name: /動線を区画できる/ }));
    const firstHref = screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href");
    expect(screen.getByText(/区画が作業中に外されない/)).toBeDefined();
    first.unmount();

    render(<SafetyGoodsWizard />);
    fireEvent.click(screen.getByRole("button", { name: /重機・機械まわり/ }));
    fireEvent.click(screen.getByRole("button", { name: /重機・フォークリフト周辺/ }));
    fireEvent.click(screen.getByRole("button", { name: /人と機械の動線が重なる/ }));
    const secondHref = screen.getByRole("link", { name: /Amazonで候補を見る/ }).getAttribute("href");
    expect(secondHref).not.toBe(firstHref);
    expect(screen.getByText(/交差点ごとの優先ルール/)).toBeDefined();
  });
});
