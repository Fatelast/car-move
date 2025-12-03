// app.js
App({
  onLaunch: function () {
    console.log('App Launch')
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  }
})
