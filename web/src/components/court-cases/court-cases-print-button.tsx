"use client";

export function CourtCasesPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-[44px] rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 print:hidden"
    >
      🖨 この一覧を印刷 / PDF保存
    </button>
  );
}
