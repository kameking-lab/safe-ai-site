#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(process.cwd(), "..");
const write = process.argv.includes("--write");

const claims = {
  "HL-L-001": {
    page: "/heat-illness-prevention/r7-compliance",
    section: "法定2項目・報告体制",
    text: "作業者が熱中症の自覚症状を感じた場合、又は周囲が熱中症の疑いを発見した場合に、あらかじめ定めた担当者へ直ちに報告できる体制を整備し、作業者へ周知する。",
    source: "web/src/data/heat-illness-rules/r7-compliance.ts",
  },
  "HL-L-002": {
    page: "/heat-illness-prevention/r7-compliance",
    section: "法定2項目・悪化防止手順",
    text: "作業場ごとに、作業からの離脱、身体の冷却、必要に応じた医師の診察・処置その他の症状悪化防止措置と実施手順を定め、作業者へ周知する。",
    source: "web/src/data/heat-illness-rules/r7-compliance.ts",
  },
  "HL-L-003": {
    page: "/heat-illness-prevention/elearning",
    section: "問1・二つの義務",
    text: "第1項は異常を直ちに報告できる体制の整備・周知、第2項は作業離脱、身体冷却、必要に応じた医師の診察等を含む悪化防止手順の作成・周知です。",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-L-004": {
    page: "/heat-illness-prevention/r7-compliance",
    section: "法定義務と予防策の区別",
    text: "法定義務は上記2項目です。下のテンプレートに含まれるWBGT測定、暑熱順化、教育等は重要な予防策ですが、第612条の2の追加の項として表示していません。本チェックリストは自主点検用です。",
    source: "web/src/app/(main)/heat-illness-prevention/r7-compliance/r7-compliance-client.tsx",
  },
  "HL-L-005": {
    page: "/heat-illness-prevention/slides",
    section: "13. 管理者の確認",
    text: "安衛則第612条の2の義務と、2026年指針の推奨を分けて確認します。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-L-006": {
    page: "/heat-illness-prevention/slides",
    section: "13. 管理者の確認",
    text: "現行の包括的な指針は、2026年3月18日付け基発0318第1号です。旧基発0420第3号は同日付けで廃止されています。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-L-007": {
    page: "/heat-illness-prevention/elearning",
    section: "問2・現行指針",
    text: "2026年3月18日付け基発0318第1号",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-L-008": {
    page: "/heat-illness-prevention/slides",
    section: "教材の適用範囲",
    text: "法定教育、資格判定、医学的診断の代替ではありません。公式一次資料と事業場の手順を確認し、作業開始・再開は責任者が現場条件を踏まえて判断してください。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-L-009": {
    page: "/heat-illness-prevention/elearning",
    section: "補助的な知識確認",
    text: "法定教育、資格判定、医学的診断、実地訓練を代替しません。",
    source: "web/src/app/(main)/heat-illness-prevention/elearning/page.tsx",
  },
  "HL-L-010": {
    page: "/ky/paper?topic=heat-illness",
    section: "熱中症KYの開始境界",
    text: "この導線は入力候補を自動確定せず、AI提案や予報値も帳票へ自動転記しません。現場実測、公式情報、利用者が確定した内容を分けて入力し、提出前の確認画面と承認を通してください。",
    source: "web/src/components/ky-paper/heat-illness-ky-start.tsx",
  },
  "HL-L-011": {
    page: "/signage",
    section: "熱中症重点カード",
    text: "WBGT値はこのカードに表示・推定しません",
    source: "web/src/components/signage/signage-heat-special.tsx",
  },
  "HL-L-012": {
    page: "/heat-illness-prevention",
    section: "8. 個人用保護具・熱中症対策用品",
    text: "商品だけで熱中症を防げる、公式推奨である、医学的効果が保証されるとは表示しません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-M-001": {
    page: "/heat-illness-prevention/slides",
    section: "1. 熱中症とは",
    text: "熱中症は、暑熱環境で体温調節がうまく働かなくなるなどして生じる健康障害の総称です。自己判断で病名や重症度を確定しません。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-002": {
    page: "/heat-illness-prevention/slides",
    section: "2. 現場で危険が高まる条件",
    text: "高温多湿、直射日光や放射熱、風の弱さ、高負荷・長時間作業、熱がこもる服装、暑さに慣れていない時期、体調不良などを組み合わせて確認します。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-003": {
    page: "/heat-illness-prevention/slides",
    section: "3. WBGTの見方",
    text: "実況推定値: 気象観測値等と推定式から算出した現在付近の値です。作業地点で直接測った実測値とは表示しません。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-004": {
    page: "/heat-illness-prevention/elearning",
    section: "問3・実況推定値",
    text: "環境省は実測値、実況推定値、予測値を別区分で提供しています。実況推定値を作業地点の実測値と表示してはいけません。",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-M-005": {
    page: "/heat-illness-prevention/elearning",
    section: "問4・予測値",
    text: "予測値は気象庁の数値予報データ等を用いた将来の推定です。急な天候変化で実況との差が大きくなる場合があり、取得不能を低値へ置き換えません。",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-M-006": {
    page: "/heat-illness-prevention/slides",
    section: "5. 水分・塩分・休憩",
    text: "作業時間の短縮や休止、涼しい休憩場所、水分・塩分の補給を作業計画へ入れ、作業中も条件変化に応じて見直します。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-007": {
    page: "/heat-illness-prevention/slides",
    section: "6. 暑熱順化",
    text: "暑さに慣れていない人、休み明け、入職・配置替え直後などを確認し、作業時間や負荷を段階的に調整します。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-008": {
    page: "/heat-illness-prevention/slides",
    section: "7. 体調不良のサイン",
    text: "ふらつき、頭痛、吐き気、強い疲労感、判断や受け答えの変化など、本人または周囲が異常を感じたら作業から離し、状態を確認します。",
    source: "web/src/data/heat-illness-learning/slides.ts",
  },
  "HL-M-009": {
    page: "/heat-illness-prevention/elearning",
    section: "問5・意識がはっきりしない",
    text: "厚生労働省の対応手順は、意識がはっきりしない場合にただちに救急隊を要請するとしています。口から無理に水分を与えず、一人にしません。",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-M-010": {
    page: "/heat-illness-prevention/elearning",
    section: "問6・自力で飲めない",
    text: "厚生労働省の対応手順は、自力で水分をとれない場合にただちに救急隊を要請するとしています。無理な経口摂取を行いません。",
    source: "web/src/data/heat-illness-learning/questions.ts",
  },
  "HL-M-011": {
    page: "/heat-illness-prevention",
    section: "10. 緊急時対応・2",
    text: "意識がはっきりしている場合は作業を止め、涼しい場所へ移し、一人にせず、衣服を緩めて身体を冷やす。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-M-012": {
    page: "/heat-illness-prevention",
    section: "10. 緊急時対応・4",
    text: "反応がなく正常な呼吸がないなど心停止が疑われる場合は、119番、AED手配、心肺蘇生を行い、通信指令員とAEDの案内に従う。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-M-013": {
    page: "/signage",
    section: "熱中症重点カード・現場確認",
    text: "現場の実測値と測定時刻・場所・機器を確認し、地域情報は公式サイトで対象時刻と情報種別を確認してください。このカードは熱中症や警報を自動検知するものではありません。",
    source: "web/src/components/signage/signage-heat-special.tsx",
  },
  "HL-M-014": {
    page: "/ky/paper?topic=heat-illness",
    section: "熱中症KY・体調確認",
    text: "作業前・休憩後の体調確認と声かけ",
    source: "web/src/components/ky-paper/heat-illness-ky-start.tsx",
  },
  "HL-M-015": {
    page: "/heat-illness-prevention",
    section: "13. 災害統計",
    text: "死亡者数は死傷者数の内数です。年ごとの気象・就業・報告条件が異なるため、件数だけで個別現場の危険度を判定しません。",
    source: "web/src/data/heat-illness-campaign.ts",
  },
  "HL-E-001": {
    page: "/heat-illness-prevention",
    section: "ページ冒頭",
    text: "このページだけで作業可否や医学的状態を確定しません。公的資料、現場実測、事業場手順、人による判断を優先してください。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-002": {
    page: "/heat-illness-prevention",
    section: "17. 出典・更新日・限界",
    text: "これは人手による本文内容確認日ではありません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-003": {
    page: "/heat-illness-prevention",
    section: "取得不能時の安全境界",
    text: "推定WBGTを現場実測と表示せず、安衛則第612条の2の法定義務とガイドラインの推奨事項を分けます。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-004": {
    page: "/heat-illness-prevention",
    section: "作業開始前の10項目",
    text: "WBGTが実測値・実況推定値・予測値のどれか確認した",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-005": {
    page: "/heat-illness-prevention",
    section: "10. 緊急時対応・1",
    text: "まず反応と意識を確認する。意識がはっきりしない、反応が異常、または判断できない場合は、ただちに119番へ連絡する。移動や冷却のために救急要請を遅らせない。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-006": {
    page: "/heat-illness-prevention",
    section: "13. 災害統計",
    text: "synthetic・想定例・報道由来データはこの統計に混ぜていません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-007": {
    page: "/heat-illness-prevention",
    section: "8. 個人用保護具・熱中症対策用品",
    text: "現在、この一覧にアフィリエイトリンク・広告・商品レビューはありません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-008": {
    page: "/heat-illness-prevention",
    section: "9. 作業前KY",
    text: "地域、日付、WBGTまたは推定リスクの種別、作業内容、作業時間、休憩、水分補給、体調確認、緊急連絡、役割分担を確認します。テーマ選択は入力候補を示すだけで、AI候補や過去例を利用者確定内容へ自動転記しません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-009": {
    page: "/heat-illness-prevention",
    section: "16. 講習・資料作成相談",
    text: "URLへ相談本文、氏名、メール、会社名、健康情報を入れず、粗い相談種別だけを初期選択します。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-010": {
    page: "/heat-illness-prevention/slides",
    section: "教材の適用範囲",
    text: "AI支援で作成した未監修教材で、法令・編集・医学の外部確認待ちです。公式資料や正式な教育記録を代替しません。",
    source: "web/src/app/(main)/heat-illness-prevention/slides/page.tsx",
  },
  "HL-E-011": {
    page: "/heat-illness-prevention/slides",
    section: "HTMLスライド",
    text: "HTML版を正本として全スライドを表示",
    source: "web/src/app/(main)/heat-illness-prevention/slides/heat-illness-slides.tsx",
  },
  "HL-E-012": {
    page: "/heat-illness-prevention/elearning",
    section: "理解度確認",
    text: "公式根拠を確認する7問",
    source: "web/src/app/(main)/heat-illness-prevention/elearning/page.tsx",
  },
  "HL-E-013": {
    page: "/heat-illness-prevention/elearning",
    section: "学習状態",
    text: "結果は自己確認用で、正式な教育記録や受講証明にはなりません。必要な事業場では管理者確認と所定の手続きを行ってください。",
    source: "web/src/app/(main)/heat-illness-prevention/elearning/page.tsx",
  },
  "HL-E-014": {
    page: "/signage",
    section: "熱中症重点カード・取得確認中",
    text: "取得元、対象時刻、取得時刻をまだ確認できません。読込完了まで警報なし・安全とは扱わないでください。",
    source: "web/src/components/signage/signage-heat-special.tsx",
  },
  "HL-E-015": {
    page: "/signage",
    section: "熱中症重点カード・緊急対応中",
    text: "このカードより現場の緊急手順、作業中止、救急要請と責任者への連絡を優先してください。",
    source: "web/src/components/signage/signage-heat-special.tsx",
  },
  "HL-E-016": {
    page: "/ky/paper?topic=heat-illness",
    section: "熱中症KYの開始境界",
    text: "この導線は入力候補を自動確定せず、AI提案や予報値も帳票へ自動転記しません。",
    source: "web/src/components/ky-paper/heat-illness-ky-start.tsx",
  },
  "HL-E-017": {
    page: "/heat-illness-prevention",
    section: "review状態",
    text: "外部法務・編集・医学レビューは未完了です。内容確認済みや公式見解とは表示しません。",
    source: "web/src/app/(main)/heat-illness-prevention/page.tsx",
  },
  "HL-E-018": {
    page: "/heat-illness-prevention/slides",
    section: "review状態",
    text: "AI支援で作成した未監修教材で、法令・編集・医学の外部確認待ちです。公式資料や正式な教育記録を代替しません。",
    source: "web/src/app/(main)/heat-illness-prevention/slides/page.tsx",
  },
  "HL-E-019": {
    page: "/heat-illness-prevention/elearning",
    section: "review状態",
    text: "AI支援で作成した未監修教材です。外部法務レビュー待ちのため、公式資料と事業場手順を正本とします。",
    source: "web/src/app/(main)/heat-illness-prevention/elearning/page.tsx",
  },
};

function parseCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    if (quoted) {
      if (character === '"' && content[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((item) => item.length > 1 || item[0]);
}

function csv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function normaliseCopy(value) {
  return value.normalize("NFKC").replace(/\s+/g, "");
}

const packNames = ["legal", "medical", "editorial"];
const failures = [];
let rowCount = 0;

for (const packName of packNames) {
  const currentPath = resolve(
    repoRoot,
    `docs/audits/heat-illness-${packName}-review-pack-2026-07-29.csv`,
  );
  const legacyPath = resolve(
    repoRoot,
    `docs/audits/heat-illness-${packName}-review-pack-2026-07-27.csv`,
  );
  const inputPath = existsSync(currentPath) ? currentPath : legacyPath;
  const rows = parseCsv(readFileSync(inputPath, "utf8"));
  const header = rows[0];
  const claimIdIndex = header.indexOf("claim ID");
  const pageIndex = header.indexOf("ページ");
  const sectionIndex = header.indexOf("セクション");
  const displayTextIndex = header.indexOf("表示文");
  if ([claimIdIndex, pageIndex, sectionIndex, displayTextIndex].includes(-1)) {
    failures.push(`${packName}: required header missing`);
    continue;
  }

  for (const row of rows.slice(1)) {
    const claim = claims[row[claimIdIndex]];
    if (!claim) {
      failures.push(`${row[claimIdIndex]}: copy mapping missing`);
      continue;
    }
    if (
      !write &&
      (row[pageIndex] !== claim.page ||
        row[sectionIndex] !== `${claim.section} / source: ${claim.source}` ||
        row[displayTextIndex] !== claim.text)
    ) {
      failures.push(`${row[claimIdIndex]}: review pack copy drift`);
    }
    row[pageIndex] = claim.page;
    row[sectionIndex] = `${claim.section} / source: ${claim.source}`;
    row[displayTextIndex] = claim.text;
    const source = readFileSync(resolve(repoRoot, claim.source), "utf8");
    if (!normaliseCopy(source).includes(normaliseCopy(claim.text))) {
      failures.push(
        `${row[claimIdIndex]}: displayed copy not found in ${claim.source}`,
      );
    }
    rowCount += 1;
  }

  if (write && failures.length === 0) {
    writeFileSync(
      currentPath,
      `${rows.map((row) => row.map(csv).join(",")).join("\n")}\n`,
      "utf8",
    );
  }
}

const expectedIds = new Set(Object.keys(claims));
if (rowCount !== expectedIds.size) {
  failures.push(`review rows ${rowCount} != mappings ${expectedIds.size}`);
}

process.stdout.write(
  `${JSON.stringify(
    {
      mode: write ? "write" : "check",
      rowCount,
      mappingCount: expectedIds.size,
      failures,
      passed: failures.length === 0,
    },
    null,
    2,
  )}\n`,
);
if (failures.length > 0) process.exitCode = 1;
