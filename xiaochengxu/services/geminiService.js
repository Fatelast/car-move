// services/geminiService.js

const getApiUrl = () => {
  const app = getApp()
  return (app?.globalData?.config?.parkingRuleApiUrl || '').trim()
}

const normalizePayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = payload.data || payload
  if (
    typeof candidate.intervalMinutes !== 'number'
    || typeof candidate.gracePeriodMinutes !== 'number'
    || typeof candidate.explanation !== 'string'
  ) {
    return null
  }

  return {
    intervalMinutes: candidate.intervalMinutes,
    gracePeriodMinutes: candidate.gracePeriodMinutes,
    explanation: candidate.explanation
  }
}

const parseParkingRuleWithGemini = (text) => {
  return new Promise((resolve) => {
    const apiUrl = getApiUrl()
    if (!apiUrl) {
      console.warn('Parking rule API is not configured, falling back to manual input.')
      resolve(null)
      return
    }

    wx.request({
      url: apiUrl,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: { text },
      success: (res) => {
        try {
          if (res.statusCode === 200) {
            resolve(normalizePayload(res.data))
            return
          }

          console.error('Parking rule API error:', res)
          resolve(null)
        } catch (e) {
          console.error('Failed to parse parking rule response:', e)
          resolve(null)
        }
      },
      fail: (err) => {
        console.error('Network request failed:', err)
        resolve(null)
      }
    })
  })
}

module.exports = {
  parseParkingRuleWithGemini
}
