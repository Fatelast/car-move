// components/parking-setup/parking-setup.js
const { parseParkingRuleWithGemini } = require('../../services/geminiService');

const PRESETS = [
  { id: 'standard', name: '标准时租', desc: '1小时/周期 · 15分钟免费', interval: 60, grace: 15 },
  { id: 'mall', name: '商场严格', desc: '1小时/周期 · 无免费', interval: 60, grace: 0 },
  { id: 'roadside', name: '路边半小时', desc: '30分钟/周期 · 15分钟免费', interval: 30, grace: 15 },
  { id: 'quick', name: '短停快走', desc: '15分钟/周期 · 5分钟免费', interval: 15, grace: 5 },
];

Component({
  properties: {},

  data: {
    presets: PRESETS,
    interval: 60,
    reminder: 10,
    gracePeriod: 0,
    cycleCost: 5,
    startTimeStr: '',
    ruleText: '',
    isAnalyzing: false,
    aiFeedback: '',
    locationImage: '',
    locationName: '',
    reminders: [5, 10, 15],
    manualIntervals: [30, 60, 15],
  },

  lifetimes: {
    attached() {
      const now = new Date();
      const startTimeStr = this.formatDateTimeLocal(now);
      this.setData({ startTimeStr });
    },
  },

  methods: {
    formatDateTimeLocal(date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}`;
    },

    onStartTimeChange(e) {
      this.setData({ startTimeStr: e.detail.value });
    },

    adjustCost(e) {
      const delta = parseInt(e.currentTarget.dataset.delta, 10);
      let newCost = this.data.cycleCost + delta;
      if (newCost < 0) newCost = 0;
      if (newCost > 200) newCost = 200;
      this.setData({ cycleCost: newCost });
    },

    applyPreset(e) {
      const preset = e.currentTarget.dataset.preset;
      this.setData({
        interval: preset.interval,
        gracePeriod: preset.grace,
        aiFeedback: '',
      });
    },

    setInterval(e) {
      const value = parseInt(e.currentTarget.dataset.val, 10);
      this.setData({ interval: value });
    },

    setReminder(e) {
      const value = parseInt(e.currentTarget.dataset.val, 10);
      this.setData({ reminder: value });
    },

    adjustReminder(e) {
      const delta = parseInt(e.currentTarget.dataset.delta, 10);
      let value = this.data.reminder + delta;
      if (value < 1) value = 1;
      if (value > 59) value = 59;
      this.setData({ reminder: value });
    },

    onReminderInput(e) {
      let value = parseInt(e.detail.value, 10);
      if (isNaN(value)) value = 0;
      if (value > 59) value = 59;
      this.setData({ reminder: value });
    },

    onRuleInput(e) {
      this.setData({ ruleText: e.detail.value });
    },

    async handleAIAnalysis() {
      if (!this.data.ruleText.trim()) {
        return;
      }

      this.setData({ isAnalyzing: true, aiFeedback: '' });
      const result = await parseParkingRuleWithGemini(this.data.ruleText);
      this.setData({ isAnalyzing: false });

      if (result) {
        this.setData({
          interval: result.intervalMinutes,
          gracePeriod: result.gracePeriodMinutes,
          aiFeedback: `已自动识别：${result.explanation}`,
        });
        return;
      }

      this.setData({ aiFeedback: '无法识别规则，请手动设置' });
    },

    onLocationNameInput(e) {
      this.setData({ locationName: e.detail.value });
    },

    chooseImage() {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFilePath = res.tempFiles[0].tempFilePath;
          wx.getFileSystemManager().saveFile({
            tempFilePath,
            success: (saveRes) => {
              this.setData({ locationImage: saveRes.savedFilePath });
            },
          });
        },
      });
    },

    removeImage() {
      this.setData({ locationImage: '' });
    },

    handleStart() {
      const startTimestamp = new Date(this.data.startTimeStr.replace(/-/g, '/')).getTime();

      this.triggerEvent('start', {
        startTime: startTimestamp,
        intervalMinutes: this.data.interval,
        reminderMinutes: this.data.reminder,
        gracePeriodMinutes: this.data.gracePeriod,
        locationImage: this.data.locationImage,
        locationName: this.data.locationName,
        cycleCost: this.data.cycleCost,
      });
    },

    onViewHistory() {
      this.triggerEvent('viewHistory');
    },
  },
});
