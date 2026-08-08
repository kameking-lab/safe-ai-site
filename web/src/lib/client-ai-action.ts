import {
  inspectAiOutbound,
  type AiOutboundSafetyDecision,
  type AiOutboundSafetyInput,
} from "@/lib/ai-outbound-safety";

export type ClientAiActionResult<T> =
  | {
      sent: false;
      decision: Exclude<AiOutboundSafetyDecision, { allowed: true }>;
    }
  | { sent: true; value: T };

/**
 * Makes the browser-side safety decision and invokes the network action only
 * for an allowed payload. Keeping the check and action in one function makes
 * `fetch === 0` directly testable for every caller.
 */
export async function runClientAiAction<T>(
  safetyInput: AiOutboundSafetyInput,
  action: () => Promise<T>,
): Promise<ClientAiActionResult<T>> {
  const decision = inspectAiOutbound(safetyInput);
  if (!decision.allowed) return { sent: false, decision };
  return { sent: true, value: await action() };
}
