// services/geminiService.js

const API_URL = 'https://your-worker-domain.example.com/api/parse-parking-rule';
const USER_ID_STORAGE_KEY = 'savemyparking:user-id';

const getUserId = () => {
  let userId = wx.getStorageSync(USER_ID_STORAGE_KEY);
  if (!userId) {
    userId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    wx.setStorageSync(USER_ID_STORAGE_KEY, userId);
  }
  return userId;
};

const parseParkingRuleWithGemini = (text) => {
  return new Promise((resolve) => {
    wx.request({
      url: API_URL,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'X-User-Id': getUserId(),
      },
      data: { text },
      success: (res) => {
        if (res.statusCode === 200 && res.data) {
          resolve(res.data);
          return;
        }

        console.error('Parking rule parser request failed:', res.statusCode);
        resolve(null);
      },
      fail: (err) => {
        console.error('Network Request Failed:', err);
        resolve(null);
      }
    });
  });
};

module.exports = {
  parseParkingRuleWithGemini
};
