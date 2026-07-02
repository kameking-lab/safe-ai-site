/**
 * KY全面再設計 P1-A: A4印刷用 KY用紙レイアウト（全建協/建災防様式に寄せた表組み＋確認印枠）。
 * 画面では既定で非表示。/ky/paper が print 時（hidden print:block）と印刷プレビューで描画する。
 *
 * F1（直接操作UI・方式確立）: 省略可能な `editing` prop を追加。
 * 指定時のみ各欄がタップ標的（EditableCell）になり、画面キャンバス（PaperStage）上で
 * 「紙をタップして書く」を成立させる。**`editing` 未指定の出力HTMLは従来と完全一致**
 * （ky-print-sheet.test.tsx のスナップショットで機械的に固定＝A4正式書式は不可侵）。
 */
import type { KyInstructionRecordState } from "@/lib/types/operations";
import type { ReactNode } from "react";
import { evalScore, riskGrade } from "@/lib/ky/pulldown-options";
import { KY_APPROVAL_LABEL } from "@/lib/ky/approval";
import { getKyPaperFieldDef, riskFieldKey, type KyPaperFieldKey } from "@/lib/ky/paper-fields";

const th = "border border-black bg-slate-100 px-1.5 py-1 text-left align-top font-bold whitespace-nowrap";
const td = "border border-black px-1.5 py-1 align-top";

export type KyPrintSheetEditing = {
  /** セル（欄）タップ時に呼ばれる */
  onTapField: (key: KyPaperFieldKey) => void;
  /** いま編集中の欄（青リング表示） */
  activeKey?: KyPaperFieldKey | null;
  /** 未記入の欄（うっすらアンバー＋点線表示） */
  emptyKeys?: ReadonlySet<string>;
  /** 危険行の追加ホットスポット（O10: 動的行）。省略時は「＋危険行を追加」を出さない。 */
  onAddRiskRow?: () => void;
};

/**
 * 欄の中身をタップ標的でラップする。editing 未指定時は中身をそのまま返す
 * （＝印刷/プレビュー経路のHTMLに1バイトも影響しない）。
 * 装飾はセル内側のオーバーレイのみで、表組みの罫線・寸法には触らない。
 */
function EditableCell({
  editing,
  fieldKey,
  children,
}: {
  editing: KyPrintSheetEditing | undefined;
  fieldKey: KyPaperFieldKey;
  children: ReactNode;
}) {
  if (!editing) return <>{children}</>;
  const label = getKyPaperFieldDef(fieldKey).label;
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
      className={`-mx-1.5 -my-1 min-h-[1.6em] cursor-pointer rounded-sm px-1.5 py-1 ${
        isActive
          ? "ring-2 ring-inset ring-sky-500"
          : isEmpty
            ? "border border-dashed border-amber-400 bg-amber-50/70"
            : "hover:bg-sky-50"
      }`}
    >
      {isEmpty ? <span className="text-[8pt] text-amber-700/80">タップして入力</span> : children}
    </div>
  );
}

export function KyPrintSheet({
  record,
  editing,
}: {
  record: KyInstructionRecordState;
  editing?: KyPrintSheetEditing;
}) {
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
            <td className={`${td} w-[32%]`}>
              <EditableCell editing={editing} fieldKey="siteName">{record.siteName}</EditableCell>
            </td>
            <th className={`${th} w-[18%]`}>工事名・工区</th>
            <td className={`${td} w-[32%]`}>
              <EditableCell editing={editing} fieldKey="projectName">{record.projectName}</EditableCell>
            </td>
          </tr>
          <tr>
            <th className={th}>作業日</th>
            <td className={td}>
              <EditableCell editing={editing} fieldKey="workDate">{dateStr}</EditableCell>
            </td>
            <th className={th}>天気・気温</th>
            <td className={td}>
              <EditableCell editing={editing} fieldKey="weatherTemp">{[record.weather, temp].filter(Boolean).join(" ")}</EditableCell>
            </td>
          </tr>
          <tr>
            <th className={th}>職長（リーダー）</th>
            <td className={td}>
              <EditableCell editing={editing} fieldKey="foremanName">{record.foremanName}</EditableCell>
            </td>
            <th className={th}>元請会社</th>
            <td className={td}>
              <EditableCell editing={editing} fieldKey="coop1Name">{record.coop1Name}</EditableCell>
            </td>
          </tr>
        </tbody>
      </table>

      {/* 作業内容 */}
      <table className="mt-1 w-full border-collapse">
        <tbody>
          <tr>
            <th className={`${th} w-[18%]`}>本日の作業内容</th>
            <td className={`${td} whitespace-pre-wrap`}>
              <EditableCell editing={editing} fieldKey="workDetail">{workDetail}</EditableCell>
            </td>
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
          {editing ? (
            <>
              {/* O10（続き）: 動的行。全行(空欄含む)をタップ標的にし、可能性/重大性はプルダウン付きエディタへ */}
              {record.riskRows.map((r, i) => {
                const score = evalScore(r.likelihood, r.severity);
                return (
                  <tr key={i}>
                    <td className={`${td} text-center`}>{r.targetLabel || i + 1}</td>
                    <td className={`${td} whitespace-pre-wrap`}>
                      <EditableCell editing={editing} fieldKey={riskFieldKey(i, "hazard")}>{r.hazard}</EditableCell>
                    </td>
                    <td className={`${td} text-center`}>
                      <EditableCell editing={editing} fieldKey={riskFieldKey(i, "eval")}>{r.likelihood}</EditableCell>
                    </td>
                    <td className={`${td} text-center`}>
                      <EditableCell editing={editing} fieldKey={riskFieldKey(i, "eval")}>{r.severity}</EditableCell>
                    </td>
                    <td className={`${td} text-center`}>{score}（{riskGrade(score).label}）</td>
                    <td className={`${td} whitespace-pre-wrap`}>
                      <EditableCell editing={editing} fieldKey={riskFieldKey(i, "reduction")}>{r.reduction}</EditableCell>
                    </td>
                  </tr>
                );
              })}
              {editing.onAddRiskRow && (
                <tr>
                  <td colSpan={6} className={`${td} text-center`}>
                    <button
                      type="button"
                      data-zoompan-skip="1"
                      onClick={editing.onAddRiskRow}
                      className="min-h-[36px] rounded border border-dashed border-sky-400 bg-sky-50/70 px-3 py-1 text-xs font-bold text-sky-800 hover:bg-sky-100"
                    >
                      ＋ 危険行を追加
                    </button>
                  </td>
                </tr>
              )}
            </>
          ) : risks.length === 0 ? (
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
            <td className={`${td} whitespace-pre-wrap`}>
              <EditableCell editing={editing} fieldKey="teamGoal">{record.teamGoal}</EditableCell>
            </td>
          </tr>
          <tr>
            <th className={th}>重点実施項目</th>
            <td className={`${td} whitespace-pre-wrap`}>
              <EditableCell editing={editing} fieldKey="priorityItems">{record.priorityItems}</EditableCell>
            </td>
          </tr>
          <tr>
            <th className={th}>指差呼称（ヨシ！）</th>
            <td className={td}>
              <EditableCell editing={editing} fieldKey="pointingCall">{record.pointingCall}</EditableCell>
            </td>
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
