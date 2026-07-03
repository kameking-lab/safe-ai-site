/**
 * Phase 10: 安全工程打合せ書 A4横 印刷レイアウト。
 * 画面では非表示（hidden）、印刷時のみ表示（paper-view が hidden print:block で包む）。
 * 各社マトリクスを正式な表組みで再現。点検項目・使用機械・確認欄を含む。
 *
 * S1（打合せ用紙 直接操作UI・第一弾〜第五弾）: KYと同じ方式で省略可能な `editing` prop を追加。
 * 指定時のみヘッダー7欄・明日のイベント5欄・統括安全責任者コメント・各社マトリクス7部位（第四弾で
 * 必要資格・予定人員・予想災害を追加し全部位が対応完了）・搬入出（第五弾・動的行）・
 * 点検項目8カテゴリ（第六弾・カテゴリ単位）がタップ標的（EditableCell）になる。
 * **`editing` 未指定の出力HTMLは従来と完全一致**
 * （meeting-print-sheet.test.tsx のスナップショットで機械的に固定＝A4正式書式は不可侵）。
 */
import type { ReactNode } from "react";
import { CONTRACTOR_TYPES, PRIORITY_LABEL, type MeetingRecord, type ContractorType } from "@/lib/meeting/schema";
import { checklistFieldKey, contractorFieldKey, deliveryFieldKey, getMeetingPaperFieldDef, type MeetingPaperFieldKey } from "@/lib/meeting/paper-fields";

const th = "border border-black bg-slate-100 px-1 py-0.5 text-center align-middle font-bold";
const td = "border border-black px-1 py-0.5 align-top";
/** 点検項目のステータス表示マーク。canvas第六弾のエディタ内tri-stateボタンとも共有。 */
export const STATUS_MARK = { ok: "○", ng: "×", na: "－" } as const;
const TYPE_PAD: Record<ContractorType, string> = { 元請: "0", "1次": "6px", "2次": "12px", "3次": "18px" };

export type MeetingPrintSheetEditing = {
  /** セル（欄）タップ時に呼ばれる */
  onTapField: (key: MeetingPaperFieldKey) => void;
  /** いま編集中の欄（青リング表示） */
  activeKey?: MeetingPaperFieldKey | null;
  /** 未記入の欄（うっすらアンバー＋点線表示） */
  emptyKeys?: ReadonlySet<string>;
  /** 各社マトリクスの行追加ホットスポット（S1第三弾: 動的行）。省略時は「＋元請/1次/2次/3次」を出さない。 */
  onAddContractorRow?: (type: ContractorType) => void;
  /** 搬入出予定の行追加ホットスポット（S1第五弾: 動的行）。省略時は「＋搬入出行を追加」を出さない。 */
  onAddDeliveryRow?: () => void;
};

/**
 * 欄の中身をタップ標的でラップする。editing 未指定時は中身をそのまま返す
 * （＝印刷/プレビュー経路のHTMLに1バイトも影響しない）。KyPrintSheetのEditableCellと同型。
 */
function EditableCell({
  editing,
  fieldKey,
  children,
}: {
  editing: MeetingPrintSheetEditing | undefined;
  fieldKey: MeetingPaperFieldKey;
  children: ReactNode;
}) {
  if (!editing) return <>{children}</>;
  const label = getMeetingPaperFieldDef(fieldKey).label;
  const isActive = editing.activeKey === fieldKey;
  const isEmpty = editing.emptyKeys?.has(fieldKey) ?? false;
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}を入力`}
      data-zoompan-skip="1"
      data-field-key={fieldKey}
      onClick={() => editing.onTapField(fieldKey)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          editing.onTapField(fieldKey);
        }
      }}
      className={`-mx-1 -my-0.5 min-h-[1.4em] cursor-pointer rounded-sm px-1 py-0.5 ${
        isActive
          ? "ring-2 ring-inset ring-sky-500"
          : isEmpty
            ? "border border-dashed border-amber-400 bg-amber-50/70"
            : "hover:bg-sky-50"
      }`}
    >
      {isEmpty ? <span className="text-[6.5pt] text-amber-700/80">タップして入力</span> : children}
    </div>
  );
}

export function MeetingPrintSheet({ record, editing }: { record: MeetingRecord; editing?: MeetingPrintSheetEditing }) {
  const date = `${record.workDateYear}年${record.workDateMonth}月${record.workDateDay}日`;
  return (
    <div className="mx-auto bg-white text-[7.5pt] leading-tight text-black print:text-black" style={{ width: "277mm", maxWidth: "100%" }}>
      <div className="mb-1 flex items-end justify-between">
        {/* 正式書式の表題。画面側の見出し(top barのh1)と二重h1にしないため、印刷帳票では非見出し要素として描画（見た目は12pt太字のまま）。 */}
        <p className="text-[12pt] font-bold">安全工程打合せ書及び安全衛生指示書</p>
        <span className="text-[8pt]">
          打合せ日: <EditableCell editing={editing} fieldKey="meetingDate">{record.meetingDate}</EditableCell>
        </span>
      </div>

      {/* ヘッダー */}
      <table className="w-full table-fixed border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[8%]`}>作業日</th>
            <td className={`${td} w-[14%]`}>
              <EditableCell editing={editing} fieldKey="workDate">{date}</EditableCell>
            </td>
            <th className={`${th} w-[6%]`}>天気</th>
            <td className={`${td} w-[10%]`}>
              <EditableCell editing={editing} fieldKey="weatherTemp">
                {[record.weather, record.temperature && `${record.temperature}℃`].filter(Boolean).join(" ")}
              </EditableCell>
            </td>
            <th className={`${th} w-[8%]`}>作業所名</th>
            <td className={`${td} w-[18%]`}>
              <EditableCell editing={editing} fieldKey="siteName">{record.siteName}</EditableCell>
            </td>
            <th className={`${th} w-[8%]`}>作業所長</th>
            <td className={`${td} w-[10%]`}>
              <EditableCell editing={editing} fieldKey="siteManager">{record.siteManager}</EditableCell>
            </td>
            <th className={`${th} w-[6%]`}>主任</th>
            <td className={`${td}`}>
              <EditableCell editing={editing} fieldKey="supervisor">{record.supervisor}</EditableCell>
            </td>
            <th className={`${th} w-[8%]`}>作成担当</th>
            <td className={`${td} w-[8%]`}>
              <EditableCell editing={editing} fieldKey="author">{record.author}</EditableCell>
            </td>
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
                  <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "company")}>
                    <span className="mr-1 rounded bg-slate-200 px-1 text-[6.5pt]">{c.type}</span>
                    {c.companyName}
                  </EditableCell>
                </span>
              </td>
              <td className={`${td} whitespace-pre-wrap`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "workContent")}>{c.workContent}</EditableCell>
              </td>
              <td className={td}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "machines")}>{c.machines}</EditableCell>
              </td>
              <td className={td}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "qualifications")}>{c.qualifications.join("、")}</EditableCell>
              </td>
              <td className={`${td} text-center`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "plannedCount")}>{c.plannedCount}</EditableCell>
              </td>
              <td className={td}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "predictedDisasters")}>{c.predictedDisasters.join("、")}</EditableCell>
              </td>
              <td className={`${td} text-center`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "risk")}>{c.risk.severity}</EditableCell>
              </td>
              <td className={`${td} text-center`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "risk")}>{c.risk.likelihood}</EditableCell>
              </td>
              <td className={`${td} text-center`}>{PRIORITY_LABEL[c.risk.priority]}</td>
              <td className={`${td} whitespace-pre-wrap`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "safetyInstructions")}>{c.safetyInstructions}</EditableCell>
              </td>
              <td className={td}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "responsibleName")}>{c.responsibleName}</EditableCell>
              </td>
              <td className={`${td} text-center`}>
                <EditableCell editing={editing} fieldKey={contractorFieldKey(c.id, "actualCount")}>{c.actualCount}</EditableCell>
              </td>
            </tr>
          ))}
          {editing?.onAddContractorRow && (
            <tr>
              <td colSpan={12} className={`${td} text-center`}>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {CONTRACTOR_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      data-zoompan-skip="1"
                      onClick={() => editing.onAddContractorRow!(t)}
                      className="min-h-[36px] rounded border border-dashed border-sky-400 bg-sky-50/70 px-3 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100"
                    >
                      ＋{t}
                    </button>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 下段3ブロック */}
      <div className="mt-1 grid grid-cols-3 gap-1">
        <table className="w-full border-collapse">
          <tbody>
            <tr><th className={`${th} w-[40%]`}>安全大会</th><td className={td}><EditableCell editing={editing} fieldKey="safetyMeeting">{record.tomorrowEvents.safetyMeeting}</EditableCell></td></tr>
            <tr><th className={th}>検査</th><td className={td}><EditableCell editing={editing} fieldKey="inspection">{record.tomorrowEvents.inspection}</EditableCell></td></tr>
            <tr><th className={th}>パトロール</th><td className={td}><EditableCell editing={editing} fieldKey="patrol">{record.tomorrowEvents.patrol}</EditableCell></td></tr>
            <tr><th className={th}>明日の安全目標</th><td className={td}><EditableCell editing={editing} fieldKey="tomorrowGoal">{record.tomorrowEvents.tomorrowGoal}</EditableCell></td></tr>
            <tr><th className={th}>その他</th><td className={td}><EditableCell editing={editing} fieldKey="free">{record.tomorrowEvents.free}</EditableCell></td></tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <thead><tr><th className={`${th} w-[40%]`}>搬入出 物</th><th className={`${th} w-[25%]`}>時刻</th><th className={th}>場所</th></tr></thead>
          <tbody>
            {editing ? (
              <>
                {/* S1第五弾: 動的行。全行(空欄含む)をタップ標的にする */}
                {record.deliveries.map((d) => (
                  <tr key={d.id}>
                    <td className={td}><EditableCell editing={editing} fieldKey={deliveryFieldKey(d.id, "item")}>{d.item}</EditableCell></td>
                    <td className={`${td} text-center`}><EditableCell editing={editing} fieldKey={deliveryFieldKey(d.id, "time")}>{d.time}</EditableCell></td>
                    <td className={td}><EditableCell editing={editing} fieldKey={deliveryFieldKey(d.id, "place")}>{d.place}</EditableCell></td>
                  </tr>
                ))}
                {editing.onAddDeliveryRow && (
                  <tr>
                    <td colSpan={3} className={`${td} text-center`}>
                      <button
                        type="button"
                        data-zoompan-skip="1"
                        onClick={editing.onAddDeliveryRow}
                        className="min-h-[36px] rounded border border-dashed border-sky-400 bg-sky-50/70 px-3 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100"
                      >
                        ＋搬入出行を追加
                      </button>
                    </td>
                  </tr>
                )}
              </>
            ) : (
              <>
                {record.deliveries.filter((d) => d.item || d.time || d.place).map((d) => (
                  <tr key={d.id}><td className={td}>{d.item}</td><td className={`${td} text-center`}>{d.time}</td><td className={td}>{d.place}</td></tr>
                ))}
                {record.deliveries.every((d) => !d.item && !d.time && !d.place) && (<tr><td className={td}>&nbsp;</td><td className={td}></td><td className={td}></td></tr>)}
              </>
            )}
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <thead><tr><th className={th}>統括安全責任者コメント</th></tr></thead>
          <tbody><tr><td className={`${td} whitespace-pre-wrap`} style={{ height: "20mm" }}><EditableCell editing={editing} fieldKey="supervisorComment">{record.supervisorComment}</EditableCell></td></tr></tbody>
        </table>
      </div>

      {/* 点検項目8カテゴリ */}
      <table className="mt-1 w-full table-fixed border-collapse">
        <tbody>
          {chunk(record.checklist, 4).map((row, ri) => (
            <tr key={ri}>
              {row.map((cat) => (
                <td key={cat.key} className={`${td} w-1/4`}>
                  <EditableCell editing={editing} fieldKey={checklistFieldKey(cat.key)}>
                    <span className="font-bold">{cat.label}: </span>
                    {cat.items.map((it) => (
                      <span key={it.key} className="mr-1 whitespace-nowrap">{it.label}<span className="font-bold">{STATUS_MARK[it.status]}</span></span>
                    ))}
                  </EditableCell>
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
