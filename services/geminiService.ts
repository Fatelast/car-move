import { AIParsedRule } from '../types';

const PARKING_RULE_API_URL = (import.meta.env.VITE_PARKING_RULE_API_URL || '').trim();

const parseParkingRulePayload = (payload: unknown): AIParsedRule | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const candidate = payload as Partial<AIParsedRule> & {
    data?: Partial<AIParsedRule>;
  };
  const normalized = candidate.data ?? candidate;
  const { intervalMinutes, gracePeriodMinutes, explanation } = normalized;

  if (
    typeof intervalMinutes !== 'number'
    || typeof gracePeriodMinutes !== 'number'
    || typeof explanation !== 'string'
  ) {
    return null;
  }

  return {
    intervalMinutes,
    gracePeriodMinutes,
    explanation,
  };
};

export const parseParkingRuleWithGemini = async (
  text: string,
): Promise<AIParsedRule | null> => {
  if (!PARKING_RULE_API_URL) {
    console.warn('Parking rule API is not configured, falling back to manual input.');
    return null;
  }

  try {
    const response = await fetch(PARKING_RULE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      console.error('Parking rule API returned a non-success status:', response.status);
      return null;
    }

    return parseParkingRulePayload(await response.json());
  } catch (error) {
    console.error('Error parsing parking rule:', error);
    return null;
  }
};
