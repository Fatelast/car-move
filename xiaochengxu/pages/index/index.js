// index.js
const { formatTime } = require('../../utils/util')

const app = getApp()

Page({
  data: {
    currentView: 'home', // 'home' | 'history'
    config: null,
    history: [],
  },

  onLoad() {
    this.loadData();
  },

  loadData() {
    const savedConfig = wx.getStorageSync('savemyparking_config');
    const savedHistory = wx.getStorageSync('savemyparking_history');

    if (savedConfig) {
      try {
        // Check if config is valid (e.g. has startTime)
        if (savedConfig.startTime) {
           this.setData({ config: savedConfig });
        }
      } catch (e) {
        console.error("Failed to parse config", e);
      }
    }

    if (savedHistory) {
      this.setData({ history: savedHistory });
    }
  },

  handleStart(e) {
    const newConfig = e.detail;
    this.setData({ config: newConfig });
    wx.setStorageSync('savemyparking_config', newConfig);
    
    // Request subscription message permission if needed (optional)
  },

  handleStop() {
    const config = this.data.config;
    if (config) {
      const endTime = Date.now();
      const durationMs = endTime - config.startTime;
      const intervalMs = config.intervalMinutes * 60 * 1000;
      const isFree = durationMs < (config.gracePeriodMinutes * 60 * 1000);
      const cycles = isFree ? 0 : Math.ceil(durationMs / intervalMs);
      const unitCost = config.cycleCost || 5;
      const totalCost = cycles * unitCost;

      const newRecord = {
        id: Date.now().toString(),
        startTime: config.startTime,
        endTime: endTime,
        locationName: config.locationName,
        intervalMinutes: config.intervalMinutes,
        totalDurationMs: durationMs,
        costCycleCount: cycles,
        cycleCost: unitCost,
        totalCost: totalCost
      };

      const updatedHistory = [...this.data.history, newRecord];
      this.setData({ 
        history: updatedHistory,
        config: null 
      });
      
      wx.setStorageSync('savemyparking_history', updatedHistory);
      wx.removeStorageSync('savemyparking_config');
    }
  },

  handleViewHistory() {
    this.setData({ currentView: 'history' });
  },

  handleBackToHome() {
    this.setData({ currentView: 'home' });
  },

  handleClearHistory() {
    this.setData({ history: [] });
    wx.removeStorageSync('savemyparking_history');
  }
})