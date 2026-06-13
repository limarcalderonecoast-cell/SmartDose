import { AppState } from '../types';

export function createDemoState(): AppState {
  return {
    schedules: [],
    logs: [],
    device: {
      isConnected: false,
      mode: 'Bluetooth',
      firmwareVersion: 'ESP32 v1.2.0',
      signalStrength: 'Fair',
      trayState: 'Idle',
      lastSyncAt: null,
      lastStatusAt: null,
      lastEvent: 'Waiting for connection to the smart medicine tray.',
      sdCardMounted: false,
      sdCardPath: '/sdcard/reminders',
      audioFilesSynced: 0,
      audioStorageUsedBytes: 0,
    },
    settings: {
      notificationAccess: 'undetermined',
      autoSync: true,
      lastNotificationMessage: null,
      audioReminder: null,
    },
  };
}
