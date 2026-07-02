import Link from "next/link";

/** E-E-A-T監修者表記。氏名は開示せず資格・登録番号で信頼性を示す（/about運用方針に準拠）。 */
export const SUPERVISOR_NAME = "労働安全衛生コンサルタント（登録番号260022）";

export function SupervisorByline({
  className = "text-emerald-700 hover:underline",
}: {
  className?: string;
}) {
  return (
    <Link href="/about" className={className}>
      {SUPERVISOR_NAME}
    </Link>
  );
}
