export type SharedChatMessage = {
  r: "u" | "a";
  c: string;
  s?: { l: string; a: string }[];
};

/**
 * Conversation text must never be encoded into a URL, including its fragment.
 * Keep these exports as fail-closed compatibility shims for older callers.
 */
export function encodeChatbotShareFragment(
  _messages: SharedChatMessage[],
): null {
  return null;
}

export function decodeChatbotShareFragment(
  _fragment: string,
): null {
  return null;
}

export function buildChatbotFragmentShareUrl(
  _origin: string,
  _messages: SharedChatMessage[],
): null {
  return null;
}
