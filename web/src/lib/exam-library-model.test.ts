import { describe, expect, it } from "vitest";
import {
  describeExamDate,
  formatExamDate,
  gradeExamAnswer,
  isScorableQuestion,
  officialPdfPageUrl,
  parseExamCatalog,
  parseExamCatalogEntry,
  parseExamPaper,
  parseExamQuestion,
} from "./exam-library-model";

const baseEntry = {
  id: "lckohyo-LC20260402-1",
  group: "lckohyo",
  subject: "一級ボイラー技士",
  label: "令和8年4月掲載",
  date: "2026-04",
  dateKind: "publication",
  pdfUrl: "https://www.exam.or.jp/wp-content/uploads/2026/04/LC20260402-1.pdf",
  indexUrl: "https://www.exam.or.jp/lckohyo/",
  answerMode: "official-choice",
  checkedAt: "2026-09-11",
};

const EXAM_ID = "lckohyo-LC20260402-1";
const baseQuestion = {
  id: `${EXAM_ID}-q1`,
  number: 1,
  text: "問 1",
  images: [`/exam-library/${EXAM_ID}/q1-p2-0.webp`],
  correctChoice: 4,
  choiceCount: 5,
  answerAuthority: "official",
};

describe("exam-library catalog contract", () => {
  it("accepts the documented contract with optional counts", () => {
    expect(parseExamCatalogEntry(baseEntry)).toMatchObject({ id: baseEntry.id });
    expect(
      parseExamCatalogEntry({ ...baseEntry, questionCount: 40, scoredCount: 38 }),
    ).toMatchObject({ questionCount: 40, scoredCount: 38 });
  });

  it("rejects entries that would mislabel dates or point outside the official source", () => {
    expect(parseExamCatalogEntry({ ...baseEntry, dateKind: "exam", date: "2026-04-01" })).toBeNull();
    expect(parseExamCatalogEntry({ ...baseEntry, date: "2026-13" })).toBeNull();
    expect(parseExamCatalogEntry({ ...baseEntry, pdfUrl: "https://example.com/a.pdf" })).toBeNull();
    expect(parseExamCatalogEntry({ ...baseEntry, id: "../etc/passwd" })).toBeNull();
    expect(parseExamCatalogEntry({ ...baseEntry, id: "emkohyo-LC20260402-1" })).toBeNull();
    expect(
      parseExamCatalogEntry({
        ...baseEntry,
        id: "emkohyo-EM20260230",
        group: "emkohyo",
        dateKind: "exam",
        date: "2026-02-30",
      }),
    ).toBeNull();
  });

  it("keeps only https note links and de-duplicates ids", () => {
    const parsed = parseExamCatalog([
      {
        ...baseEntry,
        noteLinks: [
          { title: "解説", url: "https://note.com/example/n/abc" },
          { title: "bad", url: "javascript:alert(1)" },
        ],
      },
      baseEntry,
    ]);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].noteLinks).toEqual([{ title: "解説", url: "https://note.com/example/n/abc" }]);
  });

  it("formats dates with their meaning", () => {
    expect(formatExamDate("2026-04")).toBe("2026年4月");
    expect(formatExamDate("2026-08-19")).toBe("2026年8月19日");
    expect(describeExamDate({ date: "2026-04", dateKind: "publication" })).toBe("2026年4月公表");
    expect(describeExamDate({ date: "2025-10-21", dateKind: "exam" })).toBe("2025年10月21日実施");
  });

  it("links to the source PDF page when known", () => {
    expect(officialPdfPageUrl(baseEntry.pdfUrl, 3)).toBe(`${baseEntry.pdfUrl}#page=3`);
    expect(officialPdfPageUrl(baseEntry.pdfUrl, undefined)).toBe(baseEntry.pdfUrl);
  });
});

describe("exam-library question contract", () => {
  it("grades only official answers inside the fixed choice range", () => {
    const question = parseExamQuestion(baseQuestion, EXAM_ID)!;
    expect(isScorableQuestion(question)).toBe(true);
    expect(gradeExamAnswer(question, 4)).toBe("correct");
    expect(gradeExamAnswer(question, 2)).toBe("incorrect");
    expect(gradeExamAnswer(question, null)).toBe("unscored");
  });

  it("downgrades official claims without a usable answer instead of inventing one", () => {
    const missing = parseExamQuestion({ ...baseQuestion, correctChoice: null }, EXAM_ID)!;
    const outOfRange = parseExamQuestion({ ...baseQuestion, correctChoice: 6 }, EXAM_ID)!;
    for (const question of [missing, outOfRange]) {
      expect(question.answerAuthority).toBe("unconfirmed");
      expect(question.correctChoice).toBeNull();
      expect(gradeExamAnswer(question, 4)).toBe("unscored");
    }
  });

  it("never grades unconfirmed or descriptive questions even if an answer is present", () => {
    const unconfirmed = parseExamQuestion(
      { ...baseQuestion, answerAuthority: "unconfirmed" },
      EXAM_ID,
    )!;
    const descriptive = parseExamQuestion(
      { ...baseQuestion, answerAuthority: "descriptive" },
      EXAM_ID,
    )!;
    expect(unconfirmed.correctChoice).toBeNull();
    expect(gradeExamAnswer(unconfirmed, 4)).toBe("unscored");
    expect(descriptive.choiceCount).toBe(0);
    expect(gradeExamAnswer(descriptive, 4)).toBe("unscored");
  });

  it("rejects images outside the exam's public folder", () => {
    for (const images of [
      ["/exam-library/other-exam/q1.webp"],
      [`/exam-library/${EXAM_ID}/../secret.webp`],
      ["https://example.com/q1.webp"],
      [`/exam-library/${EXAM_ID}/q1.svg`],
      [],
    ]) {
      expect(parseExamQuestion({ ...baseQuestion, images }, EXAM_ID)).toBeNull();
    }
  });

  it("sorts by number, drops invalid/duplicate items and keeps optional explanation", () => {
    const paper = parseExamPaper(
      [
        { ...baseQuestion, id: `${EXAM_ID}-q2`, number: 2, explanation: "  解説本文  " },
        baseQuestion,
        baseQuestion,
        { ...baseQuestion, id: "other-q3", number: 3 },
      ],
      EXAM_ID,
    );
    expect(paper.map((question) => question.number)).toEqual([1, 2]);
    expect(paper[1].explanation).toBe("解説本文");
    expect(paper[0].explanation).toBeUndefined();
  });
});
