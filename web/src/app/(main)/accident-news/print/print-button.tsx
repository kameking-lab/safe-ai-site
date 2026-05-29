"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="min-h-[40px] rounded-lg bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 print:hidden"
    >
      🖨 印刷 / PDF保存
    </button>
  );
}
