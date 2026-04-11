import type { Metadata } from "next";
import { ChemicalRaPanel } from "@/components/chemical-ra-panel";

export const metadata: Metadata = {
  title: "化学物質リスクアセスメント",
  description: "化学物質名を入力するとSDS情報・GHS分類・必要保護具・安全対策チェックリストを表示します。厚労省「職場のあんぜんサイト」参考。",
};

export default function ChemicalRaPage() {
  return <ChemicalRaPanel />;
}
