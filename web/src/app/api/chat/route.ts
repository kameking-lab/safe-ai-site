import { NextResponse } from "next/server";
import { buildMockChatReply } from "@/data/mock/chat-responses";
import type {
  ChatApiRequest,
  ChatApiResponse,
  ApiErrorResponse,
} from "@/lib/types/api";

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
  const forceError = resolveForceError(requestUrl, request);

  if (forceError === "5xx") {
    return jsonError(503, "UNAVAILABLE", "チャットAPIが一時的に利用できません。");
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
