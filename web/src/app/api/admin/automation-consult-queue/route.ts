import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { GovernanceDatabase } from "@/lib/chemical/ra-governance-repository";
import {
  automationConsultQueueConfiguration,
  deleteAutomationConsultTicket,
  listAutomationConsultQueue,
  updateAutomationConsultTicket,
} from "@/lib/automation-consult/queue";
import { sharedRateLimitGuard } from "@/lib/security/shared-state";
import { getAdminAccess } from "@/lib/server/admin-access";
import { privateJson, readBoundedJson } from "@/lib/server/cloud-owner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const IDENTIFIER = /^[A-Za-z0-9_-]{1,64}$/;
const updateSchema = z
  .object({
    ticketId: z.string().regex(IDENTIFIER),
    status: z.enum([
      "queued",
      "reviewing",
      "assigned",
      "waiting-provider",
      "closed",
    ]),
    assignedUserId: z.string().regex(IDENTIFIER).nullable(),
    internalNote: z.string().trim().max(2_000).nullable(),
  })
  .strict();
const deleteSchema = z.object({ ticketId: z.string().regex(IDENTIFIER) }).strict();

async function authorizeAndLimit(request: Request) {
  const access = await getAdminAccess();
  if (!access.ok) {
    return {
      ok: false as const,
      response: privateJson({ ok: false, reason: "not_found" }, 404),
    };
  }
  const limit = await sharedRateLimitGuard(
    request,
    {
      routeKey: "admin.automation-consult-queue",
      limit: 60,
      windowMs: 60_000,
    },
    { subject: access.userId },
  );
  return limit
    ? { ok: false as const, response: limit }
    : { ok: true as const, access };
}

export async function GET(request: Request): Promise<Response> {
  const authorized = await authorizeAndLimit(request);
  if (!authorized.ok) return authorized.response;
  if (new URL(request.url).searchParams.get("format") === "csv") {
    return privateJson({ ok: false, reason: "export_disabled" }, 403);
  }
  if (!prisma) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  try {
    const rows = await listAutomationConsultQueue(
      prisma as unknown as GovernanceDatabase,
    );
    return privateJson({ ok: true, tickets: rows });
  } catch {
    return privateJson({ ok: false, reason: "queue_unavailable" }, 503);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const authorized = await authorizeAndLimit(request);
  if (!authorized.ok) return authorized.response;
  const configuration = automationConsultQueueConfiguration();
  if (!configuration.ok || !prisma) {
    return privateJson({ ok: false, reason: "queue_unavailable" }, 503);
  }
  const body = await readBoundedJson(request, 8 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = updateSchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  try {
    const updated = await updateAutomationConsultTicket(
      prisma as unknown as GovernanceDatabase,
      {
        ...parsed.data,
        actorUserId: authorized.access.userId,
        secret: configuration.secret,
        keyVersion: configuration.keyVersion,
      },
    );
    return updated
      ? privateJson({ ok: true })
      : privateJson({ ok: false, reason: "ticket_not_found" }, 404);
  } catch {
    return privateJson({ ok: false, reason: "update_failed" }, 503);
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const authorized = await authorizeAndLimit(request);
  if (!authorized.ok) return authorized.response;
  if (!prisma) {
    return privateJson({ ok: false, reason: "database_unavailable" }, 503);
  }
  const body = await readBoundedJson(request, 4 * 1_024);
  if (!body.ok) return privateJson({ ok: false, reason: body.reason }, 400);
  const parsed = deleteSchema.safeParse(body.value);
  if (!parsed.success) {
    return privateJson({ ok: false, reason: "invalid_input" }, 400);
  }
  try {
    const deleted = await deleteAutomationConsultTicket(
      prisma as unknown as GovernanceDatabase,
      {
        ticketId: parsed.data.ticketId,
        actorUserId: authorized.access.userId,
      },
    );
    return deleted
      ? privateJson({ ok: true, contentDeleted: true })
      : privateJson({ ok: false, reason: "ticket_not_found" }, 404);
  } catch {
    return privateJson({ ok: false, reason: "delete_failed" }, 503);
  }
}
