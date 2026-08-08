import { afterEach, describe, expect, it, vi } from "vitest";

const chatbotRouteMock = vi.hoisted(() => ({
  actualPost: null as null | ((request: Request) => Promise<Response>),
  post: vi.fn<(request: Request) => Promise<Response>>(),
}));

vi.mock("../route", async (importOriginal) => {
  const actual = await importOriginal<{
    POST: (request: Request) => Promise<Response>;
  }>();
  chatbotRouteMock.actualPost = actual.POST;
  chatbotRouteMock.post.mockImplementation(actual.POST);
  return { ...actual, POST: chatbotRouteMock.post };
});

import { POST } from "./route";
import { __resetRateLimitForTests } from "@/lib/chatbot-rate-limit";

function formRequest(
  message: string,
  headers: HeadersInit = {},
  context?: string,
  state?: string,
) {
  const form = new URLSearchParams({ message });
  if (context) form.set("context", context);
  if (state) form.set("state", state);
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

function decodeHiddenValue(value: string): string {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function hiddenState(html: string): string {
  const value = html.match(/name="state" value="([^"]*)"/)?.[1] ?? "";
  return decodeHiddenValue(value);
}

function hiddenContext(html: string): string {
  const state = JSON.parse(hiddenState(html)) as { context?: unknown };
  return JSON.stringify(state.context ?? {});
}

describe("JavaScript無効時の法令対話", () => {
  afterEach(() => {
    __resetRateLimitForTests();
    vi.unstubAllGlobals();
    chatbotRouteMock.post.mockReset();
    chatbotRouteMock.post.mockImplementation(chatbotRouteMock.actualPost!);
  });

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
    expect(response.headers.get("x-ai-used")).toBe("false");
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
    expect(html).toContain("施行中");
    expect(html).toContain("確認状態：回答と根拠の対応は最終確認が必要です。");
    expect(html).not.toContain("<details open");
    expect(html).not.toContain('class="scope-warnings"');
    expect(
      (html.match(/<div class="chips"/g) ?? []).length,
    ).toBeLessThanOrEqual(1);
    const chipMarkup =
      html.match(/<div class="chips"[\s\S]*?<\/div>/)?.[0] ?? "";
    expect((chipMarkup.match(/<button/g) ?? []).length).toBeLessThanOrEqual(3);
  });

  it("熱中症回答の確認済み通達とリーフレットを根拠後のdetailsへ表示する", async () => {
    const response = await POST(formRequest("熱中症の報告体制は義務？"));
    const html = await response.text();
    const answerIndex = html.indexOf('<p class="answer">');
    const evidenceIndex = html.indexOf("<summary>根拠 ");
    const materialsIndex = html.indexOf("<summary>関連公式資料 ");

    expect(response.status).toBe(200);
    expect(answerIndex).toBeGreaterThanOrEqual(0);
    expect(evidenceIndex).toBeGreaterThan(answerIndex);
    expect(materialsIndex).toBeGreaterThan(evidenceIndex);
    expect(html).toContain("確認済み通達");
    expect(html).toContain("基発0520第6号");
    expect(html).toContain("PDF 2ページ 第3 1(1)イ");
    expect(html).toContain("熱中症を防ごう！");
    expect(html).toContain("働く人の今すぐ使える熱中症ガイド");
    expect(html).toContain(
      'href="https://www.mhlw.go.jp/content/11303000/001490911.pdf"',
    );
    expect(
      html.match(/<summary>関連公式資料 3件<\/summary>/g) ?? [],
    ).toHaveLength(1);
    expect(html).not.toContain("<details open");
  });

  it("構造化根拠の条項号・施行状態・許可済み公式URLだけを安全に表示する", async () => {
    chatbotRouteMock.post.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: "足場には85cm以上の手すりが必要です。［1］",
          substantiveAnswer: "足場には85cm以上の手すりが必要です。［1］",
          assumptions: [],
          conditions: [],
          clarificationQuestion: null,
          quickReplies: [],
          sources: [
            {
              law: "労働安全衛生規則",
              article: "第563条",
              paragraph: "第1項",
              item: "第3号",
              applicationStatus: "current",
              effectiveOn: "2025-04-01",
              text: "高さ85センチメートル以上の手すり",
              url: "https://elaws.e-gov.go.jp/document?lawid=347M50002000032",
            },
            {
              law: "偽の法令<script>alert(1)</script>",
              article: "第1条",
              text: "<img src=x onerror=alert(1)>",
              url: "javascript:alert(1)",
            },
          ],
          attachedNotices: [
            {
              title: "<script>alert(2)</script>",
              noticeNumber: "悪意通達",
              issuedDateRaw: "2026-08-09",
              locator: null,
              excerpt: "悪意資料",
              pdfUrl: "https://attacker.example/payload.pdf",
              sourceUrl: "javascript:alert(2)",
              detailUrl: null,
            },
          ],
          attachedLeaflets: [],
          source_type: "rag",
          confidence: "high",
          requiresHumanReview: true,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-AI-Used": "false",
          },
        },
      ),
    );

    const response = await POST(formRequest("足場の手すり高さは？"));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toMatch(/第563条 第1項 第3号/);
    expect(html).toContain("施行中・適用日 2025-04-01");
    expect(html).toContain(
      'href="https://elaws.e-gov.go.jp/document?lawid=347M50002000032"',
    );
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("attacker.example");
    expect(html).not.toContain("悪意通達");
    expect(html).not.toContain("<script>alert(2)</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, follow, noarchive",
    );
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("content-security-policy")).toBe(
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    );
    expect(response.headers.get("x-ai-used")).toBe("false");
  });

  it("許可済み条件だけをhiddenで引き継ぎ、短いfollow-upでも電気文脈を維持する", async () => {
    const first = await POST(formRequest("電気作業の資格は？"));
    const firstHtml = await first.text();
    const state = hiddenState(firstHtml);
    const context = hiddenContext(firstHtml);
    expect(JSON.parse(context)).toMatchObject({
      workType: "電気作業",
      equipment: "電気設備",
      qualification: "資格",
    });
    expect(context).not.toContain("電気作業の資格は？");

    const second = await POST(formRequest("作業主任者", {}, undefined, state));
    const secondHtml = await second.text();
    expect(second.status).toBe(200);
    expect(secondHtml).toContain("電気作業");
    expect(secondHtml).toContain("作業主任者");
    expect(secondHtml).not.toMatch(/酸欠|有機溶剤|石綿/);
    const displayedSourceNumbers = [
      ...secondHtml.matchAll(/<li><strong>［(\d+)］/g),
    ].map((match) => Number(match[1]));
    const answerMarkerNumbers = [
      ...secondHtml.split("<details>", 1)[0]!.matchAll(/［(\d+)］/g),
    ].map((match) => Number(match[1]));
    expect(displayedSourceNumbers.length).toBeGreaterThan(3);
    expect(displayedSourceNumbers).toContain(Math.max(...answerMarkerNumbers));

    const pronoun = await POST(
      formRequest("それについて詳しく", {}, undefined, state),
    );
    const pronounHtml = await pronoun.text();
    expect(pronoun.status).toBe(200);
    expect(pronounHtml).toContain("電気作業");
    expect(pronounHtml).not.toContain("前の会話内容を確認できない");
  });

  it("報告先・期限だけのfollow-upと明示的な話題変更をno-scriptでも区別する", async () => {
    const heat = await POST(formRequest("熱中症の報告義務は？"));
    const heatHtml = await heat.text();
    const heatState = hiddenState(heatHtml);
    const recipient = await POST(
      formRequest("誰に報告するの？", {}, undefined, heatState),
    );
    const recipientHtml = await recipient.text();
    expect(recipient.status).toBe(200);
    expect(recipientHtml).toMatch(
      /報告先.*一律に指定していません|誰へ報告するか.*体制/,
    );
    expect(recipientHtml).toMatch(/労働安全衛生規則[^<]*第612条の2/);
    expect(recipientHtml).not.toContain("第34条の21");

    for (const shortRecipient of ["誰に？", "どこへ？"]) {
      const shortResponse = await POST(
        formRequest(shortRecipient, {}, undefined, heatState),
      );
      const shortHtml = await shortResponse.text();
      expect(shortResponse.status).toBe(200);
      expect(shortHtml).toMatch(
        /報告先.*一律に指定していません|誰へ報告するか.*体制/,
      );
      expect(shortHtml).toMatch(/労働安全衛生規則[^<]*第612条の2/);
    }

    const controller = await POST(formRequest("作業指揮者は必要？"));
    const controllerHtml = await controller.text();
    const controllerState = hiddenState(controllerHtml);
    expect(controllerHtml).not.toContain("前の会話内容を確認できない");
    const organic = await POST(
      formRequest("有機溶剤の換気は必要？", {}, undefined, controllerState),
    );
    const organicHtml = await organic.text();
    expect(organic.status).toBe(200);
    expect(organicHtml).toMatch(/有機溶剤.*換気|局所排気/);
    expect(organicHtml).not.toContain("第151条の4");
  });

  it("先に尋ねた報告先の意図を後続の法令topicへno-scriptでも結合する", async () => {
    const first = await POST(formRequest("報告はどこへ？"));
    const firstHtml = await first.text();
    const state = hiddenState(firstHtml);

    expect(first.status).toBe(200);
    expect(state).not.toBe("");
    expect(state).toContain('"intent":"reportRecipient"');
    expect(state).not.toContain("報告はどこへ");
    expect(firstHtml).toContain("前の会話内容を確認できない");

    const second = await POST(
      formRequest("労働者死傷病報告についてです", {}, undefined, state),
    );
    const secondHtml = await second.text();

    expect(second.status).toBe(200);
    expect(secondHtml).toMatch(/報告先は、所轄労働基準監督署長/);
    expect(secondHtml).toMatch(/労働安全衛生規則[^<]*第97条/);
    expect(secondHtml).not.toContain("前の会話内容を確認できない");
  });

  it("労災報告・酸欠教育・燻蒸監視人の正しい条項号をno-scriptでも表示する", async () => {
    const injury = await POST(
      formRequest("休業4日の労災事故はいつまでに報告しますか？"),
    );
    const injuryHtml = await injury.text();
    expect(injury.status).toBe(200);
    expect(injuryHtml).toMatch(/休業4日以上.*4日ちょうど.*遅滞なく/);
    expect(injuryHtml).toMatch(/労働安全衛生規則[^<]*第97条/);
    expect(injuryHtml).not.toMatch(/労災保険法[^<]*第7条/);
    const injuryState = hiddenState(injuryHtml);
    const injuryRecipient = await POST(
      formRequest("誰に？", {}, undefined, injuryState),
    );
    const injuryRecipientHtml = await injuryRecipient.text();
    expect(injuryRecipient.status).toBe(200);
    expect(injuryRecipientHtml).toMatch(/報告先は、所轄労働基準監督署長/);
    const injuryDeadline = await POST(
      formRequest("いつまで？", {}, undefined, injuryState),
    );
    const injuryDeadlineHtml = await injuryDeadline.text();
    expect(injuryDeadline.status).toBe(200);
    expect(injuryDeadlineHtml).toMatch(/休業4日以上.*4日ちょうど.*遅滞なく/);

    const oxygen = await POST(
      formRequest("酸欠則12条1項3号と4号は2種でも要る？"),
    );
    const oxygenHtml = await oxygen.text();
    expect(oxygen.status).toBe(200);
    expect(oxygenHtml).toMatch(/第3号.*第4号.*共通/);
    expect(oxygenHtml).toMatch(/第12条第1項・第2項[^<]*第3号・第4号/);
    const oxygenState = hiddenState(oxygenHtml);
    for (const oxygenFollowup of [
      ["いつまでに受ける？", /従事させる時点までに実施/],
      ["誰が受ける？", /対象は.*酸素欠乏危険作業に係る業務へ就く労働者/],
      ["いつまで？", /従事させる時点までに実施/],
      ["誰が？", /対象は.*酸素欠乏危険作業に係る業務へ就く労働者/],
    ] as const) {
      const followup = await POST(
        formRequest(oxygenFollowup[0], {}, undefined, oxygenState),
      );
      const followupHtml = await followup.text();
      expect(followup.status).toBe(200);
      expect(followupHtml).toMatch(oxygenFollowup[1]);
      expect(followupHtml).toMatch(/酸素欠乏症等防止規則[^<]*第12条/);
      expect(followupHtml).not.toMatch(/作業主任者技能講習.*選任/);
    }

    const fumigation = await POST(
      formRequest("特化則38条の14の監視人はどの号？"),
    );
    const fumigationHtml = await fumigation.text();
    expect(fumigation.status).toBe(200);
    expect(fumigationHtml).toMatch(/第1項第5号ただし書.*第1項第12号ただし書/);
    expect(fumigationHtml).toMatch(/第38条の14[^<]*第1項[^<]*第5号・第12号/);
    expect(fumigationHtml).toMatch(/第5号.*監視人.*第12号.*監視人/);

    const broadMonitor = await POST(formRequest("監視人は必要？"));
    const broadMonitorHtml = await broadMonitor.text();
    expect(broadMonitor.status).toBe(200);
    expect(broadMonitorHtml).toMatch(
      /特定化学物質障害予防規則[^<]*第38条の14[^<]*第1項[^<]*第5号・第12号/,
    );
    expect(broadMonitorHtml).toMatch(/第5号.*監視人.*第12号.*監視人/);

    const forkliftInitial = await POST(
      formRequest("フォークリフトの技能講習は必要？"),
    );
    const forkliftInitialHtml = await forkliftInitial.text();
    const forkliftState = hiddenState(forkliftInitialHtml);
    for (const forkliftFollowup of [
      ["いつまで有効？", /有効期限や定期更新は定めていません/],
      ["誰が受ける？", /最大荷重1トン以上.*運転業務に就く人.*技能講習/],
    ] as const) {
      const followup = await POST(
        formRequest(forkliftFollowup[0], {}, undefined, forkliftState),
      );
      const followupHtml = await followup.text();
      expect(followup.status).toBe(200);
      expect(followupHtml).toMatch(forkliftFollowup[1]);
    }
  });

  it("点検記録・教育時期・一般資格の短いfollow-upを直前制度へ結合する", async () => {
    const scaffoldInitial = await POST(formRequest("足場の点検は必要？"));
    const scaffoldState = hiddenState(await scaffoldInitial.text());
    const scaffoldFollowup = await POST(
      formRequest("その点検は記録するの？", {}, undefined, scaffoldState),
    );
    const scaffoldHtml = await scaffoldFollowup.text();
    expect(scaffoldFollowup.status).toBe(200);
    expect(scaffoldHtml).toMatch(/足場.*点検.*記録|点検.*記録.*足場/);
    expect(scaffoldHtml).toMatch(
      /労働安全衛生規則[^<]*第567条[^<]*第3項[^<]*第1号・第2号/,
    );
    expect(scaffoldHtml).not.toMatch(/特定化学物質障害予防規則[^<]*第34条の2/);

    const oxygenInitial = await POST(
      formRequest("第二種酸素欠乏危険作業の特別教育は必要ですか？"),
    );
    const oxygenState = hiddenState(await oxygenInitial.text());
    const oxygenFollowup = await POST(
      formRequest("作業前に受ける必要がある？", {}, undefined, oxygenState),
    );
    const oxygenHtml = await oxygenFollowup.text();
    expect(oxygenFollowup.status).toBe(200);
    expect(oxygenHtml).toMatch(/従事させる時点までに実施|業務に就かせるとき/);
    expect(oxygenHtml).toMatch(/酸素欠乏症等防止規則[^<]*第12条[^<]*第2項/);
    expect(oxygenHtml).not.toMatch(/第52条の15/);

    const oxygenInstructorInitial = await POST(
      formRequest("酸欠作業の特別教育は？"),
    );
    const oxygenInstructorState = hiddenState(
      await oxygenInstructorInitial.text(),
    );
    for (const instructorFollowup of ["誰が教えるの？", "講師は誰？"]) {
      const oxygenInstructor = await POST(
        formRequest(instructorFollowup, {}, undefined, oxygenInstructorState),
      );
      const oxygenInstructorHtml = await oxygenInstructor.text();
      expect(oxygenInstructor.status).toBe(200);
      expect(oxygenInstructorHtml).toMatch(/法的義務を負うのは事業者/);
      expect(oxygenInstructorHtml).toMatch(
        /講師個人の資格名までは同条で定めていません/,
      );
      expect(oxygenInstructorHtml).toMatch(/酸素欠乏症等防止規則[^<]*第12条/);
    }

    const forkliftInitial = await POST(
      formRequest("フォークリフトの運転資格は？"),
    );
    const forkliftState = hiddenState(await forkliftInitial.text());
    for (const [message, expected] of [
      ["いつまで有効？", /有効期限や定期更新は定めていません/],
      ["誰が受ける？", /最大荷重1トン以上.*運転業務に就く人.*技能講習/],
      ["誰が？", /最大荷重1トン以上.*運転業務に就く人.*技能講習/],
    ] as const) {
      const followup = await POST(
        formRequest(message, {}, undefined, forkliftState),
      );
      const html = await followup.text();
      expect(followup.status).toBe(200);
      expect(html).toMatch(expected);
    }
  });

  it.each([
    [
      "作業指揮者は必要？",
      "フォークリフトを使う作業です",
      "作業指揮者",
      "フォークリフト",
    ],
    ["監視人は必要？", "酸欠作業です", "監視人", "酸素欠乏"],
    ["作業主任者は必要？", "有機溶剤作業です", "作業主任者", "有機溶剤"],
    [
      "技能講習は必要？",
      "フォークリフトを運転します",
      "技能講習",
      "フォークリフト",
    ],
  ])(
    "選択肢のない確認へ自由入力した作業条件をno-scriptでも結合する: %s → %s",
    async (initial, condition, marker, topic) => {
      const first = await POST(formRequest(initial));
      const firstHtml = await first.text();
      const state = hiddenState(firstHtml);
      expect(first.status).toBe(200);
      expect(state).not.toBe("");

      const second = await POST(formRequest(condition, {}, undefined, state));
      const secondHtml = await second.text();
      expect(second.status).toBe(200);
      expect(secondHtml).toContain(marker);
      expect(secondHtml).toContain(topic);
      const nextState = JSON.parse(hiddenState(secondHtml)) as {
        context: {
          workType?: string;
          equipment?: string;
          role?: string;
          qualification?: string;
        };
      };
      expect(nextState.context.workType).toContain(topic);
      expect(nextState.context.role ?? nextState.context.qualification).toBe(
        marker,
      );
    },
  );

  it("安全管理者の業種chipを安衛法11条の回答へ継続する", async () => {
    const first = await POST(formRequest("安全管理者は必要？"));
    const firstHtml = await first.text();
    const state = hiddenState(firstHtml);
    const parsed = JSON.parse(state) as {
      v: number;
      context: { workType?: string };
      history?: Array<{ role: string; content: string }>;
    };

    expect(first.status).toBe(200);
    expect(firstHtml).toContain("事業場の主な業種はどれですか？");
    expect(firstHtml).toContain('value="建設業"');
    expect(parsed).toMatchObject({
      v: 1,
      context: { workType: "労働安全衛生法 安全管理者の選任義務" },
      history: [
        { role: "user", content: "安全管理者は必要？" },
        {
          role: "assistant",
          content: "事業場の主な業種はどれですか？",
        },
      ],
    });

    const second = await POST(
      formRequest(
        "建設業",
        {
          origin: "null",
          "sec-fetch-site": "same-origin",
          "sec-fetch-mode": "navigate",
          "sec-fetch-dest": "document",
        },
        undefined,
        state,
      ),
    );
    const secondHtml = await second.text();
    expect(second.status).toBe(200);
    expect(secondHtml).toContain("安全管理者");
    expect(secondHtml).toMatch(/労働安全衛生法[^<]*第11条/);
    expect(secondHtml).not.toContain(
      "この条件だけでは該当箇所を短文で特定できません",
    );

    const secondState = hiddenState(secondHtml);
    expect(JSON.parse(secondState)).toMatchObject({
      v: 1,
      context: { workType: "労働安全衛生法 安全管理者の選任義務" },
      industry: "建設業",
    });

    const conditions = await POST(
      formRequest("条件", {}, undefined, secondState),
    );
    const conditionsHtml = await conditions.text();
    expect(conditions.status).toBe(200);
    expect(conditionsHtml).toContain("安全管理者");
    expect(conditionsHtml).toMatch(/労働安全衛生法[^<]*第11条/);
    expect(conditionsHtml).not.toContain("事業場の主な業種はどれですか？");
    expect(conditionsHtml).not.toContain(
      "この条件だけでは該当箇所を短文で特定できません",
    );

    const conditionsState = hiddenState(conditionsHtml);
    expect(JSON.parse(conditionsState)).toMatchObject({
      context: { workType: "労働安全衛生法 安全管理者の選任義務" },
      industry: "建設業",
    });

    const repeatedIndustry = await POST(
      formRequest("建設業", {}, undefined, conditionsState),
    );
    const repeatedIndustryHtml = await repeatedIndustry.text();
    expect(repeatedIndustry.status).toBe(200);
    expect(repeatedIndustryHtml).toContain("安全管理者");
    expect(repeatedIndustryHtml).toMatch(/労働安全衛生法[^<]*第11条/);
    expect(repeatedIndustryHtml).not.toContain(
      "事業場の主な業種はどれですか？",
    );

    for (const testCase of [
      {
        message: "作業主任者は必要？",
        clarification:
          "作業主任者の要否を確認するため、実際の作業名や扱う物質・設備を教えてください。",
        expectedContext: {
          qualification: "作業主任者",
          role: "作業主任者",
        },
      },
      {
        message: "監視人は必要？",
        clarification:
          "監視人の要否を確認するため、実際の作業名と作業場所を教えてください。",
        expectedContext: { role: "監視人" },
      },
      {
        message: "作業指揮者は必要？",
        clarification:
          "作業指揮者の要否を確認するため、実際の作業名と使用する設備を教えてください。",
        expectedContext: { role: "作業指揮者" },
      },
    ]) {
      const roleLeap = await POST(
        formRequest(testCase.message, {}, undefined, secondState),
      );
      const roleLeapHtml = await roleLeap.text();
      expect(roleLeap.status, testCase.message).toBe(200);
      expect(roleLeapHtml, testCase.message).toContain(testCase.clarification);
      expect(roleLeapHtml, testCase.message).not.toContain("安全管理者");
      expect(roleLeapHtml, testCase.message).not.toContain('value="酸欠"');
      expect(roleLeapHtml, testCase.message).not.toContain('value="有機溶剤"');
      expect(roleLeapHtml, testCase.message).not.toContain('value="石綿"');
      const roleLeapState = JSON.parse(hiddenState(roleLeapHtml)) as {
        context: { workType?: string; qualification?: string; role?: string };
        industry?: string;
      };
      expect(roleLeapState.context).toMatchObject(testCase.expectedContext);
      expect(roleLeapState.context.workType).toBeUndefined();
      expect(roleLeapState.industry).toBeUndefined();
    }

    const trainingFollowup = await POST(
      formRequest("技能講習は必要？", {}, undefined, secondState),
    );
    const trainingHtml = await trainingFollowup.text();
    expect(trainingFollowup.status).toBe(200);
    expect(trainingHtml).toMatch(/技能講習.*一律に満たす制度ではありません/);
    expect(trainingHtml).toMatch(/労働安全衛生規則[^<]*第5条/);
    expect(JSON.parse(hiddenState(trainingHtml))).toMatchObject({
      context: {
        workType: "労働安全衛生法 安全管理者の選任義務",
        qualification: "技能講習",
      },
      industry: "建設業",
    });
  });

  it("上流のX-AI-UsedをHTML応答へ引き継ぐ", async () => {
    chatbotRouteMock.post.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: "生成回答",
          sources: [],
          source_type: "rag",
          confidence: "low",
          requiresHumanReview: true,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-AI-Used": "true",
          },
        },
      ),
    );

    const response = await POST(formRequest("足場の基準は？"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-ai-used")).toBe("true");
  });

  it("scopeWarningsだけを回答後・根拠前へ最大3件表示する", async () => {
    chatbotRouteMock.post.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          answer: "本文回答",
          substantiveAnswer: "本文回答",
          assumptions: [],
          conditions: [],
          scopeWarnings: [
            "文脈警告1",
            "文脈警告2",
            "<script>文脈警告3</script>",
            "表示してはいけない4件目",
          ],
          sources: [
            {
              law: "労働安全衛生法",
              article: "第11条",
              text: "根拠本文",
            },
          ],
          source_type: "rag",
          confidence: "low",
          requiresHumanReview: true,
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "X-AI-Used": "false",
          },
        },
      ),
    );

    const response = await POST(formRequest("安全管理者の条件は？"));
    const html = await response.text();
    const answerIndex = html.indexOf('<p class="answer">本文回答</p>');
    const warningIndex = html.indexOf('class="scope-warnings"');
    const sourceIndex = html.indexOf("<details>");

    expect(response.status).toBe(200);
    expect(answerIndex).toBeGreaterThanOrEqual(0);
    expect(warningIndex).toBeGreaterThan(answerIndex);
    expect(sourceIndex).toBeGreaterThan(warningIndex);
    expect(html).toContain("文脈警告1");
    expect(html).toContain("文脈警告2");
    expect(html).toContain("&lt;script&gt;文脈警告3&lt;/script&gt;");
    expect(html).not.toContain("<script>文脈警告3</script>");
    expect(html).not.toContain("表示してはいけない4件目");
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
    "私は「HIV陽性です」と話しました。",
    "「私はHIV陽性です」と申告しました。",
    "同僚が「HIV陽性です」と言いました。",
    "研修用の例文です。「HIV陽性です」\n実際には田中さんがHIV陽性です。",
    "訓練文は「HIV陽性です」です。しかし実際には本人がHIV陽性です。",
    "マニュアル例は「HIV陽性です」。実際の本人はB型肝炎に感染しています。",
    "教材文は「HIV陽性です」；現実には本人のHIV検査結果が陽性でした。",
    "ケース例：「HIV陽性です」。実際に同僚からHIV陽性と報告がありました。",
    "本人からHIV陽性と報告がありました。",
    "同僚からHBV陽性と報告がありました。",
    "同僚からHCV陽性と報告がありました。",
    "例文は「HIV陽性です」です。同僚からHCV陽性と報告がありました。",
    "ところが本人の検査結果はHIV陽性でした。",
    "現場では同僚が「私はHIV陽性です」と話しました。",
    "教材文は「HIV陽性です」。ところが本人の検査結果はHIV陽性でした。",
    "研修用の例文です。「HIV陽性です」：実際には本人がHIV陽性です。",
  ])("PII・健康情報を本文へ再表示せず遮断する: %s", async (message) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("個人情報");
    expect(html).not.toContain(message);
    expect(html).not.toContain('name="state"');
    expect(html).not.toContain('name="context"');
    expect(fetchSpy).not.toHaveBeenCalled();
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
    "今、作業員が倒れて反応がありません\n別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\u2028別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\u2029別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません\t別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません：別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません／別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません・別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません｜別件で「頭を打ったら119」という訓練用の例文です。",
    "今、作業員が倒れて反応がありません  別件で「頭を打ったら119」という訓練用の例文です。",
    "「意識がありません」という訓練用の例文です、今、作業員が倒れて反応がありません。",
    "「意識がありません」という訓練用の例文です；今、作業員が倒れて反応がありません。",
  ])("緊急表現では通常回答せず119を示す: %s", async (message) => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).toContain("119");
    expect(html).not.toContain("根拠 1件");
    expect(html).not.toContain('name="state"');
    expect(html).not.toContain('name="context"');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    "作業員が倒れて反応がない事故は起きていません。",
    "作業員が倒れて反応がない事故はありません。",
    "作業員が倒れて反応がない事故は起こりませんでした。",
    "作業員が倒れて反応がない事故は確認されていません。",
    "作業員が倒れて反応がありません、という模擬訓練です。",
    "作業員が倒れて反応がありません、という演習用シナリオです。",
    "作業員が倒れて反応がありません、というケーススタディです。",
    "作業員が倒れて反応がありません、という机上演習です。",
    "作業員が倒れて反応がありません、という練習問題です。",
    "作業員が倒れて反応がありません、というデモンストレーションです。",
    "作業員が倒れて反応がありません、というドリルです。",
    "作業員がクレーンに挟まれた想定の机上演習です。",
    "作業員が倒れた場合の練習問題です。",
    "作業員が倒れた想定のドリルです。",
    "作業員がクレーンに挟まれた想定で訓練します。",
    "もし作業員がクレーンに挟まれた場合はどうする？",
    "作業員が意識不明になった事故は発生していません。",
    "作業員が倒れた場合の救護手順を教えて。",
  ])("非発生・模擬訓練を緊急入力として扱わない: %s", async (message) => {
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).not.toContain("直ちに119番");
  });

  it.each([
    "私はHIV陽性です、というマニュアル用の例文です。",
    "私はHIV陽性です、という演習用の例文です。",
    "私はHIV陽性です、というサンプル文です。",
    "訓練文は「HIV陽性です」。",
    "マニュアル例は「HIV陽性です」。",
    "教材文は「HIV陽性です」。",
    "ケース例：「HIV陽性です」。",
  ])("明示された感染症例文を個人情報と誤判定しない: %s", async (message) => {
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).not.toContain("氏名、社員番号、連絡先、住所、病歴");
  });

  it("PII・緊急入力では直前の安全なhidden stateも破棄する", async () => {
    const first = await POST(formRequest("安全管理者は必要？"));
    const state = hiddenState(await first.text());
    expect(state).not.toBe("");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    for (const [message, marker] of [
      ["worker@example.comの資格は？", "個人情報"],
      ["作業員が倒れて反応がありません", "119"],
    ] as const) {
      const response = await POST(formRequest(message, {}, undefined, state));
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(html).toContain(marker);
      expect(html).not.toContain('name="state"');
      expect(html).not.toContain('name="context"');
      expect(html).not.toContain("安全管理者は必要？");
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it.each([
    {
      message: "worker@example.comの資格は？",
      marker: "個人情報",
      state: "not-json",
    },
    {
      message: "作業員が倒れて反応がありません",
      marker: "119",
      state: JSON.stringify({
        v: 1,
        context: {
          workType: "労働安全衛生法 安全管理者の選任義務",
        },
        history: [
          { role: "user", content: "<img src=x onerror=alert(1)>" },
          { role: "assistant", content: "事業場の主な業種はどれですか？" },
        ],
      }),
    },
  ])(
    "無効・改ざんstateより現在の$marker入力を優先する",
    async ({ message, marker, state }) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);

      const response = await POST(formRequest(message, {}, undefined, state));
      const html = await response.text();
      expect(response.status).toBe(200);
      expect(response.headers.get("x-ai-used")).toBe("false");
      expect(html).toContain(marker);
      expect(html).not.toContain('name="state"');
      expect(html).not.toContain('name="context"');
      expect(html).not.toContain("<img");
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(chatbotRouteMock.post).not.toHaveBeenCalled();
    },
  );

  it("回答へ反映されるHTMLをescapeし、改ざんstateを拒否する", async () => {
    const message =
      "労働安全衛生法第9999条<script>alert('xss')</script>を示して";
    const response = await POST(formRequest(message));
    const html = await response.text();
    expect(response.status).toBe(200);
    expect(html).not.toContain("<script>alert('xss')</script>");
    expect(html).toContain("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;");

    const first = await POST(formRequest("安全管理者は必要？"));
    const state = JSON.parse(hiddenState(await first.text())) as {
      history: Array<{ role: string; content: string }>;
    };
    state.history[0]!.content += "<img src=x onerror=alert(1)>";
    const tampered = await POST(
      formRequest("建設業", {}, undefined, JSON.stringify(state)),
    );
    const tamperedHtml = await tampered.text();
    expect(tampered.status).toBe(400);
    expect(tamperedHtml).not.toContain("<img");
    expect(tamperedHtml).not.toContain('name="state"');
  });

  it("質問とhidden stateの最大長をfail-closedする", async () => {
    const longMessage = await POST(formRequest("あ".repeat(4_001)));
    expect(longMessage.status).toBe(400);
    expect(await longMessage.text()).toContain("1〜4000文字");

    const longState = await POST(
      formRequest("建設業", {}, undefined, "x".repeat(2_001)),
    );
    const longStateHtml = await longState.text();
    expect(longState.status).toBe(400);
    expect(longStateHtml).toContain("会話条件を読み取れませんでした");
    expect(longStateHtml).not.toContain('name="state"');
  });

  it("cross-siteフォームを拒否する", async () => {
    const response = await POST(
      formRequest("足場の手すりは？", {
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
      }),
    );
    expect(response.status).toBe(403);

    const opaqueCrossSite = await POST(
      formRequest("足場の手すりは？", {
        origin: "null",
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
      }),
    );
    expect(opaqueCrossSite.status).toBe(403);
  });
});
