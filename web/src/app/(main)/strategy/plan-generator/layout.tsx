import { permanentRedirect } from "next/navigation";

export default function PlanGeneratorLayout() {
  // An explicit empty fragment prevents user-supplied fragments on the
  // quarantined URL from being inherited by the browser after the redirect.
  permanentRedirect("/about/quality#");
}
