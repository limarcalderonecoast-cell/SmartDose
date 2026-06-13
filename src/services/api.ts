import { CONFIG } from '../config';
import { DeviceState, MedicineSchedule } from '../types';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch wrapper with timeout and error handling
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = CONFIG.API_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Retry logic for failed requests
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries: number = CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${i + 1} failed:`, error);

      if (i < retries - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, CONFIG.RETRY_DELAY_MS * (i + 1))
        );
      }
    }
  }

  throw lastError || new Error('Failed to fetch after retries');
}

/**
 * Connect to ESP32 device
 */
export async function apiConnectDevice(): Promise<DeviceState> {
  const url = `${CONFIG.API_BASE_URL}/api/device/connect`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();

  return {
    isConnected: data.isConnected ?? true,
    mode: 'Wi-Fi' as const,
    firmwareVersion: data.firmwareVersion ?? 'ESP32 v1.2.0',
    signalStrength: data.signalStrength ?? 'Fair',
    trayState: data.trayState ?? 'Idle',
    lastSyncAt: data.lastSyncAt ?? null,
    lastStatusAt: data.lastStatusAt ?? new Date().toISOString(),
    lastEvent: data.lastEvent ?? 'Connected to ESP32',
    sdCardMounted: data.sdCardMounted ?? false,
    sdCardPath: data.sdCardPath ?? '',
    audioFilesSynced: data.audioFilesSynced ?? 0,
    audioStorageUsedBytes: data.audioStorageUsedBytes ?? 0,
  };
}

/**
 * Disconnect from ESP32 device
 */
export async function apiDisconnectDevice(): Promise<void> {
  const url = `${CONFIG.API_BASE_URL}/api/device/disconnect`;

  await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Sync medicine schedules to ESP32
 */
export async function apiSyncSchedules(
  schedules: MedicineSchedule[]
): Promise<DeviceState> {
  const url = `${CONFIG.API_BASE_URL}/api/device/sync`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      schedules,
      timestamp: new Date().toISOString(),
    }),
  });

  return response.json();
}

/**
 * Get device status / heartbeat
 */
export async function apiGetDeviceStatus(): Promise<DeviceState> {
  const url = `${CONFIG.API_BASE_URL}/api/device/status`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Get device logs
 */
export async function apiGetDeviceLogs(limit: number = 100): Promise<any[]> {
  const url = `${CONFIG.API_BASE_URL}/api/device/logs?limit=${limit}`;

  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return response.json();
}

/**
 * Upload audio reminder file to ESP32
 */
export async function apiUploadAudioFile(
  fileName: string,
  audioBlob: Blob
): Promise<{ success: boolean; path: string }> {
  const url = `${CONFIG.API_BASE_URL}/api/device/upload-audio`;

  const formData = new FormData();
  formData.append('file', audioBlob, fileName);
  formData.append('fileName', fileName);

  const response = await fetchWithRetry(url, {
    method: 'POST',
    body: formData,
  });

  return response.json();
}

/**
 * Test connectivity to ESP32
 */
export async function apiTestConnection(): Promise<{ success: boolean; message: string }> {
  const url = `${CONFIG.API_BASE_URL}/api/health`;

  try {
    const response = await fetchWithTimeout(url, {
      method: 'GET',
    }, 5000);

    return {
      success: response.ok,
      message: 'Connected to ESP32',
    };
  } catch (error) {
    return {
      success: false,
      message: `Cannot reach ESP32 at ${CONFIG.API_BASE_URL}: ${(error as Error).message}`,
    };
  }
}

export default {
  apiConnectDevice,
  apiDisconnectDevice,
  apiSyncSchedules,
  apiGetDeviceStatus,
  apiGetDeviceLogs,
  apiUploadAudioFile,
  apiTestConnection,
};
