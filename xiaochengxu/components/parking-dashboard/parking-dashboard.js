// components/parking-dashboard/parking-dashboard.js
const ParkingStatus = {
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  DANGER: 'DANGER',
  OVERTIME: 'OVERTIME'
};

Component({
  properties: {
    config: {
      type: Object,
      value: null
    }
  },

  data: {
    now: Date.now(),
    totalDurationFormatted: '',
    remainingMs: 0,
    remainingMinutes: 0,
    remainingSeconds: '00',
    status: ParkingStatus.SAFE,
    progressPercentage: 0,
    cycleCount: 1,
    statusColor: '#10b981',
    showImageModal: false,
    showStopConfirm: false,
    lastNotificationKey: ''
  },

  lifetimes: {
    attached() {
      this.timer = setInterval(() => {
        this.updateState();
      }, 1000);
      this.updateState();
    },
    detached() {
      if (this.timer) clearInterval(this.timer);
    }
  },

  methods: {
    updateState() {
      const config = this.data.config;
      if (!config) return;

      const now = Date.now();
      const elapsedMs = now - config.startTime;
      const intervalMs = config.intervalMinutes * 60 * 1000;
      const currentCycleElapsedMs = elapsedMs % intervalMs;
      const msUntilNextCycle = intervalMs - currentCycleElapsedMs;
      const currentCycleIndex = Math.floor(elapsedMs / intervalMs) + 1;
      
      const hours = Math.floor(elapsedMs / 3600000);
      const mins = Math.floor((elapsedMs % 3600000) / 60000);
      const totalDurationFormatted = `${hours}小时 ${mins}分钟`;

      let currentStatus = ParkingStatus.SAFE;
      const remainingMins = msUntilNextCycle / 60000;

      if (remainingMins <= 5) {
        currentStatus = ParkingStatus.DANGER;
      } else if (remainingMins <= config.reminderMinutes) {
        currentStatus = ParkingStatus.WARNING;
      }

      const remainingSeconds = Math.floor((msUntilNextCycle % 60000) / 1000).toString().padStart(2, '0');
      const remainingMinutesVal = Math.floor(msUntilNextCycle / 60000);

      const progressPercentage = (currentCycleElapsedMs / intervalMs) * 100;

      this.setData({
        now,
        totalDurationFormatted,
        remainingMs: msUntilNextCycle,
        remainingMinutes: remainingMinutesVal,
        remainingSeconds,
        status: currentStatus,
        progressPercentage,
        cycleCount: currentCycleIndex,
        statusColor: this.getColor(currentStatus)
      });

      this.checkNotification(currentStatus, currentCycleIndex, remainingMinutesVal);
    },

    getColor(status) {
      switch (status) {
        case ParkingStatus.SAFE: return '#10b981'; // Emerald 500
        case ParkingStatus.WARNING: return '#f09e5c'; // Sandy Orange
        case ParkingStatus.DANGER: return '#9b2d3b'; // Deep Red
        default: return '#e67e5b';
      }
    },

    checkNotification(status, cycleCount, remainingMinutes) {
      if (status === ParkingStatus.WARNING || status === ParkingStatus.DANGER) {
        const currentKey = `${cycleCount}-${status}`;
        if (this.data.lastNotificationKey !== currentKey) {
          // Trigger notification
          wx.vibrateLong();
          
          this.setData({ lastNotificationKey: currentKey });
        }
      }
    },

    toggleImageModal() {
      this.setData({ showImageModal: !this.data.showImageModal });
    },

    showStopConfirm() {
      this.setData({ showStopConfirm: true });
    },

    hideStopConfirm() {
      this.setData({ showStopConfirm: false });
    },

    onStop() {
      this.triggerEvent('stop');
    },

    previewImage() {
      if (this.data.config.locationImage) {
        wx.previewImage({
          urls: [this.data.config.locationImage]
        });
      }
    }
  }
})
