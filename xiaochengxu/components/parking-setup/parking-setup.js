// components/parking-setup/parking-setup.js
const { parseParkingRuleWithGemini } = require('../../services/geminiService');

const PRESETS = [
  { id: 'standard', name: '标准时租', desc: '1h/周期 · 15分免费', interval: 60, grace: 15 },
  { id: 'mall', name: '商场严格', desc: '1h/周期 · 无免费', interval: 60, grace: 0 },
  { id: 'roadside', name: '路边半小时', desc: '30分/周期 · 15分免费', interval: 30, grace: 15 },
  { id: 'quick', name: '短停快走', desc: '15分/周期 · 5分免费', interval: 15, grace: 5 },
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
    manualIntervals: [30, 60, 15]
  },

  lifetimes: {
    attached() {
      const now = new Date();
      // Format for datetime-local equivalent: YYYY-MM-DD HH:mm
      const str = this.formatDateTimeLocal(now);
      this.setData({ startTimeStr: str });
    }
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
      const delta = parseInt(e.currentTarget.dataset.delta);
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
        aiFeedback: ''
      });
    },

    setInterval(e) {
      const val = parseInt(e.currentTarget.dataset.val);
      this.setData({ interval: val });
    },

    setReminder(e) {
      const val = parseInt(e.currentTarget.dataset.val);
      this.setData({ reminder: val });
    },

    adjustReminder(e) {
      const delta = parseInt(e.currentTarget.dataset.delta);
      let newVal = this.data.reminder + delta;
      if (newVal < 1) newVal = 1;
      if (newVal > 59) newVal = 59;
      this.setData({ reminder: newVal });
    },

    onReminderInput(e) {
      let val = parseInt(e.detail.value);
      if (isNaN(val)) val = 0;
      if (val > 59) val = 59;
      this.setData({ reminder: val });
    },

    onRuleInput(e) {
      this.setData({ ruleText: e.detail.value });
    },

    async handleAIAnalysis() {
      if (!this.data.ruleText.trim()) return;
      this.setData({ isAnalyzing: true, aiFeedback: '' });

      const result = await parseParkingRuleWithGemini(this.data.ruleText);

      this.setData({ isAnalyzing: false });
      if (result) {
        this.setData({
          interval: result.intervalMinutes,
          gracePeriod: result.gracePeriodMinutes,
          aiFeedback: `已自动识别: ${result.explanation}`
        });
      } else {
        this.setData({ aiFeedback: "无法识别规则，请手动设置" });
      }
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
          // In a real app, you might want to compress or upload this.
          // For local storage demo, we might hit size limits if we store base64.
          // We'll store the temp path, but note it's temporary.
          // Ideally, use wx.getFileSystemManager().saveFile to persist locally.
          wx.getFileSystemManager().saveFile({
            tempFilePath: tempFilePath,
            success: (saveRes) => {
              this.setData({ locationImage: saveRes.savedFilePath });
            }
          });
        }
      });
    },

    removeImage() {
      this.setData({ locationImage: '' });
    },

    handleStart() {
      // Parse startTimeStr back to timestamp
      // WeChat picker returns YYYY-MM-DD HH:mm
      // We need to be careful with timezone. new Date(str) usually works.
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
    }
  }
})
