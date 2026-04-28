#!/usr/bin/env node
/**
 * 多言語タイトル事前生成（テンプレートベース、API未使用）
 *
 * 既存リソース（記事・通達・教育ページ等）のタイトルを
 * 用語辞書ベースで en / zh / vi / pt / tl に翻訳して
 * web/src/data/translations/multilingual-titles.json に出力する。
 *
 * 設計:
 * - 用語辞書（GLOSSARY）で頻出語を機械的に置換 → 完全翻訳ではないが
 *   検索エンジン・SNSプレビュー向けに最低限の多言語化を実現。
 * - 完全な本文翻訳は /api/translate/article のリアルタイム翻訳に委ねる。
 *
 * 使い方:
 *   node scripts/generate-multilingual-titles.mjs
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ARTICLES_DIR = resolve(__dirname, "..", "src", "data", "articles");
const NOTICES_PATH = resolve(__dirname, "..", "src", "data", "mhlw-notices.ts");
const OUT_PATH = resolve(__dirname, "..", "src", "data", "translations", "multilingual-titles.json");

// ─────────────────────────────────────────────
// 用語辞書（労働安全分野の頻出語のみ）
// ─────────────────────────────────────────────
const GLOSSARY = {
  en: [
    ["労働安全衛生", "Occupational Safety and Health"],
    ["労働災害", "Workplace Accident"],
    ["特別教育", "Special Education"],
    ["フルハーネス", "Full Harness"],
    ["熱中症", "Heat Stroke"],
    ["化学物質", "Chemical Substance"],
    ["リスクアセスメント", "Risk Assessment"],
    ["ストレスチェック", "Stress Check"],
    ["建設業", "Construction Industry"],
    ["製造業", "Manufacturing"],
    ["林業", "Forestry"],
    ["介護", "Care Work"],
    ["医療", "Healthcare"],
    ["足場", "Scaffold"],
    ["振動障害", "Vibration Disorder"],
    ["フリーランス", "Freelancer"],
    ["労災", "Workers' Compensation"],
    ["安衛法", "Industrial Safety and Health Act"],
    ["規則", "Regulation"],
    ["改正", "Amendment"],
    ["義務化", "Mandatory"],
    ["KY用紙", "Hazard Prediction Sheet (KY)"],
    ["危険予知", "Hazard Prediction"],
    ["保護具", "Personal Protective Equipment"],
    ["事故事例", "Accident Case Study"],
    ["通達", "Circular"],
    ["告示", "Public Notice"],
    ["指針", "Guideline"],
    ["墜落", "Fall from height"],
    ["転落", "Fall"],
    ["災害", "Disaster"],
    ["年", " "],
    ["月", "/"],
    ["日", ""],
    ["の", " of "],
    ["について", " (overview)"],
    ["ガイドライン", "Guideline"],
    ["策定", "Establishment"],
    ["施行", "Enforcement"],
    ["遵守", "Compliance"],
  ],
  zh: [
    ["労働安全衛生", "劳动安全卫生"],
    ["労働災害", "工伤事故"],
    ["特別教育", "特别教育"],
    ["フルハーネス", "全身式安全带"],
    ["熱中症", "中暑"],
    ["化学物質", "化学物质"],
    ["リスクアセスメント", "风险评估"],
    ["ストレスチェック", "心理压力检查"],
    ["建設業", "建筑业"],
    ["製造業", "制造业"],
    ["林業", "林业"],
    ["介護", "护理"],
    ["医療", "医疗"],
    ["足場", "脚手架"],
    ["振動障害", "振动障碍"],
    ["フリーランス", "自由职业者"],
    ["労災", "工伤保险"],
    ["安衛法", "劳动安全卫生法"],
    ["規則", "规则"],
    ["改正", "修订"],
    ["義務化", "强制化"],
    ["KY用紙", "危险预知表"],
    ["危険予知", "危险预知"],
    ["保護具", "防护用品"],
    ["事故事例", "事故案例"],
    ["通達", "通达"],
    ["告示", "公告"],
    ["指針", "指南"],
    ["墜落", "坠落"],
    ["転落", "跌落"],
    ["災害", "灾害"],
    ["の", "的"],
    ["について", "（概要）"],
    ["ガイドライン", "指南"],
    ["策定", "制定"],
    ["施行", "实施"],
    ["遵守", "遵守"],
  ],
  vi: [
    ["労働安全衛生", "An toàn vệ sinh lao động"],
    ["労働災害", "Tai nạn lao động"],
    ["特別教育", "Đào tạo đặc biệt"],
    ["フルハーネス", "Dây an toàn toàn thân"],
    ["熱中症", "Sốc nhiệt"],
    ["化学物質", "Chất hóa học"],
    ["リスクアセスメント", "Đánh giá rủi ro"],
    ["建設業", "Ngành xây dựng"],
    ["製造業", "Ngành chế tạo"],
    ["KY用紙", "Phiếu dự báo nguy cơ (KY)"],
    ["改正", "Sửa đổi"],
    ["義務化", "Bắt buộc"],
    ["通達", "Thông tư"],
    ["告示", "Thông báo"],
    ["の", " "],
    ["について", "(Tổng quan)"],
  ],
  pt: [
    ["労働安全衛生", "Saúde e Segurança Ocupacional"],
    ["労働災害", "Acidente de Trabalho"],
    ["特別教育", "Treinamento Especial"],
    ["熱中症", "Insolação"],
    ["化学物質", "Substância Química"],
    ["リスクアセスメント", "Avaliação de Risco"],
    ["建設業", "Construção"],
    ["製造業", "Indústria"],
    ["KY用紙", "Folha de Previsão de Risco (KY)"],
    ["改正", "Emenda"],
    ["義務化", "Obrigatório"],
    ["通達", "Circular"],
    ["告示", "Notificação"],
    ["の", " de "],
    ["について", " (visão geral)"],
  ],
  tl: [
    ["労働安全衛生", "Kaligtasan sa Trabaho"],
    ["労働災害", "Aksidente sa Trabaho"],
    ["特別教育", "Espesyal na Pagsasanay"],
    ["熱中症", "Heat Stroke"],
    ["化学物質", "Kemikal"],
    ["リスクアセスメント", "Pagtatasa ng Panganib"],
    ["建設業", "Industriya ng Konstruksyon"],
    ["KY用紙", "KY Form"],
    ["改正", "Pagbabago"],
    ["義務化", "Sapilitan"],
    ["通達", "Sirkular"],
    ["の", " ng "],
    ["について", " (pangkalahatan)"],
  ],
};

function translateTitle(jaTitle, lang) {
  const dict = GLOSSARY[lang] ?? [];
  let out = jaTitle;
  for (const [ja, target] of dict) {
    out = out.split(ja).join(target);
  }
  return out;
}

// ─────────────────────────────────────────────
// 入力ソース収集
// ─────────────────────────────────────────────
const titles = [];

// 1) 記事
const articleFiles = readdirSync(ARTICLES_DIR).filter((f) => f.endsWith(".json"));
for (const f of articleFiles) {
  const a = JSON.parse(readFileSync(resolve(ARTICLES_DIR, f), "utf-8"));
  titles.push({ resourceType: "article", id: a.slug, ja: a.title });
}

// 2) 通達（最新200件のみ。全件はサイズが大きいので段階的に増やす）
const noticesText = readFileSync(NOTICES_PATH, "utf-8");
const noticeMatches = noticesText.matchAll(/"id":\s*"(mhlw-notice-\d+)",\s*"title":\s*"([^"]+)"/g);
let count = 0;
for (const m of noticeMatches) {
  if (count >= 200) break;
  titles.push({ resourceType: "notice", id: m[1], ja: m[2] });
  count++;
}

// ─────────────────────────────────────────────
// 翻訳実行
// ─────────────────────────────────────────────
const result = {
  generatedAt: new Date().toISOString().slice(0, 10),
  totalTitles: titles.length,
  languages: ["en", "zh", "vi", "pt", "tl"],
  entries: titles.map((t) => ({
    resourceType: t.resourceType,
    id: t.id,
    ja: t.ja,
    en: translateTitle(t.ja, "en"),
    zh: translateTitle(t.ja, "zh"),
    vi: translateTitle(t.ja, "vi"),
    pt: translateTitle(t.ja, "pt"),
    tl: translateTitle(t.ja, "tl"),
  })),
};

writeFileSync(OUT_PATH, JSON.stringify(result, null, 2), "utf-8");
console.log(`Generated ${result.totalTitles} multilingual titles → ${OUT_PATH}`);
