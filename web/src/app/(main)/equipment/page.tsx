import { redirect } from "next/navigation";

// CR2-H3a: /equipment はインデックスページを持たず 404 だった（横断検索は
// /equipment/[id] の個別詳細へのみ深リンクする。/equipment 単体への導線は本来
// 存在しないが、手打ちナビゲーション等での到達に備えて保護具AIファインダーへ
// 恒久リダイレクトする）。
export default function EquipmentIndexPage(): never {
  redirect("/equipment-finder");
}
