const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const DEFAULT_LIMITS = {
  windowMs: 60_000,
  maxRequests: 20,
};

const jsonResponse = (status, body, extraHeaders = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...extraHeaders,
    },
  });

const errorResponse = (status, code, message, extraHeaders) =>
  jsonResponse(status, { error: { code, message } }, extraHeaders);

const normalizeIdentity = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 128) : fallback;
};

const getClientIdentity = (request) => {
  const ip = normalizeIdentity(
    request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for")?.split(",")[0],
    "unknown-ip",
  );
  const user = normalizeIdentity(request.headers.get("x-user-id"), `anonymous:${ip}`);
  return { ip, user };
};

const hashForLog = async (value) => {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .slice(0, 8)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const cleanupBuckets = (buckets, now) => {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

const checkLimit = (buckets, identity, limits, now) => {
  cleanupBuckets(buckets, now);
  const keys = [`ip:${identity.ip}`, `user:${identity.user}`];

  for (const key of keys) {
    const bucket = buckets.get(key);
    if (bucket && bucket.count >= limits.maxRequests && bucket.resetAt > now) {
      return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
    }
  }

  for (const key of keys) {
    const bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + limits.windowMs });
    } else {
      bucket.count += 1;
    }
  }

  return { allowed: true };
};

const buildGeminiRequest = (text) => ({
  contents: [
    {
      parts: [
        {
          text: `Parse the following parking rule text and extract the billing interval (in minutes) and grace period (in minutes).
If the text says "hourly" or "per hour", interval is 60. "Half hour" is 30.
If no grace period is mentioned, default to 0.
Text: "${text}"`,
        },
      ],
    },
  ],
  generationConfig: {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        intervalMinutes: {
          type: "INTEGER",
          description: "The billing cycle length in minutes.",
        },
        gracePeriodMinutes: {
          type: "INTEGER",
          description: "Free parking duration in minutes at the start.",
        },
        explanation: {
          type: "STRING",
          description: "A very short explanation of how the AI understood the rule (max 10 words).",
        },
      },
      required: ["intervalMinutes", "gracePeriodMinutes", "explanation"],
    },
    thinkingConfig: { thinkingBudget: 0 },
  },
});

const parseGeminiJson = (data) => {
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Missing Gemini response text");
  }

  const result = JSON.parse(text);
  if (
    !Number.isInteger(result.intervalMinutes) ||
    !Number.isInteger(result.gracePeriodMinutes) ||
    typeof result.explanation !== "string"
  ) {
    throw new Error("Invalid Gemini response shape");
  }

  return {
    intervalMinutes: result.intervalMinutes,
    gracePeriodMinutes: result.gracePeriodMinutes,
    explanation: result.explanation,
  };
};

const readRequestText = async (request) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!body || typeof body.text !== "string") return null;
  const text = body.text.trim();
  if (!text || text.length > 2_000) return null;
  return text;
};

export const createParkingRuleHandler = ({
  now = () => Date.now(),
  limits = DEFAULT_LIMITS,
  fetch: fetchImpl = fetch,
  logger = console,
} = {}) => {
  const buckets = new Map();

  return async (request, env = {}) => {
    const identity = getClientIdentity(request);
    const logContext = {
      route: "/api/parse-parking-rule",
      method: request.method,
      ipHash: await hashForLog(identity.ip),
      userHash: await hashForLog(identity.user),
    };

    if (request.method !== "POST") {
      return errorResponse(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
    }

    if (!env.GEMINI_API_KEY) {
      logger.error({ ...logContext, status: 500, code: "CONFIGURATION_ERROR" });
      return errorResponse(500, "CONFIGURATION_ERROR", "AI parsing is not configured.");
    }

    const limited = checkLimit(buckets, identity, limits, now());
    if (!limited.allowed) {
      logger.warn({ ...logContext, status: 429, code: "RATE_LIMITED" });
      return errorResponse(429, "RATE_LIMITED", "Too many requests. Please try again later.", {
        "retry-after": String(limited.retryAfterSeconds),
      });
    }

    const text = await readRequestText(request);
    if (!text) {
      logger.warn({ ...logContext, status: 400, code: "INVALID_REQUEST" });
      return errorResponse(400, "INVALID_REQUEST", "Parking rule text is required.");
    }

    try {
      const geminiResponse = await fetchImpl(GEMINI_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY,
        },
        body: JSON.stringify(buildGeminiRequest(text)),
      });

      if (!geminiResponse.ok) {
        logger.warn({
          ...logContext,
          status: 502,
          code: "AI_UNAVAILABLE",
          upstreamStatus: geminiResponse.status,
        });
        return errorResponse(502, "AI_UNAVAILABLE", "AI parsing is temporarily unavailable.");
      }

      const result = parseGeminiJson(await geminiResponse.json());
      logger.info({ ...logContext, status: 200 });
      return jsonResponse(200, result);
    } catch (error) {
      logger.warn({
        ...logContext,
        status: 502,
        code: "AI_BAD_RESPONSE",
        reason: error instanceof Error ? error.name : "UnknownError",
      });
      return errorResponse(502, "AI_UNAVAILABLE", "AI parsing is temporarily unavailable.");
    }
  };
};
