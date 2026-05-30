import { AIParsedRule } from "../types";

const PARSE_PARKING_RULE_URL = "/api/parse-parking-rule";

const getUserId = () => {
  const storageKey = "savemyparking:user-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const id =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(storageKey, id);
  return id;
};

export const parseParkingRuleWithGemini = async (text: string): Promise<AIParsedRule | null> => {
  try {
    const response = await fetch(PARSE_PARKING_RULE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": getUserId(),
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error("Parking rule parser request failed:", response.status);
      return null;
    }

    return (await response.json()) as AIParsedRule;
  } catch (error) {
    console.error("Error parsing parking rule:", error);
    return null;
  }
};
