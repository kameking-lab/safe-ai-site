import { NextResponse } from "next/server";
import { buildMockChatReply } from "@/data/mock/chat-responses";
import type {
  ChatApiRequest,
  ChatApiResponse,
  ApiErrorResponse,
} from "@/lib/types/api";

function parseDelay(value: string | null, fallbackMs: number): number {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallbackMs;
  }
  return parsed;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function jsonError(status: number, code: ApiErrorResponse["error"]["code"], message: string) {
  return NextResponse.json<ApiErrorResponse>(
    {
      error: {
        code,
        message,
        retryable: status >= 500,
      },
    },
    { status }
  );
}

function resolveForceError(requestUrl: URL, request: Request) {
  return requestUrl.searchParams.get("forceError") ?? request.headers.get("x-force-error");
}

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const delayMs = parseDelay(requestUrl.searchParams.get("delayMs"), 0);
  const forceError = resolveForceError(requestUrl, request);

  if (delayMs > 0) {
    await wait(delayMs);
  }

  if (forceError === "timeout") {
    await wait(5000);
  }

  if (forceError === "5xx") {
    return jsonError(503, "UNAVAILABLE", "チャットAPIが一時的に利用できません。");
  }

  if (forceError === "validation") {
    return jsonError(400, "VALIDATION", "チャットの入力形式が不正です。");
  }

  let body: ChatApiRequest | null = null;
  try {
    body = (await request.json()) as ChatApiRequest;
  } catch {
    return jsonError(400, "VALIDATION", "リクエストボディのJSON形式が不正です。");
  }

  if (!body?.question?.trim()) {
    return jsonError(400, "VALIDATION", "質問文を入力してください。");
  }

  const revisionTitle = body.revisionTitle?.trim() || "選択中の法改正";
  const response: ChatApiResponse = {
    reply: buildMockChatReply(revisionTitle, body.question.trim()),
  };

  return NextResponse.json(response, { status: 200 });
}
