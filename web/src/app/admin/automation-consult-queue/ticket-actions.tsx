"use client";

import { useState } from "react";

type TicketDetail = {
  referenceId: string;
  consultation: Record<string, unknown>;
};

export function AutomationConsultTicketActions({
  ticketId,
  initialStatus,
  initialAssignee,
}: {
  ticketId: string;
  initialStatus: string;
  initialAssignee: string | null;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [assignedUserId, setAssignedUserId] = useState(initialAssignee ?? "");
  const [internalNote, setInternalNote] = useState("");
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadDetail() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/automation-consult-queue/${encodeURIComponent(ticketId)}`,
        { cache: "no-store", credentials: "same-origin" },
      );
      const payload = (await response.json()) as TicketDetail & {
        ok?: boolean;
        reason?: string;
      };
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.reason ?? "detail_failed");
      }
      setDetail(payload);
      setMessage("内容を一時表示しました。画面を離れると消えます。");
    } catch {
      setMessage("内容を表示できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/automation-consult-queue", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId,
          status,
          assignedUserId: assignedUserId.trim() || null,
          internalNote: internalNote.trim() || null,
        }),
      });
      if (!response.ok) throw new Error("update_failed");
      setInternalNote("");
      setMessage("状態・担当・暗号化内部メモを更新しました。");
    } catch {
      setMessage("更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function sendWaitingEmail() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        `/api/admin/automation-consult-queue/${encodeURIComponent(ticketId)}/send`,
        { method: "POST", credentials: "same-origin" },
      );
      const payload = (await response.json()) as {
        providerAccepted?: boolean;
        reason?: string;
      };
      if (!response.ok || !payload.providerAccepted) {
        throw new Error(payload.reason ?? "send_failed");
      }
      setMessage("provider acceptedを確認しました。受信箱到達は別途確認が必要です。");
    } catch {
      setMessage("provider未準備、または送信を確認できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function deleteContent() {
    if (!window.confirm("相談本文と内部メモを復元不能な状態へ削除しますか。")) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/automation-consult-queue", {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId }),
      });
      if (!response.ok) throw new Error("delete_failed");
      setDetail(null);
      setMessage("相談本文と内部メモを削除しました。");
    } catch {
      setMessage("削除できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={loadDetail}
          disabled={busy}
          className="min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-bold"
        >
          内容を一時表示
        </button>
        <button
          type="button"
          onClick={sendWaitingEmail}
          disabled={busy}
          className="min-h-11 rounded-lg border border-blue-700 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950"
        >
          provider追加後に送信
        </button>
        <button
          type="button"
          onClick={deleteContent}
          disabled={busy}
          className="min-h-11 rounded-lg border border-rose-700 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-950"
        >
          内容を削除
        </button>
      </div>
      {detail ? (
        <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs">
          {JSON.stringify(detail.consultation, null, 2)}
        </pre>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs font-bold">
          状態
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 bg-white px-2"
          >
            {["queued", "reviewing", "assigned", "waiting-provider", "closed"].map(
              (value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="text-xs font-bold">
          担当user ID
          <input
            value={assignedUserId}
            onChange={(event) => setAssignedUserId(event.target.value)}
            maxLength={64}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 px-2"
          />
        </label>
        <label className="text-xs font-bold">
          内部メモ（暗号化）
          <input
            value={internalNote}
            onChange={(event) => setInternalNote(event.target.value)}
            maxLength={2_000}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-400 px-2"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white"
      >
        管理状態を保存
      </button>
      {message ? (
        <p role="status" className="text-xs font-bold text-slate-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
