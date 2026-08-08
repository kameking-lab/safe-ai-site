import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * 個別商品データは一次資料確認が完了していないため、公開URLを生成しない。
 * データを削除せず隔離し、確認済みレコードのみを将来明示的に戻せる境界とする。
 */
export function generateStaticParams(): { id: string }[] {
  return [];
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: "保護具商品情報（公開停止）",
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function EquipmentDetailPage(): never {
  notFound();
}
