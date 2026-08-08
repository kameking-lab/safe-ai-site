import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd(), "..");
const csvPath = path.join(
  repoRoot,
  "docs",
  "audits",
  "visual-kyt-asset-inventory-2026-07-30.csv",
);
const summaryPath = path.join(
  repoRoot,
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "assets",
  "inventory-summary.json",
);
const manifestPath = path.join(
  repoRoot,
  "docs",
  "audits",
  "evidence",
  "visual-kyt-academy-2026-07-30",
  "images",
  "generated-image-manifest.json",
);

const review = {
  "scaffold-fall": {
    scene: "建物外周の足場で、開いた端部・床材の隙間・未接続ランヤード・端部工具を示す場面。",
    category: "足場／墜落・転落",
    people: 3,
  },
  "aerial-lift-entrapment": {
    scene: "展示会場内の高所作業車で、上方梁への挟圧と足元監視を考える場面。",
    category: "高所作業車",
    people: 3,
  },
  "excavator-blind-spot": {
    scene: "掘削現場で油圧ショベルの死角・旋回範囲と歩車分離を考える場面。",
    category: "重機・車両",
    people: 3,
  },
  "rollbox-overturn": {
    scene: "物流倉庫で偏荷重のかご台車が傾き、作業者が支えようとする場面。",
    category: "荷役・挟まれ",
    people: 2,
  },
  "tail-lift-loading": {
    scene: "トラックのテールゲートリフター上で荷と作業者の落下・挟圧を考える場面。",
    category: "荷役・挟まれ",
    people: 2,
  },
  "stepladder-instability": {
    scene: "製造棟の通路で脚立から横へ身を乗り出し、不安定な設置を考える場面。",
    category: "脚立",
    people: 2,
  },
  "temporary-electric-shock": {
    scene: "雨水が入り込んだ仮設電源付近で、損傷コード・湿潤・遮断を考える場面。",
    category: "電気",
    people: 2,
  },
  "hot-work-fire": {
    scene: "製造現場の火気作業で、火花・ガス容器・可燃物・火気監視を考える場面。",
    category: "火災・爆発",
    people: 2,
  },
  "chemical-transfer-sds": {
    scene: "局所排気装置前の薬品移し替えで、容器・飛散・SDS・PPEを考える場面。",
    category: "化学物質",
    people: 2,
  },
  "heat-stress-summer": {
    scene: "夏の建設現場で体調不良の兆候、単独化、休憩・冷却・報告を考える場面。",
    category: "熱中症",
    people: 3,
  },
  "warehouse-trip": {
    scene: "倉庫通路で床の水、横断コード、荷物で遮られた視界による転倒を考える場面。",
    category: "転倒",
    people: 2,
  },
  "lone-maintenance": {
    scene: "夜間の機械室で一人の保全作業者が回転機械付近を点検する場面。",
    category: "一人作業",
    people: 1,
  },
  "new-entrant-route": {
    scene: "展示会設営現場で新規入場者が搬入経路へ入り、誘導・理解確認を考える場面。",
    category: "新規入場者",
    people: 3,
  },
  "night-roadwork": {
    scene: "夜間道路工事で照明の眩惑、暗部、一般車両、誘導配置を考える場面。",
    category: "夜間／交通",
    people: 4,
  },
  "rain-wind-delivery": {
    scene: "雨天・強風の建設搬入口で後退車両、大判資材、濡れた路面を考える場面。",
    category: "交通／雨天・強風",
    people: 4,
  },
};

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const existing = (await readFile(csvPath, "utf8"))
  .replace(/^\uFEFF/, "")
  .split(/\r?\n/)
  .filter(Boolean)
  // The generated rows contain Windows destination paths, so filtering only a
  // POSIX public path made repeated evidence refreshes append duplicates.
  .filter((line, index) =>
    index === 0 || !line.includes('"generated-for-this-project"'),
  );
const headers = existing[0];
const rows = existing.slice(1);

for (const image of manifest.images) {
  const item = review[image.scenarioImageId];
  if (!item) throw new Error(`Missing visual review: ${image.scenarioImageId}`);
  const sourcePath = path.join(repoRoot, image.source.replaceAll("/", path.sep));
  const destination = path.join(
    repoRoot,
    "web",
    "public",
    image.publicPath.replace(/^\//, "").replaceAll("/", path.sep),
  );
  rows.push(
    [
      sourcePath,
      path.basename(image.publicPath),
      image.optimizedDimensions,
      "1.7778:1",
      image.optimizedBytes,
      item.scene,
      item.category,
      String(item.people),
      "内部目視検査pass。画像内文字・注記・企業ロゴ・透かし・署名なし。",
      "generated-for-this-project（2026-07-30、OpenAI image generation through the Codex imagegen skill。安全AIポータル専用生成）",
      "高。1600x900、16:9、投影・スマホ・印刷・hotspot配置に適合。",
      "内部安全教育レビューpass。人数・手足・PPE・機械構造・危険因果を目視確認。外部専門家レビューは独立レビュー工程で実施。",
      `ビジュアルKYT ${image.scenarioImageId} の問題画像、OG・一覧サムネイル、A4印刷。`,
      destination,
      `sha256:${image.optimizedSha256}`,
      "generated-for-this-project",
    ]
      .map(csvCell)
      .join(","),
  );
}

await writeFile(
  csvPath,
  `\uFEFF${[headers, ...rows].join("\r\n")}\r\n`,
  "utf8",
);

const oldSummary = JSON.parse(await readFile(summaryPath, "utf8"));
const summary = {
  ...oldSummary,
  generatedAt: new Date().toISOString(),
  imageCount: rows.length,
  sourceInventoryImageCount: rows.length - manifest.images.length,
  generatedForProjectCount: manifest.images.length,
  selectedForProductionCount: manifest.images.length,
  existingImagesSelectedCount: 0,
  rejectedForProductionCount: rows.length - manifest.images.length,
  unresolvedRightsPublished: 0,
  classificationCounts: {
    ...oldSummary.classificationCounts,
    "generated-for-this-project": manifest.images.length,
  },
  rightsDecision:
    "The 15 production images were generated specifically for this project and passed internal rights/content review. All 8,672 images from the separate pic workspace remain rejected; no unresolved-rights image is published.",
};
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
