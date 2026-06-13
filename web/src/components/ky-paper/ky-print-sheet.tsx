/**
 * KY全面再設計 P1-A: A4印刷用 KY用紙レイアウト（全建協/建災防様式に寄せた表組み＋確認印枠）。
 * 画面では既定で非表示。/ky/paper が print 時（hidden print:block）と印刷プレビューで描画する。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import { evalScore, riskGrade } from "@/lib/ky/pulldown-options";
import { KY_APPROVAL_LABEL } from "@/lib/ky/approval";

const th = "border border-black bg-slate-100 px-1.5 py-1 text-left align-top font-bold whitespace-nowrap";
const td = "border border-black px-1.5 py-1 align-top";

export function KyPrintSheet({ record }: { record: KyInstructionRecordState }) {
  const participants = record.participants.filter((p) => p.name.trim());
  const risks = record.riskRows.filter((r) => r.hazard.trim() || r.reduction.trim());
  const workDetail = record.workRows.find((r) => r.workDetail.trim())?.workDetail ?? "";
  const dateStr = `${record.workDateYear || ""}年${record.workDateMonth || ""}月${record.workDateDay || ""}日`;
  const temp = record.temperature ? `${record.temperature}℃` : "";
  const approval = record.approval;
  const lastApprove = (approval?.history ?? []).slice().reverse().find((h) => h.action === "approve");

  return (
    <div className="mx-auto bg-white text-[9pt] text-black print:text-black" style={{ width: "186mm", maxWidth: "100%" }}>
      <div className="mb-1 flex items-end justify-between">
        {/* A4正式書式の見た目(14pt太字)を保ったまま、ページ唯一のh1(画面ヘッダー)と競合させないため非見出し(p)で描画 */}
        <p className="text-[14pt] font-bold tracking-wide">作業前 危険予知活動表（KY）</p>
        <span className="text-[9pt] text-slate-600">4ラウンド法</span>
      </div>

      {/* 管理情報 */}
      <table className="w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[18%]`}>現場名</th>
            <td className={`${td} w-[32%]`}>{record.siteName}</td>
            <th className={`${th} w-[18%]`}>工事名・工区</th>
            <td className={`${td} w-[32%]`}>{record.projectName}</td>
          </tr>
          <tr>
            <th className={th}>作業日</th>
            <td className={td}>{dateStr}</td>
            <th className={th}>天気・気温</th>
            <td className={td}>{[record.weather, temp].filter(Boolean).join(" ")}</td>
          </tr>
          <tr>
            <th className={th}>職長（リーダー）</th>
            <td className={td}>{record.foremanName}</td>
            <th className={th}>元請会社</th>
            <td className={td}>{record.coop1Name}</td>
          </tr>
        </tbody>
      </table>

      {/* 作業内容 */}
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[18%]`}>本日の作業内容</th>
            <td className={`${td} whitespace-pre-wrap`}>{workDetail}</td>
          </tr>
        </tbody>
      </table>

      {/* 危険のポイントと対策（リスクアセスメント） */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-[6%] text-center`}>No</th>
            <th className={`${th} w-[34%]`}>危険のポイント（1R）</th>
            <th className={`${th} w-[8%] text-center`}>可能性</th>
            <th className={`${th} w-[8%] text-center`}>重大性</th>
            <th className={`${th} w-[12%] text-center`}>評価値</th>
            <th className={`${th} w-[32%]`}>対策（3R）</th>
          </tr>
        </thead>
        <tbody>
          {risks.length === 0 ? (
            <tr>
              <td className={`${td} text-center`}>1</td>
              <td className={td}>&nbsp;</td>
              <td className={td}>&nbsp;</td>
              <td className={td}>&nbsp;</td>
              <td className={td}>&nbsp;</td>
              <td className={td}>&nbsp;</td>
            </tr>
          ) : (
            risks.map((r, i) => {
              const score = evalScore(r.likelihood, r.severity);
              return (
                <tr key={i}>
                  <td className={`${td} text-center`}>{r.targetLabel || i + 1}</td>
                  <td className={`${td} whitespace-pre-wrap`}>{r.hazard}</td>
                  <td className={`${td} text-center`}>{r.likelihood}</td>
                  <td className={`${td} text-center`}>{r.severity}</td>
                  <td className={`${td} text-center`}>{score}（{riskGrade(score).label}）</td>
                  <td className={`${td} whitespace-pre-wrap`}>{r.reduction}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* 本日の目標（4R）と指差呼称 */}
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[18%]`}>チーム行動目標</th>
            <td className={`${td} whitespace-pre-wrap`}>{record.teamGoal}</td>
          </tr>
          <tr>
            <th className={th}>重点実施項目</th>
            <td className={`${td} whitespace-pre-wrap`}>{record.priorityItems}</td>
          </tr>
          <tr>
            <th className={th}>指差呼称（ヨシ！）</th>
            <td className={td}>{record.pointingCall}</td>
          </tr>
        </tbody>
      </table>

      {/* 参加者 */}
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[18%]`}>参加者（{participants.length}名）</th>
            <td className={td}>{participants.map((p) => p.name + (p.qualNo ? `（${p.qualNo}）` : "")).join("　")}</td>
          </tr>
        </tbody>
      </table>

      {/* 承認状況（提出済み以降のみ表示） */}
      {approval && approval.status !== "draft" && (
        <p className="mt-1 text-[9pt] font-bold">
          承認状況: {KY_APPROVAL_LABEL[approval.status]}
          {lastApprove ? `（承認者: ${lastApprove.by} / ${new Date(lastApprove.at).toLocaleDateString("ja-JP")}）` : ""}
        </p>
      )}

      {/* 確認印枠 */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-1/3 text-center`}>職長 確認印</th>
            <th className={`${th} w-1/3 text-center`}>元方安全衛生管理者 確認印</th>
            <th className={`${th} w-1/3 text-center`}>元請担当者 確認印</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className={td} style={{ height: "20mm" }}>&nbsp;</td>
            <td className={td}>&nbsp;</td>
            <td className={td}>&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
