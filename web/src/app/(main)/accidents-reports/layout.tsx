import { CopilotProvider } from "@/components/copilot/CopilotProvider";

export default function AccidentsReportsLayout({ children }: { children: React.ReactNode }) {
  return <CopilotProvider>{children}</CopilotProvider>;
}
