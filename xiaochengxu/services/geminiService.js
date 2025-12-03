// services/geminiService.js

// Note: In WeChat Mini Program, you cannot use 'process.env'. 
// You should configure your API key here or fetch it from your backend.
// IMPORTANT: For production, do NOT hardcode API keys in the frontend. 
// This is for demonstration purposes or personal use.
const API_KEY = 'AIzaSyAigxFqzj_IzICYOylHU9MfTqfElNabBTI'; 

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

const parseParkingRuleWithGemini = (text) => {
  return new Promise((resolve) => {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
      },
      data: {
        contents: [{
          parts: [{
            text: `Parse the following parking rule text and extract the billing interval (in minutes) and grace period (in minutes). 
            If the text says "hourly" or "per hour", interval is 60. "Half hour" is 30.
            If no grace period is mentioned, default to 0.
            Text: "${text}"`
          }]
        }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              intervalMinutes: { type: "INTEGER" },
              gracePeriodMinutes: { type: "INTEGER" },
              explanation: { type: "STRING" }
            },
            required: ["intervalMinutes", "gracePeriodMinutes", "explanation"]
          }
        }
      },
      success: (res) => {
        try {
          if (res.statusCode === 200 && res.data && res.data.candidates && res.data.candidates.length > 0) {
            const jsonText = res.data.candidates[0].content.parts[0].text;
            const result = JSON.parse(jsonText);
            resolve(result);
          } else {
            console.error("Gemini API Error:", res);
            resolve(null);
          }
        } catch (e) {
          console.error("Failed to parse Gemini response:", e);
          resolve(null);
        }
      },
      fail: (err) => {
        console.error("Network Request Failed:", err);
        resolve(null);
      }
    });
  });
};

module.exports = {
  parseParkingRuleWithGemini
}
