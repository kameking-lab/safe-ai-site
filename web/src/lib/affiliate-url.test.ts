import { afterEach, describe, expect, test, vi } from "vitest";

const ORIG_ENV = { ...process.env };

async function loadModule(env: Record<string, string | undefined>) {
  vi.resetModules();
  process.env = { ...ORIG_ENV, ...env };
  return import("./affiliate-url");
}

afterEach(() => {
  process.env = { ...ORIG_ENV };
});

describe("generateAmazonAffiliateUrl", () => {
  test("ID未設定: tagを付けずに検索URLを返す", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "",
      NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG: "",
    });
    const url = mod.generateAmazonAffiliateUrl("フルハーネス");
    expect(url).toBe("https://www.amazon.co.jp/s?k=%E3%83%95%E3%83%AB%E3%83%8F%E3%83%BC%E3%83%8D%E3%82%B9");
    expect(url).not.toContain("tag=");
  });

  test("ID設定あり: 検索URLにtagパラメータが付与される", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.generateAmazonAffiliateUrl("保護メガネ");
    expect(url).toContain("tag=safeaisite22-22");
    expect(url).toContain("amazon.co.jp/s");
  });

  test("ASIN指定: /dp/ASIN 形式にtagが付与される", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.generateAmazonAffiliateUrl("ヘルメット", "B07XYZ1234");
    expect(url).toContain("/dp/B07XYZ1234");
    expect(url).toContain("tag=safeaisite22-22");
  });

  test("旧env名（NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG）も後方互換で認識する", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "",
      NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG: "legacy-tag-22",
    });
    const url = mod.generateAmazonAffiliateUrl("safety");
    expect(url).toContain("tag=legacy-tag-22");
  });

  test("特殊文字を含むクエリが正しくエンコードされる", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.generateAmazonAffiliateUrl("保護具 & 安全帯");
    expect(url).toContain("%E4%BF%9D%E8%AD%B7%E5%85%B7");
    expect(url).toContain("%26");
    expect(url).toContain("tag=safeaisite22-22");
  });
});

describe("appendAmazonTag", () => {
  test("Amazon URLにtagを付与する", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.appendAmazonTag("https://www.amazon.co.jp/s?k=helmet");
    expect(url).toContain("tag=safeaisite22-22");
  });

  test("非Amazonドメインは触らない", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.appendAmazonTag("https://example.com/foo");
    expect(url).toBe("https://example.com/foo");
  });

  test("既存のtagが上書きされる", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    const url = mod.appendAmazonTag("https://www.amazon.co.jp/dp/B0XYZ?tag=old-tag");
    expect(url).toContain("tag=safeaisite22-22");
    expect(url).not.toContain("tag=old-tag");
  });

  test("不正URLはそのまま返す", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_AMAZON_AFFILIATE_ID: "safeaisite22-22",
    });
    expect(mod.appendAmazonTag("not a url")).toBe("not a url");
  });
});

describe("generateRakutenSearchUrl", () => {
  test("ID未設定: 元URL（search.rakuten.co.jp）を返す", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID: "",
    });
    const url = mod.generateRakutenSearchUrl("フルハーネス");
    expect(url).toContain("search.rakuten.co.jp/search/mall/");
    expect(url).not.toContain("hb.afl.rakuten.co.jp");
  });

  test("ID設定あり: hb.afl.rakuten.co.jp 経由のURLを返す", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID: "5291f19d.a0fc3c16.5291f19e.b91d11f6",
    });
    const url = mod.generateRakutenSearchUrl("保護メガネ");
    expect(url).toContain("https://hb.afl.rakuten.co.jp/ichiba/5291f19d.a0fc3c16.5291f19e.b91d11f6/");
    expect(url).toContain("pc=https%3A%2F%2Fsearch.rakuten.co.jp%2Fsearch%2Fmall%2F");
  });
});

describe("generateRakutenAffiliateUrl", () => {
  test("既にアフィリエイトURLなら二重ラップしない", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID: "5291f19d.a0fc3c16.5291f19e.b91d11f6",
    });
    const already = "https://hb.afl.rakuten.co.jp/ichiba/abc/?pc=foo";
    expect(mod.generateRakutenAffiliateUrl(already)).toBe(already);
  });

  test("非楽天ドメインは触らない", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID: "5291f19d.a0fc3c16.5291f19e.b91d11f6",
    });
    expect(mod.generateRakutenAffiliateUrl("https://example.com/foo")).toBe(
      "https://example.com/foo"
    );
  });

  test("商品ページURLをアフィリ経由に変換する", async () => {
    const mod = await loadModule({
      NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID: "myaffid",
    });
    const url = mod.generateRakutenAffiliateUrl("https://item.rakuten.co.jp/shop/abc/");
    expect(url).toContain("https://hb.afl.rakuten.co.jp/ichiba/myaffid/");
    expect(url).toContain("pc=https%3A%2F%2Fitem.rakuten.co.jp%2Fshop%2Fabc%2F");
  });
});
