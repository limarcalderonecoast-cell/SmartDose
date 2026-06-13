import { apiTestConnection } from '../services/api';

/**
 * Test ESP32 connectivity
 * Returns detailed status information
 */
export async function testDeviceConnection(): Promise<{
  isReachable: boolean;
  message: string;
  statusCode?: number;
  responseTime?: number;
}> {
  const startTime = performance.now();

  try {
    const result = await apiTestConnection();
    const responseTime = Math.round(performance.now() - startTime);

    return {
      isReachable: result.success,
      message: result.message,
      responseTime,
    };
  } catch (error) {
    const responseTime = Math.round(performance.now() - startTime);
    return {
      isReachable: false,
      message: `Failed to reach ESP32: ${error instanceof Error ? error.message : 'Unknown error'}`,
      responseTime,
    };
  }
}

/**
 * Format connection status for display
 */
export function formatConnectionStatus(
  isConnected: boolean,
  lastStatusTime?: string
): string {
  if (!isConnected) {
    return 'Not Connected';
  }

  if (!lastStatusTime) {
    return 'Connected';
  }

  const lastTime = new Date(lastStatusTime);
  const now = new Date();
  const diffMs = now.getTime() - lastTime.getTime();

  if (diffMs < 60000) {
    return 'Connected · Just now';
  } else if (diffMs < 300000) {
    const minutes = Math.floor(diffMs / 60000);
    return `Connected · ${minutes} min ago`;
  } else {
    return 'Connected · Offline for a while';
  }
}
