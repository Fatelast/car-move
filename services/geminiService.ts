import { GoogleGenAI, Type } from "@google/genai";
import { AIParsedRule } from "../types";

// Initialize the Gemini API client
// Note: In a real production app, ensure API_KEY is handled securely.
// For this environment, we use VITE_GEMINI_API_KEY.
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || process.env.GEMINI_API_KEY || 'AIzaSyAigxFqzj_IzICYOylHU9MfTqfElNabBTI';
const ai = new GoogleGenAI({ apiKey });

export const parseParkingRuleWithGemini = async (text: string): Promise<AIParsedRule | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Parse the following parking rule text and extract the billing interval (in minutes) and grace period (in minutes). 
      If the text says "hourly" or "per hour", interval is 60. "Half hour" is 30.
      If no grace period is mentioned, default to 0.
      Text: "${text}"`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            intervalMinutes: {
              type: Type.INTEGER,
              description: "The billing cycle length in minutes.",
            },
            gracePeriodMinutes: {
              type: Type.INTEGER,
              description: "Free parking duration in minutes at the start.",
            },
            explanation: {
              type: Type.STRING,
              description: "A very short explanation of how the AI understood the rule (max 10 words).",
            },
          },
          required: ["intervalMinutes", "gracePeriodMinutes", "explanation"],
        },
        thinkingConfig: { thinkingBudget: 0 } // Disable thinking for lowest latency
      },
    });

    const jsonText = response.text;
    if (!jsonText) return null;

    const result = JSON.parse(jsonText) as AIParsedRule;
    return result;
  } catch (error) {
    console.error("Error parsing parking rule with Gemini:", error);
    return null;
  }
};