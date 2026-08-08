import { describe, expect, it } from "vitest";
import { POST } from "./route";

function formRequest(
  message: string,
  headers: HeadersInit = {},
  context?: string,
) {
  const form = new URLSearchParams({ message });
  if (context) form.set("context", context);
  return new Request("http://localhost/api/chatbot/no-script", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: "http://localhost",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: form,
  });
}

function hiddenContext(html: string): string {
  const value = html.match(/name="context" value="([^"]*)"/)?.[1] ?? "";
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

describe("JavaScript無効時の法令対話", () => {
  it("質問をURLへ載せずPOSTで短文回答を返す", async () => {
    const response = await POST(formRequest("足場の手すりは何センチ？"));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(html).toContain("回答");
    expect(html).toContain('method="post"');
    expect(html).toContain('action="/api/chatbot/no-script"');
    expect(html).not.toContain("?message=");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-security-policy")).toContain(
      "form-action 'self'",
    );

    const substantiveIndex = html.indexOf("85cm以上");
    const clarificationIndex = html.indexOf("<h2>確認</h2>");
    const sourcesIndex = html.indexOf("<details>");
    expect(substantiveIndex).toBeGreaterThanOrEqual(0);
    expect(clarificationIndex).toBeGreaterThan(substantiveIndex);
    expect(sourcesIndex).toBeGreaterThan(clarificationIndex);
    expect(html).toMatch(/第563条[^<]*第3号/);
    expect(html).toMatch(/第552条[^<]*第4号/);
    expect(html).not.toContain("<details open");
    expect((html.match(/<div class="chips"/g) ?? []).length).toBeLessThanOrEqual(1);
    const chipMarkup = html.match(/<div class="chips"[\s\S]*?<\/div>/)?.[0] ?? "";
    expect((chipMarkup.match(/<button/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it("許可済み条件だけをhiddenで引き継ぎ、短いfollow-upでも電気文脈を維持する", async () => {
    const first = await POST(formRequest("電気作業の資格は？"));
    const firstHtml = await first.text();
    const context = hiddenContext(firstHtml);
    expect(JSON.parse(context)).toMatchObject({
      workType: "電気作業",
      equipment: "電気設備",
      qualification: "資格",
    });
    expect(context).not.toContain("電気作業の資格は？");

    const second = await POST(formRequest("作業主任者", {}, context));
    const secondHtml = await second.text();
    expect(second.status).toBe(200);
    expect(secondHtml).toContain("電気作業");
    expect(secondHtml).toContain("作業主任者");
    expect(secondHtml).not.toMatch(/酸欠|有機溶剤|石綿/);
    const displayedSourceNumbers = [
      ...secondHtml.matchAll(/<li><strong>［(\d+)］/g),
    ].map((match) => Number(match[1]));
    const answerMarkerNumbers = [
      ...secondHtml
        .split("<details>", 1)[0]!
        .matchAll(/［(\d+)］/g),
    ].map((match) => Number(match[1]));
    expect(displayedSourceNumbers.length).toBeGreaterThan(3);
    expect(displayedSourceNumbers).toContain(Math.max(...answerMarkerNumbers));

    const pronoun = await POST(formRequest("それについて詳しく", {}, context));
    const pronounHtml = await pronoun.text();
    expect(pronoun.status).toBe(200);
    expect(pronounHtml).toContain("電気作業");
    expect(pronounHtml).not.toContain("前の会話内容を確認できない");
  });

  it.each([
    "worker@example.comの資格は？",
    "小野太郎です 足場の手すり高さは？",
    "妊娠中です。高所作業はできますか？",
    "小野太郎が作業します。フルハーネスは必要？",
    "作業員Aは妊娠中です。高所作業はできますか？",
    "小野太郎がフォークリフトを運転します。資格は？",
    "妊娠しています。高所作業はできますか？",
    "腰痛があります。重量物を扱えますか？",
    "睡眠薬を飲んでいます。運転できますか？",
    "小野太郎にフルハーネスを支給します。",
    "小野太郎をフォークリフト担当にします。資格は？",
    "妊娠してます。高所作業はできますか？",
    "薬を飲んでます。運転できますか？",
    "腰痛持ちです。重量物を扱えますか？",
    "サトウタロウがフォークリフトを運転します。資格は？",
    "私、腰が痛くて薬を飲みました。高所作業はできますか？",
    "新宿区西新宿2-8-1の現場です",
  ])("PII・健康情報を本文へ再表示せず遮断する: %s", async (message) => {
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("個人情報");
    expect(html).not.toContain(message);
  });

  it.each([
    "作業員が倒れて反応がありません",
    "同僚が倒れてる。どうすれば？",
    "人が倒れてます。助けて",
    "作業員が気を失いました。どうすれば？",
    "同僚が気絶しています。助けて",
    "作業員が息ができない。どうすれば？",
    "同僚が息苦しい。助けて",
    "作業員が呼吸困難です。どうしたらいい？",
    "同僚が窒息しています。助けて",
    "作業員がぐったりして呼びかけに応じません",
    "同僚が胸が苦しい。どうすれば？",
    "血が噴き出して止まりません。助けて",
    "人が倒れて起きません。どうすれば？",
    "作業員が倒れ込んで動きません",
    "作業員が心停止です。助けて",
    "同僚の脈がありません。どうすれば？",
    "同僚の唇が紫で呼吸が浅いです",
    "作業員が倒れて返答ありません。どうする？",
    "胸を締め付けられるように痛がっています。",
  ])("緊急表現では通常回答せず119を示す: %s", async (message) => {
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("119");
    expect(html).not.toContain("根拠 1件");
  });

  it("cross-siteフォームを拒否する", async () => {
    const response = await POST(
      formRequest("足場の手すりは？", {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(response.status).toBe(403);
  });
});
