import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import { getAutomationConsultAvailability } from "@/lib/automation-consult/availability";
import {
  deliverAutomationConsultEmails,
  formatAutomationConsultJst,
} from "@/lib/automation-consult/email";
import {
  automationConsultQueueConfiguration,
  markAutomationConsultTicketProviderAccepted,
  readAutomationConsultTicketPayload,
} from "@/lib/automation-consult/queue";
import {
  automationConsultSchema,
  type AutomationConsultInput,
} from "@/lib/automation-consult/schema";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import { getAdminAccess } from "@/lib/server/admin-access";
import { privateJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;

export async function POST(
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
      routeKey: "admin.automation-consult-queue.send",
      limit: 6,
      windowMs: 60_000,
    },
    { subject: access.userId },
  );
  if (rateLimit) return rateLimit;
  const { ticketId } = await context.params;
  if (!IDENTIFIER.test(ticketId)) {
    return privateJson({ ok: false, reason: "ticket_not_found" }, 404);
  }
  const availability = getAutomationConsultAvailability();
  const queueConfiguration = automationConsultQueueConfiguration();
  if (
    availability.intakeMode !== "email" ||
    !queueConfiguration.ok ||
    !prisma
  ) {
    return privateJson({ ok: false, reason: "provider_not_ready" }, 503);
  }
  try {
    const ticket = await readAutomationConsultTicketPayload<AutomationConsultInput>(
      prisma as unknown as GovernanceDatabase,
      { ticketId, secret: queueConfiguration.secret },
    );
    if (!ticket) {
      return privateJson({ ok: false, reason: "ticket_not_found" }, 404);
    }
    if (ticket.emailDeliveryStatus === "provider-accepted") {
      return privateJson({
        ok: true,
        providerAccepted: true,
        replayed: true,
      });
    }
    const parsed = automationConsultSchema.safeParse(ticket.payload);
    if (!parsed.success) {
      return privateJson({ ok: false, reason: "stored_payload_invalid" }, 422);
    }
    const delivery = await deliverAutomationConsultEmails({
      consultation: parsed.data,
      referenceId: ticket.referenceId,
      submissionStartedAtJst: formatAutomationConsultJst(ticket.createdAt),
      idempotencyKey: `queue-${ticketId}`,
    });
    if (!delivery.delivered) {
      return privateJson({ ok: false, reason: "provider_delivery_failed" }, 503);
    }
    const marked = await markAutomationConsultTicketProviderAccepted(
      prisma as unknown as GovernanceDatabase,
      { ticketId, actorUserId: access.userId },
    );
    return privateJson({
      ok: true,
      providerAccepted: true,
      duplicate: false,
      stateRecorded: marked,
    });
  } catch {
    return privateJson({ ok: false, reason: "provider_delivery_failed" }, 503);
  }
}
