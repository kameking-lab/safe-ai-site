import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import {
  parsePushSubscriptionBody,
  validatePushEndpoint,
} from "./push-subscription-validation";

const validKeys = {
  p256dh: Buffer.alloc(65, 7).toString("base64url"),
  auth: Buffer.alloc(16, 9).toString("base64url"),
};

describe("validatePushEndpoint", () => {
  it.each([
    "https://fcm.googleapis.com/fcm/send/token",
    "https://android.googleapis.com/gcm/send/token",
    "https://updates.push.services.mozilla.com/wpush/v2/token",
    "https://web.push.apple.com/Qtoken",
    "https://wns2-bl2p.notify.windows.com/w/?token=value",
    "https://fcm.googleapis.com:443/fcm/send/token",
  ])("accepts known browser push providers: %s", (endpoint) => {
    expect(validatePushEndpoint(endpoint)).toBeTruthy();
  });

  it.each([
    "http://fcm.googleapis.com/fcm/send/token",
    "https://fcm.googleapis.com:8443/fcm/send/token",
    "https://localhost/push/token",
    "https://127.0.0.1/push/token",
    "https://[::1]/push/token",
    "https://example.com/push/token",
    "https://fcm.googleapis.com.example.test/push/token",
    "https://evilfcm.googleapis.com/push/token",
    "https://evilpush.services.mozilla.com/push/token",
    "https://fcm.googleapis.com@127.0.0.1/push/token",
    "https://user:pass@fcm.googleapis.com/push/token",
    "https://fcm.googleapis.com./fcm/send/token",
    "https://fcm.googleapis.com/",
    "https://fcm.googleapis.com/fcm/send/token#fragment",
  ])("rejects unsafe or unapproved endpoints: %s", (endpoint) => {
    expect(validatePushEndpoint(endpoint)).toBeNull();
  });
});

describe("parsePushSubscriptionBody", () => {
  it("accepts and minimizes a valid browser subscription", () => {
    expect(
      parsePushSubscriptionBody({
        subscription: {
          endpoint: "https://web.push.apple.com/Qtoken",
          expirationTime: null,
          keys: validKeys,
          ignored: "not persisted",
        },
        prefecture: "JP-47",
        ignored: "not persisted",
      }),
    ).toEqual({
      endpoint: "https://web.push.apple.com/Qtoken",
      ...validKeys,
      prefecture: "JP-47",
    });
  });

  it.each([
    { subscription: null },
    { subscription: { endpoint: "https://fcm.googleapis.com/fcm/send/token", keys: null } },
    {
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/token",
        keys: { ...validKeys, p256dh: Buffer.alloc(64).toString("base64url") },
      },
    },
    {
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/token",
        keys: { ...validKeys, auth: Buffer.alloc(15).toString("base64url") },
      },
    },
    {
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/token",
        keys: validKeys,
      },
      prefecture: "JP-00",
    },
    {
      subscription: {
        endpoint: "https://fcm.googleapis.com/fcm/send/token",
        keys: validKeys,
      },
      prefecture: "JP-48",
    },
  ])("rejects malformed subscription input", (input) => {
    expect(parsePushSubscriptionBody(input)).toBeNull();
  });
});
