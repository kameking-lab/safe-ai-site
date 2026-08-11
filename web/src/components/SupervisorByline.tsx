import Link from "next/link";

/** 公開ページで共通利用する編集主体とプロジェクト監修の表記。 */
export const SUPERVISOR_NAME =
  "安全AIポータル編集部｜労働安全コンサルタント監修";

export function SupervisorByline({
  className = "text-emerald-700 hover:underline",
}: {
  className?: string;
}) {
  return (
    <Link href="/about/project-story" className={className}>
      {SUPERVISOR_NAME}
    </Link>
  );
}
