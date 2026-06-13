import { DeviceState, MedicineSchedule, TransportMode } from '../types';
import {
  apiConnectDevice,
  apiDisconnectDevice,
  apiSyncSchedules,
  apiGetDeviceStatus,
} from './api';

/**
 * Connect to the ESP32 device over WiFi
 */
export async function connectToDevice(mode: TransportMode): Promise<DeviceState> {
  try {
    const deviceState = await apiConnectDevice();
    return {
      ...deviceState,
      mode,
      isConnected: true,
    };
  } catch (error) {
    console.error('Failed to connect to device:', error);
    throw new Error(
      `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Disconnect from the ESP32 device
 */
export async function disconnectDevice(
  currentDevice: DeviceState
): Promise<DeviceState> {
  try {
    await apiDisconnectDevice();
    return {
      ...currentDevice,
      isConnected: false,
      trayState: 'Idle',
      sdCardMounted: false,
      lastStatusAt: new Date().toISOString(),
      lastEvent: 'Device disconnected. Local schedules are still available.',
    };
  } catch (error) {
    console.error('Failed to disconnect from device:', error);
    // Return disconnected state even if API call fails
    return {
      ...currentDevice,
      isConnected: false,
    };
  }
}

/**
 * Sync medicine schedules to the ESP32 device
 */
export async function syncSchedulesToDevice(
  schedules: MedicineSchedule[],
  currentDevice: DeviceState
): Promise<DeviceState> {
  if (!currentDevice.isConnected) {
    throw new Error('Connect to the ESP32 before syncing schedules.');
  }

  try {
    const updatedState = await apiSyncSchedules(schedules);

    const enabledCount = schedules.filter((schedule) => schedule.enabled).length;
    const audioSchedules = schedules.filter(
      (schedule) => schedule.enabled && schedule.audioReminder
    );

    return {
      ...updatedState,
      mode: currentDevice.mode,
      lastEvent: `${enabledCount} active schedule${
        enabledCount === 1 ? '' : 's'
      } synced to ESP32.${
        audioSchedules.length > 0
          ? ` ${audioSchedules.length} audio reminder${
              audioSchedules.length === 1 ? '' : 's'
            } uploaded.`
          : ''
      }`,
    };
  } catch (error) {
    console.error('Failed to sync schedules:', error);
    throw new Error(
      `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get the latest status from the ESP32 device (heartbeat/polling)
 */
export async function heartbeatDevice(
  currentDevice: DeviceState,
  activeReminder?: {
    medicineName: string;
    compartment: number;
  }
): Promise<DeviceState> {
  if (!currentDevice.isConnected) {
    return currentDevice;
  }

  try {
    const statusData = await apiGetDeviceStatus();

    // If there's an active reminder, update the event message
    if (activeReminder) {
      return {
        ...statusData,
        mode: currentDevice.mode,
        trayState: 'Waiting',
        lastEvent: `${activeReminder.medicineName} is queued in compartment ${activeReminder.compartment}.`,
      };
    }

    return {
      ...statusData,
      mode: currentDevice.mode,
    };
  } catch (error) {
    console.error('Failed to get device status:', error);
    // Return current state if heartbeat fails, but log the error
    return {
      ...currentDevice,
      lastStatusAt: new Date().toISOString(),
      lastEvent: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
