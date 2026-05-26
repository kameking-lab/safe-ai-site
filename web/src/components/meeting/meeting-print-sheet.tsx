/**
 * Phase 10: 安全工程打合せ書 A4横 印刷レイアウト。
 * 画面では非表示（hidden）、印刷時のみ表示（paper-view が hidden print:block で包む）。
 * 各社マトリクスを正式な表組みで再現。点検項目・使用機械・確認欄を含む。
 */
import { PRIORITY_LABEL, type MeetingRecord, type ContractorType } from "@/lib/meeting/schema";

const th = "border border-black bg-slate-100 px-1 py-0.5 text-center align-middle font-bold";
const td = "border border-black px-1 py-0.5 align-top";
const STATUS_MARK = { ok: "○", ng: "×", na: "－" } as const;
const TYPE_PAD: Record<ContractorType, string> = { 元請: "0", "1次": "6px", "2次": "12px", "3次": "18px" };

export function MeetingPrintSheet({ record }: { record: MeetingRecord }) {
  const date = `${record.workDateYear}年${record.workDateMonth}月${record.workDateDay}日`;
  return (
    <div className="mx-auto bg-white text-[7.5pt] leading-tight text-black print:text-black" style={{ width: "277mm", maxWidth: "100%" }}>
      <div className="mb-1 flex items-end justify-between">
        <h1 className="text-[12pt] font-bold">安全工程打合せ書及び安全衛生指示書</h1>
        <span className="text-[8pt]">打合せ日: {record.meetingDate}</span>
      </div>

      {/* ヘッダー */}
      <table className="w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[8%]`}>作業日</th><td className={`${td} w-[14%]`}>{date}</td>
            <th className={`${th} w-[6%]`}>天気</th><td className={`${td} w-[10%]`}>{[record.weather, record.temperature && `${record.temperature}℃`].filter(Boolean).join(" ")}</td>
            <th className={`${th} w-[8%]`}>作業所名</th><td className={`${td} w-[18%]`}>{record.siteName}</td>
            <th className={`${th} w-[8%]`}>作業所長</th><td className={`${td} w-[10%]`}>{record.siteManager}</td>
            <th className={`${th} w-[6%]`}>主任</th><td className={`${td}`}>{record.supervisor}</td>
            <th className={`${th} w-[8%]`}>作成担当</th><td className={`${td} w-[8%]`}>{record.author}</td>
          </tr>
        </tbody>
      </table>

      {/* 各社マトリクス */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <thead>
          <tr>
            <th className={`${th} w-[12%]`}>業者（階層）</th>
            <th className={`${th} w-[12%]`}>作業内容</th>
            <th className={`${th} w-[9%]`}>使用機械</th>
            <th className={`${th} w-[10%]`}>必要資格</th>
            <th className={`${th} w-[4%]`}>予定</th>
            <th className={`${th} w-[11%]`}>予想災害</th>
            <th className={`${th} w-[4%]`}>重</th>
            <th className={`${th} w-[4%]`}>可</th>
            <th className={`${th} w-[7%]`}>優先度</th>
            <th className={`${th} w-[15%]`}>安全衛生指示事項</th>
            <th className={`${th} w-[8%]`}>責任者</th>
            <th className={`${th} w-[4%]`}>実績</th>
          </tr>
        </thead>
        <tbody>
          {record.contractors.map((c) => (
            <tr key={c.id}>
              <td className={td}>
                <span style={{ paddingLeft: TYPE_PAD[c.type] }} className="inline-block">
                  <span className="mr-1 rounded bg-slate-200 px-1 text-[6.5pt]">{c.type}</span>
                  {c.companyName}
                </span>
              </td>
              <td className={`${td} whitespace-pre-wrap`}>{c.workContent}</td>
              <td className={td}>{c.machines}</td>
              <td className={td}>{c.qualifications.join("、")}</td>
              <td className={`${td} text-center`}>{c.plannedCount}</td>
              <td className={td}>{c.predictedDisasters.join("、")}</td>
              <td className={`${td} text-center`}>{c.risk.severity}</td>
              <td className={`${td} text-center`}>{c.risk.likelihood}</td>
              <td className={`${td} text-center`}>{PRIORITY_LABEL[c.risk.priority]}</td>
              <td className={`${td} whitespace-pre-wrap`}>{c.safetyInstructions}</td>
              <td className={td}>{c.responsibleName}</td>
              <td className={`${td} text-center`}>{c.actualCount}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 下段3ブロック */}
      <div className="mt-1 grid grid-cols-3 gap-1">
        <table className="w-full border-collapse">
          <tbody>
            <tr><th className={`${th} w-[40%]`}>安全大会</th><td className={td}>{record.tomorrowEvents.safetyMeeting}</td></tr>
            <tr><th className={th}>検査</th><td className={td}>{record.tomorrowEvents.inspection}</td></tr>
            <tr><th className={th}>パトロール</th><td className={td}>{record.tomorrowEvents.patrol}</td></tr>
            <tr><th className={th}>明日の安全目標</th><td className={td}>{record.tomorrowEvents.tomorrowGoal}</td></tr>
            <tr><th className={th}>その他</th><td className={td}>{record.tomorrowEvents.free}</td></tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <thead><tr><th className={`${th} w-[40%]`}>搬入出 物</th><th className={`${th} w-[25%]`}>時刻</th><th className={th}>場所</th></tr></thead>
          <tbody>
            {record.deliveries.filter((d) => d.item || d.time || d.place).map((d) => (
              <tr key={d.id}><td className={td}>{d.item}</td><td className={`${td} text-center`}>{d.time}</td><td className={td}>{d.place}</td></tr>
            ))}
            {record.deliveries.every((d) => !d.item && !d.time && !d.place) && (<tr><td className={td}>&nbsp;</td><td className={td}></td><td className={td}></td></tr>)}
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>統括安全責任者コメント</th></tr></thead>
          <tbody><tr><td className={`${td} whitespace-pre-wrap`} style={{ height: "20mm" }}>{record.supervisorComment}</td></tr></tbody>
        </table>
      </div>

      {/* 点検項目8カテゴリ */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <tbody>
          {chunk(record.checklist, 4).map((row, ri) => (
            <tr key={ri}>
              {row.map((cat) => (
                <td key={cat.key} className={`${td} w-1/4`}>
                  <span className="font-bold">{cat.label}: </span>
                  {cat.items.map((it) => (
                    <span key={it.key} className="mr-1 whitespace-nowrap">{it.label}<span className="font-bold">{STATUS_MARK[it.status]}</span></span>
                  ))}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* 使用機械＋確認欄 */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[12%]`}>使用機械</th>
            <td className={td}>{record.machines.map((m) => `${m.name}×${m.count}`).join("　")}</td>
            <th className={`${th} w-[12%]`}>作業所長 確認</th><td className={`${td} w-[12%]`}>&nbsp;</td>
            <th className={`${th} w-[12%]`}>作成担当者</th><td className={`${td} w-[12%]`}>&nbsp;</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
