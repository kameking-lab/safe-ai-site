/**
 * 特別教育データベース（安衛則36条）の整合テスト
 *
 * 2026-06-10 の全面是正（柱1）を恒久固定する:
 * - 号は e-Gov 法令API v2 の安衛則(347M50002000032)第36条 現行条文と機械突合した公式スナップショットに対して検証
 * - 時間数は各特別教育規程の正本（MHLW法令等データベース）と突合した値をピン留め
 * - 是正前に存在した「36条に存在しない特別教育」（有機溶剤・鉛業務一般・特定化学物質・
 *   地山掘削・土止め支保工・採石・岩石採取・液化石油ガス）の再混入を防ぐ
 */
import { describe, expect, it } from "vitest";
import { SPECIAL_EDUCATION } from "./special-education";
import { ALL_CERTS } from "./index";
import { WORK_SCENARIOS, WORK_TAGS } from "@/lib/work-certification-mapper";

/**
 * 安衛則第36条の現行全号スナップショット（e-Gov機械取得 2026-06-10）。
 * 値は公式条文の内容を一意に識別するキーワード。"（削除）"は削除条号。
 */
const OFFICIAL_ART36_ITEMS: Record<string, string> = {
  "1": "研削といしの取替え",
  "2": "動力プレス",
  "3": "アーク溶接",
  "4": "充電電路",
  "4の2": "蓄電池を内蔵する自動車の整備",
  "5": "フオークリフト",
  "5の2": "シヨベルローダー又はフオークローダー",
  "5の3": "不整地運搬車",
  "5の4": "テールゲートリフター",
  "6": "揚貨装置",
  "6の2": "伐木等機械",
  "6の3": "走行集材機械",
  "7": "機械集材装置",
  "7の2": "簡易架線集材装置",
  "8": "チェーンソーを用いて行う立木の伐木",
  "9": "機体重量が三トン未満",
  "9の2": "自走できるもの以外のものの運転",
  "9の3": "作業装置の操作（車体上の運転者席における操作を除く）",
  "10": "令別表第七第四号",
  "10の2": "令別表第七第五号に掲げる機械の作業装置の操作",
  "10の3": "ボーリングマシン",
  "10の4": "ジャッキ式つり上げ機械",
  "10の5": "高所作業車",
  "11": "巻上げ機",
  "12": "（削除）",
  "13": "令第十五条第一項第八号に掲げる機械等",
  "14": "小型ボイラー",
  "15": "クレーン（移動式クレーンを除く）の運転",
  "16": "つり上げ荷重が一トン未満の移動式クレーン",
  "17": "つり上げ荷重が五トン未満のデリツク",
  "18": "建設用リフト",
  "19": "玉掛け",
  "20": "ゴンドラの操作",
  "20の2": "空気圧縮機を運転する業務",
  "21": "作業室への送気の調節を行うためのバルブ",
  "22": "気こう室への送気又は気こう室からの排気の調整",
  "23": "潜水作業者への送気の調節",
  "24": "再圧室を操作する業務",
  "24の2": "高圧室内作業に係る業務",
  "25": "四アルキル鉛等業務",
  "26": "酸素欠乏危険場所",
  "27": "特殊化学設備",
  "28": "エックス線装置又はガンマ線照射装置を取り扱う業務",
  "28の2": "加工施設・再処理施設等の核燃料物質取扱い",
  "28の3": "原子炉施設の管理区域内の核燃料物質取扱い",
  "28の4": "事故由来放射性物質により汚染された物の処分",
  "28の5": "特例緊急作業",
  "29": "特定粉じん作業",
  "30": "ずい道等の掘削",
  "31": "産業用ロボツトの教示等",
  "32": "産業用ロボツトの検査等",
  "33": "タイヤに空気を充てんする業務",
  "34": "ばいじん及び焼却灰その他の燃え殻を取り扱う業務",
  "35": "廃棄物焼却炉、集じん機等の設備の保守点検",
  "36": "設備の解体等の業務",
  "37": "石綿障害予防規則第四条第一項に掲げる作業",
  "38": "除染則第二条第七項の除染等業務",
  "39": "足場の組立て、解体又は変更",
  "40": "ロープ高所作業",
  "41": "フルハーネス型",
};

/** relatedLaw から「第36条第N号(のM)」を抽出する。36条引用がなければ null */
function extractItemNum(relatedLaw: string): string | null {
  const m = relatedLaw.match(/第36条第(\d+)号(?:の(\d+))?/);
  if (!m) return null;
  return m[2] ? `${m[1]}の${m[2]}` : m[1];
}

/** ガイドラインベース（36条号外）の例外エントリ */
const NON_ART36_IDS = new Set(["se-36-vdt"]);

describe("special-education: 安衛則36条との号整合", () => {
  it("VDT以外の全エントリが第36条の号を引用している", () => {
    for (const cert of SPECIAL_EDUCATION) {
      if (NON_ART36_IDS.has(cert.id)) continue;
      expect(extractItemNum(cert.relatedLaw), `${cert.id} の relatedLaw に36条の号がない`).toBeTruthy();
    }
  });

  it("引用された号は全て現行条文に実在し、削除条号(12号)を指していない", () => {
    for (const cert of SPECIAL_EDUCATION) {
      const num = extractItemNum(cert.relatedLaw);
      if (!num) continue;
      expect(OFFICIAL_ART36_ITEMS[num], `${cert.id} が存在しない号 ${num} を引用`).toBeDefined();
      expect(num, `${cert.id} が削除条号12号を引用`).not.toBe("12");
      expect(OFFICIAL_ART36_ITEMS[num]).not.toBe("（削除）");
    }
  });

  it("id ↔ 号 の対応が公式条文と一致する（全エントリ）", () => {
    const expected: Record<string, string> = {
      "se-36-1-kensaku": "1",
      "se-36-2-press": "2",
      "se-36-3-arch": "3",
      "se-36-4-teiatsu": "4",
      "se-36-4-koatsu": "4",
      "se-36-4-2-ev": "4の2",
      "se-36-5-forklift": "5",
      "se-36-5-2-shovel-loader": "5の2",
      "se-36-5-3-fuseichi": "5の3",
      "se-36-5-4-tailgate": "5の4",
      "se-36-6-yoka": "6",
      "se-36-6-2-batsuboku-kikai": "6の2",
      "se-36-6-3-soko-shuzai": "6の3",
      "se-36-7-shuzai": "7",
      "se-36-7-2-kani-kasen": "7の2",
      "se-36-8-chainsaw": "8",
      "se-36-9-seichi": "9",
      "se-36-9-kiso": "9",
      "se-36-9-kaitai": "9",
      "se-36-9-2-kiso-hijiso": "9の2",
      "se-36-9-3-kiso-sosa": "9の3",
      "se-36-10-roller": "10",
      "se-36-10-2-pump": "10の2",
      "se-36-10-3-boring": "10の3",
      "se-36-10-4-jack": "10の4",
      "se-36-10-5-koshosagyosha": "10の5",
      "se-36-11-winch": "11",
      "se-36-13-doryokusha": "13",
      "se-36-14-kogata-boiler": "14",
      "se-36-15-crane-under5t": "15",
      "se-36-16-mobile-crane": "16",
      "se-36-17-derrick": "17",
      "se-36-18-lift": "18",
      "se-36-19-tamakake": "19",
      "se-36-20-gondola": "20",
      "se-36-20-2-kuki-asshukuki": "20の2",
      "se-36-21-soki-barubu": "21",
      "se-36-22-kiko-barubu": "22",
      "se-36-23-sensui-soki": "23",
      "se-36-24-saiatsushitsu": "24",
      "se-36-24-2-koshitsunai": "24の2",
      "se-36-25-tetraalkyl": "25",
      "se-36-26-shokucho-sanso": "26",
      "se-36-27-tokushu-kagaku": "27",
      "se-36-28-xray-gamma": "28",
      "se-36-29-dust": "29",
      "se-36-30-tunnel": "30",
      "se-36-31-robot-teach": "31",
      "se-36-32-robot-kensa": "32",
      "se-36-33-tire": "33",
      "se-36-34-baijin": "34",
      "se-36-35-shokyaku-hoshu": "35",
      "se-36-36-shokyaku-kaitai": "36",
      "se-36-37-asbestos": "37",
      "se-36-38-josen": "38",
      "se-36-39-ashiba": "39",
      "se-36-40-rooftop": "40",
      "se-36-41-harness": "41",
    };
    // 期待表に載っている全エントリの号一致 + データ側が期待表と1対1（VDT除く）
    const ids = SPECIAL_EDUCATION.filter((c) => !NON_ART36_IDS.has(c.id)).map((c) => c.id);
    expect(ids.sort()).toEqual(Object.keys(expected).sort());
    for (const cert of SPECIAL_EDUCATION) {
      if (NON_ART36_IDS.has(cert.id)) continue;
      expect(extractItemNum(cert.relatedLaw), `${cert.id} の号`).toBe(expected[cert.id]);
    }
  });

  it("是正済みの既知誤割当が再発していない", () => {
    const byId = new Map(SPECIAL_EDUCATION.map((c) => [c.id, c]));
    // クレーン運転を5号と書く誤り（5号はフォークリフト）
    expect(byId.get("se-36-5-forklift")!.name).toContain("フォークリフト");
    expect(byId.get("se-36-15-crane-under5t")!.name).toContain("クレーン");
    // デリックは「2t未満」ではなく5t未満
    expect(byId.get("se-36-17-derrick")!.name).toContain("5t未満");
    expect(byId.get("se-36-17-derrick")!.name).not.toContain("2t未満");
    // 石綿29号→37号 / ずい道37号→30号 / 除染31号→38号 / 粉じん28号→29号 / X線23号→28号
    expect(extractItemNum(byId.get("se-36-37-asbestos")!.relatedLaw)).toBe("37");
    expect(extractItemNum(byId.get("se-36-30-tunnel")!.relatedLaw)).toBe("30");
    expect(extractItemNum(byId.get("se-36-38-josen")!.relatedLaw)).toBe("38");
    expect(extractItemNum(byId.get("se-36-29-dust")!.relatedLaw)).toBe("29");
    expect(extractItemNum(byId.get("se-36-28-xray-gamma")!.relatedLaw)).toBe("28");
    // 高圧室内33号→24号の2 / ウインチ16号→11号 / 動力車17号→13号 / 機械集材18号→7号
    expect(extractItemNum(byId.get("se-36-24-2-koshitsunai")!.relatedLaw)).toBe("24の2");
    expect(extractItemNum(byId.get("se-36-11-winch")!.relatedLaw)).toBe("11");
    expect(extractItemNum(byId.get("se-36-13-doryokusha")!.relatedLaw)).toBe("13");
    expect(extractItemNum(byId.get("se-36-7-shuzai")!.relatedLaw)).toBe("7");
    // コンクリートポンプ車12号(削除条号)→10号の2 / 高所作業車14号→10号の5 / 不整地13号→5号の3
    expect(extractItemNum(byId.get("se-36-10-2-pump")!.relatedLaw)).toBe("10の2");
    expect(extractItemNum(byId.get("se-36-10-5-koshosagyosha")!.relatedLaw)).toBe("10の5");
    expect(extractItemNum(byId.get("se-36-5-3-fuseichi")!.relatedLaw)).toBe("5の3");
    // チェーンソー8号の2(廃止)→8号 / 高圧電気4号の2(EV整備)→4号
    expect(extractItemNum(byId.get("se-36-8-chainsaw")!.relatedLaw)).toBe("8");
    expect(byId.get("se-36-8-chainsaw")!.relatedLaw).not.toContain("8号の2");
    expect(extractItemNum(byId.get("se-36-4-koatsu")!.relatedLaw)).toBe("4");
    // ローラーに架空の「3t未満」制限を再導入しない（10号に重量要件はない）
    expect(byId.get("se-36-10-roller")!.name).not.toContain("3t未満");
    expect(byId.get("se-36-10-roller")!.targetWork).not.toContain("3トン未満");
    // 足場特別教育に架空の「高さ5m以上」限定を再導入しない
    expect(byId.get("se-36-39-ashiba")!.targetWork).not.toContain("5m以上");
  });

  it("36条に存在しない特別教育（是正前の捏造8件）が存在しない", () => {
    for (const cert of SPECIAL_EDUCATION) {
      const num = extractItemNum(cert.relatedLaw);
      if (!num) continue; // ガイドライン例外
      // 名称ベース: これらを36条の特別教育として提示してはならない
      expect(cert.name, `${cert.id}: 有機溶剤の特別教育は法定されていない`).not.toContain("有機溶剤");
      expect(cert.name, `${cert.id}: 特定化学物質の特別教育は法定されていない`).not.toMatch(/特定化学物質/);
      expect(cert.name, `${cert.id}: 地山掘削の特別教育は法定されていない`).not.toContain("地山");
      expect(cert.name, `${cert.id}: 土止め支保工の特別教育は法定されていない`).not.toContain("土止め");
      expect(cert.name, `${cert.id}: 採石・岩石採取の特別教育は法定されていない`).not.toMatch(/採石|岩石/);
      expect(cert.name, `${cert.id}: LPG設備工事の特別教育は法定されていない`).not.toContain("液化石油ガス");
      // 鉛は四アルキル鉛(25号)のみ
      if (cert.name.includes("鉛")) {
        expect(cert.id).toBe("se-36-25-tetraalkyl");
        expect(num).toBe("25");
      }
      // 潜水「作業そのもの」を特別教育として提示しない（23号は送気バルブ操作員）
      if (num === "23") {
        expect(cert.targetWork).toContain("送気");
      }
    }
    const ids = new Set(SPECIAL_EDUCATION.map((c) => c.id));
    for (const removed of [
      "se-36-22-yuki",
      "se-36-24-lead",
      "se-36-21-tokushu",
      "se-36-30-ekika",
      "se-36-34-ganseki",
      "se-36-35-chijoushi",
      "se-36-36-tobari",
      "se-36-38-sarasen",
      "se-36-25-shokucho2",
    ]) {
      expect(ids.has(removed), `削除済みID ${removed} が復活している`).toBe(false);
    }
  });
});

describe("special-education: 時間数（特別教育規程の正本ピン）", () => {
  // 各特別教育規程（告示）の正本から機械抽出した時間数（2026-06-10 突合）
  const DURATION_PINS: Record<string, string> = {
    "se-36-1-kensaku": "自由研削用: 6時間以上（学科4h＋実技2h）／機械研削用: 10時間以上（学科7h＋実技3h）",
    "se-36-2-press": "10時間以上（学科8h＋実技2h）",
    "se-36-3-arch": "21時間以上（学科11h＋実技10h）",
    "se-36-4-teiatsu": "学科7h＋実技7h（開閉器の操作の業務のみは実技1h）",
    "se-36-4-koatsu": "学科11h＋実技15h（充電電路の操作の業務のみは実技1h）",
    "se-36-4-2-ev": "7時間以上（学科6h＋実技1h）",
    "se-36-5-forklift": "12時間以上（学科6h＋実技6h）",
    "se-36-5-2-shovel-loader": "12時間以上（学科6h＋実技6h）",
    "se-36-5-3-fuseichi": "12時間以上（学科6h＋実技6h）",
    "se-36-5-4-tailgate": "6時間以上（学科4h＋実技2h）",
    "se-36-6-yoka": "15時間以上（学科11h＋実技4h）",
    "se-36-6-2-batsuboku-kikai": "12時間以上（学科6h＋実技6h）",
    "se-36-6-3-soko-shuzai": "12時間以上（学科6h＋実技6h）",
    "se-36-7-shuzai": "14時間以上（学科6h＋実技8h）",
    "se-36-7-2-kani-kasen": "14時間以上（学科6h＋実技8h）",
    "se-36-8-chainsaw": "18時間以上（学科9h＋実技9h）",
    "se-36-9-seichi": "13時間以上（学科7h＋実技6h）",
    "se-36-9-kiso": "13時間以上（学科7h＋実技6h）",
    "se-36-9-kaitai": "14時間以上（学科7h＋実技7h）",
    "se-36-9-2-kiso-hijiso": "12時間以上（学科7h＋実技5h）",
    "se-36-9-3-kiso-sosa": "9時間以上（学科5h＋実技4h）",
    "se-36-10-roller": "10時間以上（学科6h＋実技4h）",
    "se-36-10-2-pump": "12時間以上（学科7h＋実技5h）",
    "se-36-10-3-boring": "12時間以上（学科7h＋実技5h）",
    "se-36-10-4-jack": "10時間以上（学科6h＋実技4h）",
    "se-36-10-5-koshosagyosha": "9時間以上（学科6h＋実技3h）",
    "se-36-11-winch": "10時間以上（学科6h＋実技4h）",
    "se-36-13-doryokusha": "10時間以上（学科6h＋実技4h）",
    "se-36-14-kogata-boiler": "11時間以上（学科7h＋実技4h）",
    "se-36-15-crane-under5t": "13時間以上（学科9h＋実技4h）",
    "se-36-16-mobile-crane": "13時間以上（学科9h＋実技4h）",
    "se-36-17-derrick": "13時間以上（学科9h＋実技4h）",
    "se-36-18-lift": "9時間以上（学科5h＋実技4h）",
    "se-36-19-tamakake": "9時間以上（学科5h＋実技4h）",
    "se-36-20-gondola": "9時間以上（学科5h＋実技4h）",
    "se-36-20-2-kuki-asshukuki": "12時間以上（学科10h＋実技2h）",
    "se-36-21-soki-barubu": "12時間以上（学科10h＋実技2h）",
    "se-36-22-kiko-barubu": "12時間以上（学科9h＋実技3h）",
    "se-36-23-sensui-soki": "11時間以上（学科9h＋実技2h）",
    "se-36-24-saiatsushitsu": "12時間以上（学科9h＋実技3h）",
    "se-36-24-2-koshitsunai": "学科のみ7時間以上",
    "se-36-25-tetraalkyl": "学科のみ6時間以上",
    "se-36-26-shokucho-sanso": "第1種: 学科のみ4時間以上／第2種（硫化水素危険場所）: 学科のみ5.5時間以上",
    "se-36-27-tokushu-kagaku":
      "28時間以上（学科13h＋実技15h）※整備・修理のみの業務は取扱い科目（学科3h・実技10h）が免除",
    "se-36-28-xray-gamma": "学科のみ4.5時間以上（エックス線・ガンマ線の両装置を取り扱う場合は6時間以上）",
    "se-36-29-dust": "学科のみ4.5時間以上",
    "se-36-30-tunnel": "学科のみ7時間以上",
    "se-36-31-robot-teach": "10時間以上（学科7h＋実技3h）",
    "se-36-32-robot-kensa": "13時間以上（学科9h＋実技4h）",
    "se-36-33-tire": "9時間以上（学科5h＋実技4h）",
    "se-36-34-baijin": "学科のみ4時間以上",
    "se-36-35-shokyaku-hoshu": "学科のみ4時間以上",
    "se-36-36-shokyaku-kaitai": "学科のみ4時間以上",
    "se-36-37-asbestos": "学科のみ4.5時間以上",
    "se-36-38-josen": "学科4h＋実技1.5h（土壌等の除染等の業務の場合。業務区分により異なる）",
    "se-36-39-ashiba": "学科のみ6時間以上",
    "se-36-40-rooftop": "7時間以上（学科4h＋実技3h）",
    "se-36-41-harness": "6時間以上（学科4h30m＋実技1h30m）",
  };

  it("全エントリの時間数が規程正本のピンと一致する", () => {
    for (const cert of SPECIAL_EDUCATION) {
      if (NON_ART36_IDS.has(cert.id)) continue;
      expect(cert.duration, `${cert.id} の duration`).toBe(DURATION_PINS[cert.id]);
    }
  });

  it("是正前の誤時間（アーク11h・石綿11h・チェーンソー20h・X線30h等）が再発していない", () => {
    const byId = new Map(SPECIAL_EDUCATION.map((c) => [c.id, c]));
    expect(byId.get("se-36-3-arch")!.duration).not.toContain("11時間以上");
    expect(byId.get("se-36-37-asbestos")!.duration).not.toContain("11時間");
    expect(byId.get("se-36-8-chainsaw")!.duration).not.toContain("20時間");
    expect(byId.get("se-36-28-xray-gamma")!.duration).not.toContain("30時間");
    expect(byId.get("se-36-24-2-koshitsunai")!.duration).not.toContain("14時間");
  });
});

describe("special-education: 参照整合", () => {
  it("ALL_CERTS の id が一意である", () => {
    const ids = ALL_CERTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ALL_CERTS 内の relatedCertIds が全て実在する（宙ぶらりん参照ゼロ）", () => {
    const ids = new Set(ALL_CERTS.map((c) => c.id));
    for (const cert of ALL_CERTS) {
      for (const rel of cert.relatedCertIds ?? []) {
        expect(ids.has(rel), `${cert.id} の relatedCertIds に存在しないID: ${rel}`).toBe(true);
      }
    }
  });

  it("資格マッパー（シナリオ・タグ）の certIds が全て実在する", () => {
    const ids = new Set(ALL_CERTS.map((c) => c.id));
    for (const s of WORK_SCENARIOS) {
      for (const cid of s.requiredCertIds) {
        expect(ids.has(cid), `シナリオ ${s.id} に存在しないID: ${cid}`).toBe(true);
      }
    }
    for (const t of WORK_TAGS) {
      for (const cid of t.certIds) {
        expect(ids.has(cid), `タグ ${t.id} に存在しないID: ${cid}`).toBe(true);
      }
    }
  });

  it("資格マッパーの legalNote が誤った号（旧データの号）を引用していない", () => {
    // シナリオごとに「正しい号」と「是正前の誤った号」を固定（シナリオが消えた場合はスキップ）
    const pins: Array<{ scenarioId: string; mustContain: string; mustNotContain: string[] }> = [
      { scenarioId: "ws-crane-small", mustContain: "第36条第15号", mustNotContain: ["第36条第5号"] },
      { scenarioId: "ws-koshosha", mustContain: "第36条第10号の5", mustNotContain: ["第36条第14号"] },
      { scenarioId: "ws-tokuka", mustContain: "作業主任者", mustNotContain: ["第36条第21号"] },
      { scenarioId: "ws-organic-solvent", mustContain: "作業主任者", mustNotContain: ["第36条第22号"] },
      { scenarioId: "ws-xray", mustContain: "第36条第28号", mustNotContain: ["第36条第23号"] },
      { scenarioId: "ws-diving", mustContain: "第36条第23号", mustNotContain: ["第36条第25号"] },
      { scenarioId: "ws-asbestos-removal", mustContain: "第36条第37号", mustNotContain: ["第36条第29号"] },
      { scenarioId: "ws-tunnel", mustContain: "第36条第30号", mustNotContain: ["第36条第37号"] },
      { scenarioId: "ws-chainsaw", mustContain: "第36条第8号", mustNotContain: ["第36条第8号の2"] },
      { scenarioId: "ws-koatsu", mustContain: "第36条第4号", mustNotContain: ["第36条第4号の2"] },
      { scenarioId: "ws-forklift", mustContain: "第36条第5号", mustNotContain: ["第5号相当"] },
    ];
    for (const pin of pins) {
      const s = WORK_SCENARIOS.find((x) => x.id === pin.scenarioId);
      if (!s) continue;
      expect(s.legalNote, `シナリオ ${pin.scenarioId} に正引用がない`).toContain(pin.mustContain);
      for (const w of pin.mustNotContain) {
        expect(s.legalNote.includes(w), `シナリオ ${pin.scenarioId} に旧誤引用: ${w}`).toBe(false);
      }
    }
  });
});
