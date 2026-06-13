import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

import { createDemoState } from './data/demoState';
import { connectToDevice, disconnectDevice, heartbeatDevice, syncSchedulesToDevice } from './services/device';
import { cancelReminder, initializeNotifications, scheduleMedicineReminder } from './services/notifications';
import { loadAppState, saveAppState } from './services/storage';
import {
  AppState,
  AudioReminder,
  MedicineLogStatus,
  MedicineSchedule,
  NotificationAccess,
  TransportMode,
} from './types';
import {
  createId,
  fromTwelveHourParts,
  getActiveLog,
  reconcileLogs,
  sortSchedules,
  toTwelveHourParts,
} from './utils/medicine';
import { Dashboard } from './Dashboard';
import { HistoryView } from './HistoryView';
import { ScheduleForm } from './ScheduleForm';
import { SettingsView } from './SettingsView';
import { WebLayout } from './WebLayout';

type Page = 'dashboard' | 'schedule' | 'history' | 'settings';

interface ScheduleFormState {
  id: string | null;
  medicineName: string;
  dosage: string;
  hour: string;
  minute: string;
  meridiem: 'AM' | 'PM';
  compartment: number;
  instructions: string;
  reminderWindowMinutes: string;
  enabled: boolean;
}

type LegacyAppState = Partial<AppState> & {
  medicineSchedules?: MedicineSchedule[];
  medicineLogs?: AppState['logs'];
};

const COMPARTMENTS = [1, 2, 3, 4];
const MAX_AUDIO_UPLOAD_BYTES = 3 * 1024 * 1024;
const SD_CARD_REMINDER_PATH = '/sdcard/reminders';
const SAMPLE_SCHEDULES = new Map([
  ['sched-vitamin-c', 'Vitamin C'],
  ['sched-biogesic', 'Biogesic'],
]);

function createEmptyForm(): ScheduleFormState {
  return {
    id: null,
    medicineName: '',
    dosage: '',
    hour: '8',
    minute: '00',
    meridiem: 'AM',
    compartment: 1,
    instructions: '',
    reminderWindowMinutes: '45',
    enabled: true,
  };
}

function isSupportedAudioFile(file: File): boolean {
  return file.type.startsWith('audio/') || /\.(aac|flac|m4a|mp3|ogg|wav)$/i.test(file.name);
}

function sanitizeAudioFileName(fileName: string): string {
  const normalizedName = fileName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalizedName || 'reminder-audio';
}

function createSdCardAudioPath(audioId: string, fileName: string): string {
  return `${SD_CARD_REMINDER_PATH}/${audioId}-${sanitizeAudioFileName(fileName)}`;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }

      reject(new Error('The selected audio file could not be read.'));
    });
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Audio upload failed.')));
    reader.readAsDataURL(file);
  });
}

function isSampleSchedule(schedule: MedicineSchedule): boolean {
  return SAMPLE_SCHEDULES.get(schedule.id) === schedule.medicineName;
}

async function refreshScheduleNotifications(
  schedules: MedicineSchedule[],
  notificationAccess: NotificationAccess
): Promise<MedicineSchedule[]> {
  const refreshedSchedules: MedicineSchedule[] = [];

  for (const schedule of schedules) {
    await cancelReminder(schedule.notificationId);
    const notificationId = await scheduleMedicineReminder(schedule, notificationAccess);
    refreshedSchedules.push({
      ...schedule,
      notificationId,
    });
  }

  return refreshedSchedules;
}

function normalizeLoadedState(
  loadedState: AppState | null,
  notificationAccess: NotificationAccess
): AppState {
  const fallback = createDemoState();
  const source = (loadedState ?? fallback) as LegacyAppState;
  const schedules = sortSchedules(
    (source.schedules ?? source.medicineSchedules ?? fallback.schedules)
      .filter((schedule) => !isSampleSchedule(schedule))
  );
  const sampleScheduleIds = new Set(SAMPLE_SCHEDULES.keys());
  const logs = reconcileLogs(
    schedules,
    (source.logs ?? source.medicineLogs ?? fallback.logs).filter(
      (log) => !sampleScheduleIds.has(log.scheduleId)
    )
  );

  return {
    schedules,
    logs,
    device: {
      ...fallback.device,
      ...source.device,
    },
    settings: {
      ...fallback.settings,
      ...source.settings,
      notificationAccess,
    },
  };
}

export default function AppWeb() {
  const [appState, setAppState] = useState<AppState | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [formState, setFormState] = useState<ScheduleFormState>(createEmptyForm());
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const appStateRef = useRef<AppState | null>(null);

  const commitState = async (nextState: AppState) => {
    setAppState(nextState);
    appStateRef.current = nextState;
    await saveAppState(nextState);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeApp = async () => {
      try {
        setIsLoading(true);
        const notificationAccess = await initializeNotifications();
        const loadedState = await loadAppState();
        const normalizedState = normalizeLoadedState(loadedState, notificationAccess);
        const refreshedSchedules = await refreshScheduleNotifications(
          normalizedState.schedules,
          notificationAccess
        );
        const readyState: AppState = {
          ...normalizedState,
          schedules: refreshedSchedules,
          logs: reconcileLogs(refreshedSchedules, normalizedState.logs),
        };

        if (!isMounted) {
          return;
        }

        setAppState(readyState);
        appStateRef.current = readyState;
        await saveAppState(readyState);
      } catch (error) {
        console.error('Failed to initialize SmartDose web.', error);
        window.alert('SmartDose could not load. Please refresh the page.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initializeApp();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(async () => {
      const currentState = appStateRef.current;
      if (!currentState) {
        return;
      }

      const logs = reconcileLogs(currentState.schedules, currentState.logs);
      const activeLog = getActiveLog(logs);
      
      const updatedDevice = await heartbeatDevice(
        currentState.device,
        activeLog
          ? {
              medicineName: activeLog.medicineName,
              compartment: activeLog.compartment,
            }
          : undefined
      );

      const nextState: AppState = {
        ...currentState,
        logs,
        device: updatedDevice,
      };

      appStateRef.current = nextState;
      await saveAppState(nextState);
      setAppState(nextState);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const openAddSchedule = () => {
    setFormState(createEmptyForm());
    setIsFormVisible(true);
  };

  const openEditSchedule = (schedule: MedicineSchedule) => {
    const timeParts = toTwelveHourParts(schedule.time);

    setFormState({
      id: schedule.id,
      medicineName: schedule.medicineName,
      dosage: schedule.dosage,
      hour: timeParts.hour,
      minute: timeParts.minute,
      meridiem: timeParts.meridiem,
      compartment: schedule.compartment,
      instructions: schedule.instructions,
      reminderWindowMinutes: schedule.reminderWindowMinutes.toString(),
      enabled: schedule.enabled,
    });
    setIsFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) {
      return;
    }

    setIsFormVisible(false);
    setFormState(createEmptyForm());
  };



  const saveSchedule = async () => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    const medicineName = formState.medicineName.trim();
    const time = fromTwelveHourParts(formState.hour.trim(), formState.minute.trim(), formState.meridiem);
    const reminderWindowMinutes = Number.parseInt(formState.reminderWindowMinutes, 10);

    if (!medicineName) {
      window.alert('Enter a medicine name before saving.');
      return;
    }

    if (!time) {
      window.alert('Use a valid reminder time.');
      return;
    }

    if (!Number.isFinite(reminderWindowMinutes) || reminderWindowMinutes < 5 || reminderWindowMinutes > 180) {
      window.alert('Reminder window must be between 5 and 180 minutes.');
      return;
    }

    setIsSaving(true);

    try {
      const existingSchedule = currentState.schedules.find((schedule) => schedule.id === formState.id) ?? null;

      if (existingSchedule?.notificationId) {
        await cancelReminder(existingSchedule.notificationId);
      }

      const scheduleDraft: MedicineSchedule = {
        id: existingSchedule?.id ?? createId('schedule'),
        medicineName,
        dosage: formState.dosage.trim() || '1 dose',
        time,
        compartment: formState.compartment,
        instructions: formState.instructions.trim(),
        reminderWindowMinutes,
        enabled: formState.enabled,
        notificationId: null,
        lastSyncedAt: existingSchedule?.lastSyncedAt ?? null,
      };

      const notificationId = await scheduleMedicineReminder(
        scheduleDraft,
        currentState.settings.notificationAccess
      );
      const savedSchedule = {
        ...scheduleDraft,
        notificationId,
      };

      const nextSchedules = sortSchedules(
        existingSchedule
          ? currentState.schedules.map((schedule) =>
              schedule.id === existingSchedule.id ? savedSchedule : schedule
            )
          : [...currentState.schedules, savedSchedule]
      );

      const nextState: AppState = {
        ...currentState,
        schedules: nextSchedules,
        logs: reconcileLogs(nextSchedules, currentState.logs),
        settings: {
          ...currentState.settings,
          lastNotificationMessage: `${medicineName} saved for daily reminders.`,
        },
      };

      await commitState(nextState);
      closeForm();
    } catch (error) {
      console.error('Failed to save schedule.', error);
      window.alert('SmartDose could not save this schedule.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSchedule = async (id: string) => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    const schedule = currentState.schedules.find((item) => item.id === id);
    if (!schedule) {
      return;
    }

    try {
      await cancelReminder(schedule.notificationId);
      const nextSchedules = currentState.schedules.filter((item) => item.id !== id);
      await commitState({
        ...currentState,
        schedules: nextSchedules,
        logs: reconcileLogs(nextSchedules, currentState.logs),
        settings: {
          ...currentState.settings,
          lastNotificationMessage: `${schedule.medicineName} schedule removed.`,
        },
      });
    } catch (error) {
      console.error('Failed to delete schedule.', error);
      window.alert('SmartDose could not delete this schedule.');
    }
  };

  const updateLogStatus = async (logId: string, status: MedicineLogStatus) => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    const timestamp = new Date().toISOString();
    const nextState: AppState = {
      ...currentState,
      logs: currentState.logs.map((log) =>
        log.id === logId
          ? {
              ...log,
              status,
              confirmedAt: status === 'taken' ? timestamp : null,
            }
          : log
      ),
    };

    await commitState(nextState);
  };

  const changeTransportMode = async (mode: TransportMode) => {
    const currentState = appStateRef.current;
    if (!currentState || currentState.device.mode === mode) {
      return;
    }

    let updatedDevice = { ...currentState.device, mode };
    
    if (currentState.device.isConnected) {
      updatedDevice = await disconnectDevice(updatedDevice);
      updatedDevice.lastEvent = `${mode} selected. Reconnect to use the new transport.`;
    } else {
      updatedDevice.lastEvent = `${mode} is ready for the next tray connection.`;
    }

    await commitState({
      ...currentState,
      device: updatedDevice,
    });
  };

  const toggleDeviceConnection = async () => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    if (currentState.device.isConnected) {
      const disconnectedDevice = await disconnectDevice(currentState.device);
      
      await commitState({
        ...currentState,
        device: disconnectedDevice,
      });
      return;
    }

    setIsConnecting(true);
    try {
      const connectedDevice = await connectToDevice(currentState.device.mode);
      const syncedDevice = currentState.settings.autoSync
        ? await syncSchedulesToDevice(currentState.schedules, connectedDevice)
        : connectedDevice;

      await commitState({
        ...currentState,
        device: syncedDevice,
        schedules: currentState.schedules.map((schedule) => ({
          ...schedule,
          lastSyncedAt: currentState.settings.autoSync && schedule.enabled
            ? syncedDevice.lastSyncAt
            : schedule.lastSyncedAt,
        })),
      });
    } catch (error) {
      console.error('Failed to connect device.', error);
      window.alert(error instanceof Error ? error.message : 'Could not connect to the tray.');
    } finally {
      setIsConnecting(false);
    }
  };

  const syncNow = async () => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    if (!currentState.device.isConnected) {
      window.alert('Connect to the ESP32 tray before syncing schedules.');
      return;
    }

    setIsSyncing(true);
    try {
      const syncedDevice = await syncSchedulesToDevice(currentState.schedules, currentState.device);
      await commitState({
        ...currentState,
        device: syncedDevice,
        schedules: currentState.schedules.map((schedule) => ({
          ...schedule,
          lastSyncedAt: schedule.enabled ? syncedDevice.lastSyncAt : schedule.lastSyncedAt,
        })),
      });
    } catch (error) {
      console.error('Failed to sync device.', error);
      window.alert(error instanceof Error ? error.message : 'Could not sync schedules.');
    } finally {
      setIsSyncing(false);
    }
  };

  const toggleAutoSync = async (autoSync: boolean) => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    await commitState({
      ...currentState,
      settings: {
        ...currentState.settings,
        autoSync,
      },
    });
  };

  const uploadAudioReminder = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    const file = event.currentTarget.files?.[0] ?? null;
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    if (!isSupportedAudioFile(file)) {
      window.alert('Upload an audio file such as MP3, WAV, M4A, AAC, OGG, or FLAC.');
      return;
    }

    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      window.alert('Audio reminders must be 3 MB or smaller so they can be saved in this browser.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const audioId = createId('audio');
      const audioReminder: AudioReminder = {
        id: audioId,
        fileName: file.name,
        mimeType: file.type || 'audio/mpeg',
        sizeBytes: file.size,
        dataUrl,
        sdCardPath: createSdCardAudioPath(audioId, file.name),
        uploadedAt: new Date().toISOString(),
      };

      await commitState({
        ...currentState,
        settings: {
          ...currentState.settings,
          audioReminder,
        },
      });
    } catch (error) {
      console.error('Failed to upload reminder audio.', error);
      window.alert('SmartDose could not upload that audio file.');
    }
  };

  const removeAudioReminder = async () => {
    const currentState = appStateRef.current;
    if (!currentState) {
      return;
    }

    await commitState({
      ...currentState,
      settings: {
        ...currentState.settings,
        audioReminder: null,
      },
    });
  };

  if (isLoading || !appState) {
    return (
      <div className="loading-screen">
        <div className="loading-card">
          <div className="loading-mark">S</div>
          <div>
            <p className="loading-title">SmartDose</p>
            <p className="loading-copy">Preparing your medicine dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <WebLayout
      currentPage={currentPage}
      device={appState.device}
      onPageChange={(page) => setCurrentPage(page as Page)}
    >
      {currentPage === 'dashboard' && (
        <Dashboard
          state={appState}
          onAddSchedule={openAddSchedule}
          onMarkTaken={(logId) => updateLogStatus(logId, 'taken')}
          onMarkMissed={(logId) => updateLogStatus(logId, 'missed')}
        />
      )}

      {currentPage === 'schedule' && (
        <ScheduleForm
          schedules={appState.schedules}
          onAdd={openAddSchedule}
          onEdit={openEditSchedule}
          onDelete={deleteSchedule}
        />
      )}

      {currentPage === 'history' && (
        <HistoryView logs={appState.logs} schedules={appState.schedules} />
      )}

      {currentPage === 'settings' && (
        <SettingsView
          appState={appState}
          isConnecting={isConnecting}
          isSyncing={isSyncing}
          onAutoSyncChange={toggleAutoSync}
          onSyncNow={syncNow}
          onToggleConnection={toggleDeviceConnection}
          onTransportChange={changeTransportMode}
          onUploadAudio={uploadAudioReminder}
          onRemoveAudio={removeAudioReminder}
        />
      )}

      {isFormVisible && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title">
            <div className="modal-header">
              <div>
                <p className="eyebrow">Medicine schedule</p>
                <h2 id="schedule-modal-title">{formState.id ? 'Edit medicine' : 'Add medicine'}</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeForm} aria-label="Close schedule form">
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="form-grid">
              <label>
                Medicine name
                <input
                  className="input"
                  type="text"
                  value={formState.medicineName}
                  onChange={(event) => setFormState({ ...formState, medicineName: event.target.value })}
                  placeholder="Enter medicine name"
                />
              </label>

              <label>
                Dosage
                <input
                  className="input"
                  type="text"
                  value={formState.dosage}
                  onChange={(event) => setFormState({ ...formState, dosage: event.target.value })}
                  placeholder="1 tablet"
                />
              </label>

              <div className="time-grid">
                <label>
                  Hour
                  <input
                    className="input"
                    type="number"
                    min="1"
                    max="12"
                    value={formState.hour}
                    onChange={(event) => setFormState({ ...formState, hour: event.target.value })}
                  />
                </label>
                <label>
                  Minute
                  <input
                    className="input"
                    type="number"
                    min="0"
                    max="59"
                    value={formState.minute}
                    onChange={(event) => setFormState({ ...formState, minute: event.target.value })}
                  />
                </label>
                <label>
                  Period
                  <select
                    className="input"
                    value={formState.meridiem}
                    onChange={(event) =>
                      setFormState({ ...formState, meridiem: event.target.value as 'AM' | 'PM' })
                    }
                  >
                    <option>AM</option>
                    <option>PM</option>
                  </select>
                </label>
              </div>

              <div className="time-grid">
                <label>
                  Compartment
                  <select
                    className="input"
                    value={formState.compartment}
                    onChange={(event) =>
                      setFormState({ ...formState, compartment: Number.parseInt(event.target.value, 10) })
                    }
                  >
                    {COMPARTMENTS.map((compartment) => (
                      <option key={compartment} value={compartment}>
                        Compartment {compartment}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Reminder window
                  <input
                    className="input"
                    type="number"
                    min="5"
                    max="180"
                    value={formState.reminderWindowMinutes}
                    onChange={(event) =>
                      setFormState({
                        ...formState,
                        reminderWindowMinutes: event.target.value.replace(/[^0-9]/g, ''),
                      })
                    }
                  />
                </label>
              </div>

              <label>
                Instructions
                <textarea
                  className="input textarea"
                  rows={3}
                  value={formState.instructions}
                  onChange={(event) => setFormState({ ...formState, instructions: event.target.value })}
                  placeholder="Take after food"
                />
              </label>

              <label className="toggle-row">
                <input
                  type="checkbox"
                  checked={formState.enabled}
                  onChange={(event) => setFormState({ ...formState, enabled: event.target.checked })}
                />
                <span>Active reminder schedule</span>
              </label>
            </div>

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={closeForm}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={isSaving}
                onClick={saveSchedule}
              >
                {isSaving ? 'Saving...' : 'Save schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </WebLayout>
  );
}
