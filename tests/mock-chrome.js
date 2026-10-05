/**
 * Max's Water Reminder - Mock Chrome Extension Environment
 * Comprehensive test harness simulating Chrome Extension APIs
 */

export class MockChrome {
  constructor() {
    this.storageData = {};
    this.alarmMap = new Map();
    this.alarmListeners = [];
    this.idleListeners = [];
    this.messageListeners = [];
    this.notificationButtonListeners = [];
    this.createdNotifications = [];
    this.sentTabMessages = [];
    this.tabsList = [
      { id: 1, url: 'https://example.com/article', active: true }
    ];

    this.storage = {
      local: {
        get: async (keys) => {
          if (!keys) return { ...this.storageData };
          if (typeof keys === 'string') {
            return { [keys]: this.storageData[keys] };
          }
          if (Array.isArray(keys)) {
            const out = {};
            keys.forEach(k => { out[k] = this.storageData[k]; });
            return out;
          }
          const out = {};
          for (const k of Object.keys(keys)) {
            out[k] = this.storageData[k] !== undefined ? this.storageData[k] : keys[k];
          }
          return out;
        },
        set: async (items) => {
          Object.assign(this.storageData, items);
        },
        clear: async () => {
          this.storageData = {};
        }
      }
    };

    this.alarms = {
      create: (name, alarmInfo) => {
        this.alarmMap.set(name, { name, ...alarmInfo, createdTime: Date.now() });
      },
      clear: async (name) => {
        return this.alarmMap.delete(name);
      },
      get: async (name) => {
        return this.alarmMap.get(name) || null;
      },
      onAlarm: {
        addListener: (fn) => this.alarmListeners.push(fn)
      }
    };

    this.idle = {
      setDetectionInterval: () => {},
      onStateChanged: {
        addListener: (fn) => this.idleListeners.push(fn)
      }
    };

    this.notifications = {
      create: (id, options) => {
        const notif = { id, options, time: Date.now() };
        this.createdNotifications.push(notif);
        return id;
      },
      clear: async (id) => {
        this.createdNotifications = this.createdNotifications.filter(n => n.id !== id);
      },
      onButtonClicked: {
        addListener: (fn) => this.notificationButtonListeners.push(fn)
      }
    };

    this.tabs = {
      query: async (queryInfo) => {
        return this.tabsList;
      },
      sendMessage: async (tabId, message) => {
        this.sentTabMessages.push({ tabId, message });
        return { success: true };
      }
    };

    this.runtime = {
      getURL: (path) => `chrome-extension://mock-id/${path}`,
      onMessage: {
        addListener: (fn) => this.messageListeners.push(fn)
      },
      sendMessage: async (msg) => {
        const responses = [];
        for (const fn of this.messageListeners) {
          fn(msg, {}, (res) => responses.push(res));
        }
        return responses[0] || { success: true };
      }
    };
  }

  // Trigger simulated alarm event
  async triggerAlarm(name) {
    const alarm = this.alarmMap.get(name) || { name };
    for (const listener of this.alarmListeners) {
      await listener(alarm);
    }
  }

  // Trigger simulated idle event
  async triggerIdle(newState) {
    for (const listener of this.idleListeners) {
      await listener(newState);
    }
  }
}
