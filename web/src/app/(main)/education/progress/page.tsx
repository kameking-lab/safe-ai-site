import { permanentRedirect } from "next/navigation";

/**
 * 永続的な受講時間・学習進捗UIは廃止した。
 * 既存の端末・組織データは変更せず、この公開routeから参照もしない。
 */
export default function RetiredTrainingProgressPage(): never {
  permanentRedirect("/e-learning");
}
