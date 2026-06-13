// ESP32 Connection Configuration
// Update ESP32_HOST based on your device's IP address or hostname

export const CONFIG = {
  // Development
  isDev: import.meta.env.DEV,
  
  // ESP32 Connection (for WiFi mode)
  ESP32_HOST: import.meta.env.VITE_ESP32_HOST || 'http://192.168.1.100',
  ESP32_PORT: import.meta.env.VITE_ESP32_PORT || '80',
  
  // API Timeouts
  API_TIMEOUT: 10000, // 10 seconds
  
  // Retry Configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  
  // Get the full API base URL
  get API_BASE_URL() {
    return `${this.ESP32_HOST}:${this.ESP32_PORT}`;
  },
};

export default CONFIG;
