import Link from "next/link";

/**
 * 公開ページの編集主体表記。第三者が検証できる資格台帳・個別の確認記録が
 * そろうまでは、個人資格や「監修済み」を権威シグナルとして表示しない。
 */
export const SUPERVISOR_NAME =
  "安全AIポータル編集部（確認状態は各ページに表示）";

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
