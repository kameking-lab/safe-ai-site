import { permanentRedirect } from "next/navigation";

/** パンくずや旧ブックマークから到達する戦略ハブを、現行の年次計画へ正規化する。 */
export default function StrategyPage() {
  permanentRedirect("/strategy/plan-generator");
}
