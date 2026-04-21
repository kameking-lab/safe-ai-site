import { redirect } from "next/navigation";

// /feedback はお問い合わせフォームに一本化した。
// Google フォーム埋め込みは廃止し、/contact へ恒久リダイレクトする。
export default function FeedbackPage(): never {
  redirect("/contact?category=demo");
}
