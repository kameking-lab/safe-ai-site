import { redirect } from "next/navigation";

// CR2-H3a: /equipment はインデックスページを持たず 404 だった（横断検索は
// 個別商品カタログは隔離中。手打ちナビゲーションは、商品適合を断定しない
// 安全用品カテゴリへ送る。
export default function EquipmentIndexPage(): never {
  redirect("/goods");
}
