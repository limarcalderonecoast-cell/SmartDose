export type TransportMode = 'Bluetooth' | 'Wi-Fi';

export type SignalStrength = 'Weak' | 'Fair' | 'Strong';

export type TrayState = 'Idle' | 'Waiting' | 'Dispensing';

export type NotificationAccess = 'granted' | 'denied' | 'undetermined';

export type MedicineLogStatus = 'pending' | 'taken' | 'missed';

export interface AudioReminder {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  sdCardPath: string;
  uploadedAt: string;
}

export interface MedicineSchedule {
  id: string;
  medicineName: string;
  dosage: string;
  time: string;
  compartment: number;
  instructions: string;
  reminderWindowMinutes: number;
  enabled: boolean;
  notificationId: string | null;
  lastSyncedAt: string | null;
}

export interface MedicineLog {
  id: string;
  occurrenceKey: string;
  scheduleId: string;
  medicineName: string;
  compartment: number;
  scheduledFor: string;
  status: MedicineLogStatus;
  confirmedAt: string | null;
}

export interface DeviceState {
  isConnected: boolean;
  mode: TransportMode;
  firmwareVersion: string;
  signalStrength: SignalStrength;
  trayState: TrayState;
  lastSyncAt: string | null;
  lastStatusAt: string | null;
  lastEvent: string;
  sdCardMounted: boolean;
  sdCardPath: string;
  audioFilesSynced: number;
  audioStorageUsedBytes: number;
}

export interface SettingsState {
  notificationAccess: NotificationAccess;
  autoSync: boolean;
  lastNotificationMessage: string | null;
  audioReminder: AudioReminder | null;
}

export interface AppState {
  schedules: MedicineSchedule[];
  logs: MedicineLog[];
  device: DeviceState;
  settings: SettingsState;
}
