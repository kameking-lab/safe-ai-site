"use client";

export function StrategyGate({ hasKeyAttempt }: { hasKeyAttempt: boolean }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <form
        method="GET"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">安全AIポータル 内部文書</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">月商100万円戦略 — パスワード保護</h1>
          <p className="mt-2 text-sm text-slate-600">
            この資料は閲覧制限されています。閲覧パスワードを入力してください。
          </p>
        </div>
        <label className="block text-sm font-medium text-slate-700">パスワード</label>
        <input
          type="password"
          name="key"
          autoFocus
          autoComplete="off"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {hasKeyAttempt && (
          <p className="mt-2 text-xs text-red-600">パスワードが違います</p>
        )}
        <button
          type="submit"
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        >
          表示する
        </button>
        <p className="mt-4 text-xs text-slate-500">
          このページは noindex 設定されており、検索エンジンには表示されません。
        </p>
      </form>
    </div>
  );
}
