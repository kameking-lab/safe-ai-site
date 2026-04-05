import { Metadata } from "next";
import { BearMapClient } from "./bear-map-client";

export const metadata: Metadata = {
  title: "クマ出没マップ | ANZEN AI",
  description: "現場作業前にクマ出没情報を確認。2024〜2025年の主要目撃情報をマップで表示。",
};

export default function BearMapPage() {
  return <BearMapClient />;
}
