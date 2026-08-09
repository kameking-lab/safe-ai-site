import { describe, expect, it } from "vitest";
import {
  extractElectricalMeaning,
  type ElectricalWorkAction,
} from "@/lib/electrical-work-model";
import {
  resolveLegalConversationQuery,
  type LegalConversationContext,
} from "@/lib/legal-conversation-context";
import {
  buildServiceFirstLegalAnswer,
  citedLegalAnswerArticles,
  expandVerifiedLegalEvidenceArticles,
} from "@/lib/legal-extractive-answer";

const NOW = new Date("2026-08-09T00:00:00+09:00");

function answerTurn(
  message: string,
  context: LegalConversationContext = {},
): { answer: string; context: LegalConversationContext; sourceKeys: string[] } {
  const resolved = resolveLegalConversationQuery({ message, context });
  const articles = expandVerifiedLegalEvidenceArticles(resolved.query, []).slice(
    0,
    12,
  );
  const answer = buildServiceFirstLegalAnswer({
    query: resolved.query,
    articles,
    now: NOW,
  });
  const sourceKeys = citedLegalAnswerArticles(answer, articles).map(
    (article) => `${article.lawShort}${article.articleNum}`,
  );
  return { answer, context: resolved.context, sourceKeys };
}

describe("電気作業の構造化意味モデル", () => {
  it.each<[string, ElectricalWorkAction, string | undefined]>([
    ["電気の点検する時に必要な資格ある？", "unknown", undefined],
    ["電源を入れるだけ", "breaker-operation", undefined],
    ["盤を開けてテスターを当てる", "tester-measurement", undefined],
    ["配線をつなぐ", "wiring-connection", undefined],
    ["100Vさわる", "live-work", "低圧"],
    ["高圧受電設備を点検する", "high-voltage-facility-inspection", "高圧"],
    ["作業開始前に電気設備を目視する", "start-of-work-inspection", undefined],
  ])("%s を行為・電圧へ分類する", (query, action, voltageClass) => {
    expect(extractElectricalMeaning(query)).toMatchObject({
      topicDomain: "electrical",
      workAction: action,
      ...(voltageClass ? { voltageClass } : {}),
    });
  });

  it("電気語を繰り返さない短いfollow-upはdomainを勝手に付けず条件だけ返す", () => {
    expect(extractElectricalMeaning("作業開始前点検")).toEqual(
      expect.objectContaining({
        topicDomain: undefined,
        workAction: "start-of-work-inspection",
      }),
    );
    expect(extractElectricalMeaning("充電中")).toEqual(
      expect.objectContaining({
        topicDomain: undefined,
        energizedState: "energized",
      }),
    );
  });

  it.each<
    [
      string,
      ElectricalWorkAction,
      string | undefined,
      string | undefined,
    ]
  >([
    ["活線のまま端子を締める", "live-work", undefined, "energized"],
    ["高圧線の近くで点検する", "live-proximity-work", "高圧", "proximity"],
    [
      "特別教育を受ければ配線工事できる？",
      "wiring-connection",
      undefined,
      undefined,
    ],
    [
      "高圧の点検は主任技術者の立会いだけでいい？",
      "high-voltage-facility-inspection",
      "高圧",
      undefined,
    ],
  ])(
    "%s は危険側の行為・電圧・充電状態を優先して抽出する",
    (query, workAction, voltageClass, energizedState) => {
      expect(extractElectricalMeaning(query)).toMatchObject({
        topicDomain: "electrical",
        workAction,
        ...(voltageClass ? { voltageClass } : {}),
        ...(energizedState ? { energizedState } : {}),
      });
    },
  );
});

describe("電気作業のanswer-first合成", () => {
  it("広い点検質問へ目視・測定・配線・制度差・設備管理を一回目から答える", () => {
    const result = answerTurn("電気の点検する時に必要な資格ある？");
    expect(result.answer).toMatch(/盤の外[\s\S]*一律の国家資格が必要とは限りません/);
    expect(result.answer).toMatch(/盤を開けて測定|測定する/);
    expect(result.answer).toMatch(/配線を外す・つなぐ/);
    expect(result.answer).toMatch(/高圧・特別高圧/);
    expect(result.answer).toMatch(/電気工事士[\s\S]*特別教育[\s\S]*別制度/);
    expect(result.answer).toMatch(/電気主任技術者.*保安監督/);
    expect(result.sourceKeys).toEqual(
      expect.arrayContaining([
        "安衛則第36条",
        "電気工事士法第2条",
        "電気工事士法第3条",
        "電事法第43条",
      ]),
    );
    expect(result.answer).not.toMatch(/酸欠|有機溶剤|石綿|玉掛け/);
  });

  it("作業開始前点検follow-upで電気domainを維持し、資格名ではないと答える", () => {
    const first = answerTurn("電気の点検に資格いる？");
    const second = answerTurn("作業開始前点検", first.context);
    expect(second.context).toMatchObject({
      topicDomain: "electrical",
      workAction: "start-of-work-inspection",
    });
    expect(second.answer).toMatch(/資格名ではなく/);
    expect(second.answer).toMatch(/盤を開けて充電中/);
    expect(second.answer).not.toMatch(/定期自主検査|性能検査|フォークリフト/);
  });

  it("電気の特別教育を低圧・高圧・行為・電工免状に分けて答える", () => {
    const result = answerTurn("電気作業の特別教育について教えて");
    expect(result.answer).toMatch(/国家資格の免状ではありません/);
    expect(result.answer).toMatch(/高圧・特別高圧[\s\S]*敷設・点検・修理・操作/);
    expect(result.answer).toMatch(/低圧[\s\S]*敷設・修理[\s\S]*露出充電部/);
    expect(result.answer).toMatch(/盤外から見るだけ|閉鎖型スイッチ/);
    expect(result.sourceKeys).toEqual(
      expect.arrayContaining([
        "安衛法第59条",
        "安衛則第36条",
        "特別教育規程第5条",
        "特別教育規程第6条",
      ]),
    );
  });

  it.each([
    ["ブレーカーを入切するだけ", /閉鎖型ブレーカー[\s\S]*一律に必要とは限りません/],
    ["盤を開けてテスターを当てる", /見るだけ[\s\S]*ありません[\s\S]*(?:絶縁用保護具|絶縁用防具)/],
    [
      "配線をつなぐ",
      /該当する可能性[\s\S]*従事制限[\s\S]*法3条[\s\S]*電線相互の接続[\s\S]*軽微な作業[」"]?から除外/,
    ],
    ["電気の点検に作業主任者を選ぶ？", /電気作業全般に一律[\s\S]*作業主任者[\s\S]*ありません/],
  ])("%s に直接答える", (query, expected) => {
    const result = answerTurn(query);
    expect(result.answer).toMatch(expected);
    expect(result.answer).not.toMatch(/どの点検・検査を確認しますか/);
  });

  it("絶縁抵抗測定へ停電手順と充電部が残る場合の保護を併記する", () => {
    const result = answerTurn("低圧を停電して絶縁抵抗を測る");
    expect(result.answer).toMatch(/停電[\s\S]*施錠[\s\S]*表示[\s\S]*放電/);
    expect(result.answer).toMatch(
      /検電器による停電確認と短絡接地[\s\S]*高圧・特別高圧[\s\S]*低圧を含む全ての電路.*一律.*ではありません/,
    );
    expect(result.answer).toMatch(
      /低圧充電電路を直接取り扱い[\s\S]*絶縁用保護具[\s\S]*低圧充電電路に近接[\s\S]*接触するおそれ[\s\S]*絶縁用防具/,
    );
    expect(result.sourceKeys).toEqual(
      expect.arrayContaining(["安衛則第339条", "安衛則第346条"]),
    );
  });

  it("活線端子の電圧不明質問へ低圧・高圧の双方を先に答える", () => {
    const result = answerTurn("活線のまま端子を締める");
    expect(result.answer).toMatch(/低圧[\s\S]*346条[\s\S]*高圧[\s\S]*341条/);
    expect(result.answer).toMatch(/低圧の特別教育対象[\s\S]*敷設・修理[\s\S]*開閉器の操作/);
    expect(result.sourceKeys).toEqual(
      expect.arrayContaining(["安衛則第341条", "安衛則第346条"]),
    );
  });

  it("100V近接作業を347条の接触危険・絶縁保護で説明し距離規定と混同しない", () => {
    const result = answerTurn("100Vの充電部付近で作業する");
    expect(result.answer).toMatch(
      /100Vは低圧[\s\S]*電路・支持物の敷設・点検・修理・塗装[\s\S]*接触[\s\S]*絶縁用防具/,
    );
    expect(result.answer).toMatch(
      /絶縁用保護具[\s\S]*(?:他の身体部分|着けた部分以外の身体)[\s\S]*例外/,
    );
    expect(result.answer).not.toMatch(
      /低圧[^。]*(?:距離の確保|距離に応じた措置|最短距離)/,
    );
    expect(result.sourceKeys).toContain("安衛則第347条");
  });

  it("電気工事士・特別教育・主任技術者を根拠付きで区別する", () => {
    const schemes = answerTurn("電気工事士と特別教育の違い");
    expect(schemes.answer).toMatch(/別制度[\s\S]*設置・変更[\s\S]*配線/);
    expect(schemes.sourceKeys).toEqual(
      expect.arrayContaining([
        "電気工事士法第2条",
        "電気工事士法第3条",
        "安衛法第59条",
        "安衛則第36条",
      ]),
    );

    const chief = answerTurn("電気主任技術者と電気工事士の違い");
    expect(chief.answer).toMatch(/保安を監督[\s\S]*配線[\s\S]*電気工事/);
    expect(chief.sourceKeys).toEqual(
      expect.arrayContaining([
        "電事法第43条",
        "電気工事士法第2条",
        "電気工事士法第3条",
      ]),
    );
  });

  it("低圧と高圧の特別教育対象を具体的な行為で比較する", () => {
    const result = answerTurn("低圧と高圧の教育の違い", {
      topicDomain: "electrical",
    });
    expect(result.answer).toMatch(/低圧[\s\S]*充電電路の敷設・修理[\s\S]*露出充電部付き開閉器の操作/);
    expect(result.answer).toMatch(/高圧・特別高圧[\s\S]*敷設・点検・修理・操作/);
    expect(result.sourceKeys).toContain("安衛則第36条");
  });

  it.each([
    "メーカー独自の盤で点検資格は何？",
    "海外規格の設備を日本で点検する資格は？",
    "点検で何をするかまだ決まっていない",
  ])("根拠不足でも %s へ現在分かる行為分岐を先に答える", (query) => {
    const result = answerTurn(query, { topicDomain: "electrical" });
    expect(result.answer).toMatch(/点検中の実際の行為[\s\S]*要件が変わります/);
    expect(result.answer).toMatch(/公式資料・法令だけでは[\s\S]*確定できません/);
    expect(result.sourceKeys).toEqual(
      expect.arrayContaining(["安衛則第36条", "電気工事士法第2条"]),
    );
  });
});
