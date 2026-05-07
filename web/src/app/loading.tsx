import { Mascot } from "@/components/mascot";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 py-12">
      <div className="animate-pulse">
        <Mascot size="md" alt="読み込み中" />
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">読み込み中…</p>
    </div>
  );
}
