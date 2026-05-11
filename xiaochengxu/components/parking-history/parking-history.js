// components/parking-history/parking-history.js
Component({
  properties: {
    records: {
      type: Array,
      value: [],
    },
  },

  data: {
    formattedRecords: [],
  },

  observers: {
    records(records) {
      if (!records) {
        return;
      }

      const formattedRecords = records.slice().reverse().map((record) => ({
        ...record,
        formattedDate: this.formatDate(record.startTime),
        formattedDuration: this.formatDuration(record.totalDurationMs),
      }));

      this.setData({ formattedRecords });
    },
  },

  methods: {
    formatDate(timestamp) {
      const date = new Date(timestamp);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${month}月${day}日 ${hour}:${minute}`;
    },

    formatDuration(ms) {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}小时${minutes}分钟`;
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
        },
      });
    },
  },
});
