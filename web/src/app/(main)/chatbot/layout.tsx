import { CopilotProvider } from "@/components/copilot/CopilotProvider";

export default function ChatbotLayout({ children }: { children: React.ReactNode }) {
  return <CopilotProvider>{children}</CopilotProvider>;
}
