// components/parking-history/parking-history.js
const { formatTime } = require('../../utils/util');

Component({
  properties: {
    records: {
      type: Array,
      value: []
    }
  },

  data: {
    formattedRecords: []
  },

  observers: {
    'records': function(records) {
      if (!records) return;
      // Reverse and format
      const formatted = records.slice().reverse().map((record) => {
        return {
          ...record,
          formattedDate: this.formatDate(record.startTime),
          formattedDuration: this.formatDuration(record.totalDurationMs)
        };
      });
      this.setData({ formattedRecords: formatted });
    }
  },

  methods: {
    formatDate(ts) {
      const date = new Date(ts);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${month}月${day}日 ${hour}:${minute}`;
    },

    formatDuration(ms) {
      const hours = Math.floor(ms / 3600000);
      const mins = Math.floor((ms % 3600000) / 60000);
      return `${hours}小时${mins}分钟`;
    },

    onBack() {
      this.triggerEvent('back');
    },

    onClear() {
      wx.showModal({
        title: '确认清空',
        content: '确定要清空所有历史记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('clear');
          }
        }
      });
    }
  }
})
