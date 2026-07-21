import { CopilotProvider } from "@/components/copilot/CopilotProvider";

export default function PlanGeneratorLayout({ children }: { children: React.ReactNode }) {
  return <CopilotProvider>{children}</CopilotProvider>;
}
