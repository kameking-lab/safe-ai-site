import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import {
  automationConsultQueueConfiguration,
  readAutomationConsultTicketPayload,
} from "@/lib/automation-consult/queue";
import { automationConsultSchema } from "@/lib/automation-consult/schema";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import { getAdminAccess } from "@/lib/server/admin-access";
import { privateJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;

export async function GET(
  request: Request,
  context: { params: Promise<{ ticketId: string }> },
): Promise<Response> {
  const access = await getAdminAccess();
  if (!access.ok) {
    return privateJson({ ok: false, reason: "not_found" }, 404);
  }
  const rateLimit = await sharedRateLimitGuard(
    request,
    {
      routeKey: "admin.automation-consult-queue.detail",
      limit: 30,
      windowMs: 60_000,
    },
    { subject: access.userId },
  );
  if (rateLimit) return rateLimit;
  const { ticketId } = await context.params;
  const configuration = automationConsultQueueConfiguration();
  if (!IDENTIFIER.test(ticketId) || !configuration.ok || !prisma) {
    return privateJson({ ok: false, reason: "ticket_not_found" }, 404);
  }
  try {
    const ticket = await readAutomationConsultTicketPayload<unknown>(
      prisma as unknown as GovernanceDatabase,
      { ticketId, secret: configuration.secret },
    );
    if (!ticket) {
      return privateJson({ ok: false, reason: "ticket_not_found" }, 404);
    }
    const parsed = automationConsultSchema.safeParse(ticket.payload);
    if (!parsed.success) {
      return privateJson({ ok: false, reason: "stored_payload_invalid" }, 422);
    }
    return privateJson({
      ok: true,
      referenceId: ticket.referenceId,
      createdAt: ticket.createdAt,
      consultation: parsed.data,
      warning:
        "管理者確認専用です。本文をログ・分析・生成AIへ転送しないでください。",
    });
  } catch {
    return privateJson({ ok: false, reason: "detail_unavailable" }, 503);
  }
}
