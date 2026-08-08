import { permanentRedirect } from "next/navigation";

export default function QuarantinedFeatureTourLayout() {
  permanentRedirect("/features");
}
