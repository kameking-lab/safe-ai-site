import type { AccidentCase, AccidentType, AccidentWorkCategory } from "@/lib/types/domain";

const TYPES: AccidentType[] = [
  "墜落",
  "転倒",
  "挟まれ",
  "飛来落下",
  "感電",
  "車両",
  "崩壊",
  "火災",
  "中毒",
  "溺水",
];

const CATEGORIES: AccidentWorkCategory[] = [
  "高所",
  "電気",
  "足場",
  "重機",
  "一般",
  "解体",
  "製造",
  "建設",
  "倉庫",
];

const SEVERITIES = ["軽傷", "中等傷", "重傷", "死亡"] as const;

const SCENARIOS: { verb: string; noun: string }[] = [
  { verb: "足場移動中に", noun: "手すり欠損区間からの転落" },
  { verb: "クレーン吊り荷の", noun: "振れによる作業員への激突" },
  { verb: "仮設照明撤去時の", noun: "踏み抜きによる墜落" },
  { verb: "ロックアウト未実施での", noun: "設備再起動による挟まれ" },
  { verb: "活線確認省略による", noun: "分電盤作業中の感電" },
  { verb: "バックホウ旋回時の", noun: "誘導死角からの巻き込まれ" },
  { verb: "強風時の資材", noun: "固定不足による飛来落下" },
  { verb: "酸欠空間での", noun: "換気不足による意識障害" },
  { verb: "溶接火花による", noun: "近傍可燃物への引火" },
  { verb: "フォークリフト妻バック時の", noun: "歩行者通路への侵入" },
  { verb: "型枠解体順序誤りによる", noun: "壁体倒壊" },
  { verb: "玉掛けワイヤ損傷による", noun: "吊り荷の落下" },
  { verb: "送風停止後の", noun: "ダクト内粉じん爆燃" },
  { verb: "高所作業車バケットからの", noun: "工具落下" },
  { verb: "夜間誘導不足による", noun: "大型車との接触" },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** サイト内検索・フィルタ用の大量事例（公的DBの代替としてブラウザ内生成。後からCSV/Excel取込に差し替え可） */
export function buildGeneratedAccidentCases(count: number, seed = 20260405): AccidentCase[] {
  const rng = mulberry32(seed);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rng() * arr.length)]!;
  const out: AccidentCase[] = [];

  for (let i = 0; i < count; i += 1) {
    const y = 2019 + Math.floor(rng() * 8);
    const m = 1 + Math.floor(rng() * 12);
    const d = 1 + Math.floor(rng() * 28);
    const type = pick(TYPES);
    const workCategory = pick(CATEGORIES);
    const sev = pick([...SEVERITIES]);
    const sc = pick(SCENARIOS);
    const id = `ac-gen-${i}`;
    const title = `${workCategory}作業における${type}災害（事例${i + 1}）`;
    const summary = `${y}年${m}月頃の${sc.verb}${sc.noun}。${type}として報告された事例の構造化データです。現場の工程・天候・人員配置は架空の組合せを含みます。`;
    const mainCauses = [
      `リスク評価と作業手順の${pick(["不一致", "未更新", "形骸化"])}`,
      `${pick(["監督", "職長", "元請"])}による立会い・確認の不足`,
      `${pick(["教育", "朝礼共有", "マニュアル"])}と実作業のギャップ`,
    ];
    const preventionPoints = [
      `作業前KYで${pick(["危険箇所", "退避経路", "合図方法"])}を全員で確認する`,
      `${pick(["保護具", "墜落制止器具", "検電器"])}の着用・使用をチェックリスト化する`,
      `異常時の${pick(["停止", "報告", "避難"])}ラインを明文化する`,
    ];
    out.push({
      id,
      title,
      occurredOn: `${y}-${pad2(m)}-${pad2(d)}`,
      type,
      workCategory,
      severity: sev,
      summary,
      mainCauses,
      preventionPoints,
    });
  }

  return out;
}
