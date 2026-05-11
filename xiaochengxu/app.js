// app.js
let localConfig = {}

try {
  localConfig = require('./config')
} catch (error) {
  console.warn('Local config not found, AI parsing disabled.')
}

App({
  globalData: {
    config: {
      parkingRuleApiUrl: localConfig.parkingRuleApiUrl || ''
    }
  },
  onLaunch: function () {
    console.log('App Launch')
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  }
})
