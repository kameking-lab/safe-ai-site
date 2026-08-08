import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EgovRevisionQualityError,
  runCli,
  runEgovRevisionFetch,
  type EgovRevisionSnapshot,
} from "../../../scripts/etl/egov-revisions-fetch";

const temporaryDirectories: string[] = [];

function temporaryOutputPath(): string {
  const directory = mkdtempSync(join(tmpdir(), "egov-revisions-etl-"));
  temporaryDirectories.push(directory);
  return join(directory, "egov-revisions.json");
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function target(index: number) {
  return {
    lawId: `fixture-law-${index}`,
    lawShort: `fixture-${index}`,
  };
}

function validLawFixture(lawId: string): Record<string, unknown> {
  return {
    law_info: { law_id: lawId },
    revision_info: {
      law_title: `合成法令 ${lawId}`,
      law_type: "Act",
      amendment_promulgate_date: "2026-01-15",
      amendment_enforcement_date: "2026-04-01",
      amendment_law_title: "合成改正法",
      amendment_law_num: "令和八年合成法律第一号",
      current_revision_status: "CurrentEnforced",
    },
  };
}

function fixedClock(...isoTimes: string[]): () => Date {
  let index = 0;
  return () => {
    const value = isoTimes[Math.min(index, isoTimes.length - 1)];
    index += 1;
    return new Date(value);
  };
}

describe("e-Gov revisions ETL fail-closed guard", () => {
  it("全面障害は非0終了し、既存snapshotをバイト単位で保持する", async () => {
    const outputPath = temporaryOutputPath();
    const previousSnapshot = '{"sentinel":"previous-success"}\n';
    writeFileSync(outputPath, previousSnapshot, "utf-8");
    const errors: string[] = [];

    const exitCode = await runCli({
      outputPath,
      targets: [target(1), target(2), target(3)],
      fetchLaw: async () => null,
      now: fixedClock("2026-07-22T01:00:00.000Z"),
      delayMs: 0,
      logger: {
        log: () => undefined,
        error: (...args: unknown[]) => errors.push(args.join(" ")),
      },
    });

    expect(exitCode).toBe(1);
    expect(readFileSync(outputPath, "utf-8")).toBe(previousSnapshot);
    expect(errors.join("\n")).toContain("existing snapshot preserved");
    expect(errors.join("\n")).toContain("succeeded=0/3");
    expect(readdirSync(join(outputPath, ".."))).toEqual(["egov-revisions.json"]);
  });

  it("最低成功率未満の高率障害も拒否し、既存snapshotを保持する", async () => {
    const outputPath = temporaryOutputPath();
    const previousSnapshot = '{"revisions":[{"id":"old"}]}\n';
    writeFileSync(outputPath, previousSnapshot, "utf-8");
    const targets = [target(1), target(2), target(3), target(4), target(5)];

    const attempt = runEgovRevisionFetch({
      outputPath,
      targets,
      minimumSuccessRate: 0.8,
      fetchLaw: async (lawId) => {
        if (lawId.endsWith("1") || lawId.endsWith("2") || lawId.endsWith("3")) {
          return validLawFixture(lawId);
        }
        throw new Error("synthetic upstream failure");
      },
      now: fixedClock("2026-07-22T02:00:00.000Z"),
      delayMs: 0,
    });

    await expect(attempt).rejects.toMatchObject({
      name: "EgovRevisionQualityError",
      code: "EGOV_REVISION_MINIMUM_SUCCESS_RATE",
      succeeded: 3,
      targetCount: 5,
    } satisfies Partial<EgovRevisionQualityError>);
    expect(readFileSync(outputPath, "utf-8")).toBe(previousSnapshot);
    expect(readdirSync(join(outputPath, ".."))).toEqual(["egov-revisions.json"]);
  });

  it("最低成功率ちょうどなら時刻を分離して原子的に完全なsnapshotへ置換する", async () => {
    const outputPath = temporaryOutputPath();
    writeFileSync(outputPath, "previous snapshot\n", "utf-8");
    const targets = [target(1), target(2), target(3), target(4), target(5)];
    const logs: string[] = [];

    const result = await runEgovRevisionFetch({
      outputPath,
      targets,
      minimumSuccessRate: 0.8,
      fetchLaw: async (lawId) =>
        lawId.endsWith("5") ? null : validLawFixture(lawId),
      now: fixedClock(
        "2026-07-22T03:00:00.000Z",
        "2026-07-22T03:00:05.000Z",
      ),
      delayMs: 0,
      logger: {
        log: (...args: unknown[]) => logs.push(args.join(" ")),
        error: () => undefined,
      },
    });

    expect(result).toMatchObject({
      total: 4,
      failed: 1,
      successRate: 0.8,
      lastAttemptAt: "2026-07-22T03:00:00.000Z",
      lastSuccessAt: "2026-07-22T03:00:05.000Z",
    });

    const snapshot = JSON.parse(
      readFileSync(outputPath, "utf-8"),
    ) as EgovRevisionSnapshot;
    expect(snapshot).toMatchObject({
      fetchedAt: "2026-07-22T03:00:05.000Z",
      lastAttemptAt: "2026-07-22T03:00:00.000Z",
      lastSuccessAt: "2026-07-22T03:00:05.000Z",
      total: 4,
      skipped: 1,
      skippedLaws: ["fixture-5"],
      successRate: 0.8,
      minimumSuccessRate: 0.8,
    });
    expect(snapshot.revisions).toHaveLength(4);
    expect(snapshot.revisions.every((record) => record.source_url.startsWith("https://laws.e-gov.go.jp/law/"))).toBe(true);
    expect(logs.join("\n")).toContain("successRate=80.0%");
    expect(readdirSync(join(outputPath, ".."))).toEqual(["egov-revisions.json"]);
  });
});
