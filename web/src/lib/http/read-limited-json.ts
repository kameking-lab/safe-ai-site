export type LimitedJsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; reason: "payload_too_large" | "invalid_json" };

/**
 * Reads a JSON request without allowing Request.json() to buffer an
 * unbounded body. Both declared and streamed byte counts are enforced.
 */
export async function readLimitedJson(
  request: Request,
  maxBodyBytes: number,
): Promise<LimitedJsonReadResult> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const parsedLength = Number(declaredLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0 ||
      parsedLength > maxBodyBytes
    ) {
      return { ok: false, reason: "payload_too_large" };
    }
  }

  let raw = "";
  try {
    if (request.body) {
      const reader = request.body.getReader();
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let receivedBytes = 0;
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        receivedBytes += chunk.value.byteLength;
        if (receivedBytes > maxBodyBytes) {
          await reader.cancel();
          return { ok: false, reason: "payload_too_large" };
        }
        raw += decoder.decode(chunk.value, { stream: true });
      }
      raw += decoder.decode();
    }
  } catch {
    return { ok: false, reason: "invalid_json" };
  }

  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
