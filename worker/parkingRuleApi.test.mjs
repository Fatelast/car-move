import assert from "node:assert/strict";
import test from "node:test";
import { createParkingRuleHandler } from "./parkingRuleApi.js";

const jsonRequest = (body, headers = {}) =>
  new Request("https://example.com/api/parse-parking-rule", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": "203.0.113.10",
      "x-user-id": "user-1",
      ...headers,
    },
    body: JSON.stringify(body),
  });

test("parses a parking rule through Gemini and returns normalized JSON", async () => {
  const handler = createParkingRuleHandler({
    now: () => 1_000,
    logger: { info() {}, warn() {}, error() {} },
    fetch: async () =>
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      intervalMinutes: 60,
                      gracePeriodMinutes: 15,
                      explanation: "Hourly with grace",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
  });

  const response = await handler(jsonRequest({ text: "15 minutes free, then hourly" }), {
    GEMINI_API_KEY: "server-only-key",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(body, {
    intervalMinutes: 60,
    gracePeriodMinutes: 15,
    explanation: "Hourly with grace",
  });
});

test("rejects invalid requests with a stable error code", async () => {
  const handler = createParkingRuleHandler({
    now: () => 1_000,
    logger: { info() {}, warn() {}, error() {} },
    fetch: async () => {
      throw new Error("should not call Gemini");
    },
  });

  const response = await handler(jsonRequest({ text: "" }), {
    GEMINI_API_KEY: "server-only-key",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.deepEqual(body, {
    error: {
      code: "INVALID_REQUEST",
      message: "Parking rule text is required.",
    },
  });
});

test("rate limits by both IP and user identity", async () => {
  let calls = 0;
  const handler = createParkingRuleHandler({
    now: () => 1_000,
    limits: { windowMs: 60_000, maxRequests: 1 },
    logger: { info() {}, warn() {}, error() {} },
    fetch: async () => {
      calls += 1;
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      intervalMinutes: 30,
                      gracePeriodMinutes: 0,
                      explanation: "Half hour",
                    }),
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      );
    },
  });

  const first = await handler(jsonRequest({ text: "half hour" }), {
    GEMINI_API_KEY: "server-only-key",
  });
  const second = await handler(
    jsonRequest({ text: "hourly" }, { "cf-connecting-ip": "203.0.113.11" }),
    { GEMINI_API_KEY: "server-only-key" },
  );

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(calls, 1);
  assert.deepEqual(await second.json(), {
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
  });
});

test("maps Gemini failures without leaking upstream details", async () => {
  const logs = [];
  const handler = createParkingRuleHandler({
    now: () => 1_000,
    logger: {
      info() {},
      warn(event) {
        logs.push(event);
      },
      error() {},
    },
    fetch: async () =>
      new Response(JSON.stringify({ error: { message: "key=secret-token" } }), {
        status: 403,
      }),
  });

  const response = await handler(jsonRequest({ text: "hourly" }), {
    GEMINI_API_KEY: "server-only-key",
  });
  const body = await response.json();

  assert.equal(response.status, 502);
  assert.deepEqual(body, {
    error: {
      code: "AI_UNAVAILABLE",
      message: "AI parsing is temporarily unavailable.",
    },
  });
  assert.equal(JSON.stringify(logs).includes("secret-token"), false);
});
