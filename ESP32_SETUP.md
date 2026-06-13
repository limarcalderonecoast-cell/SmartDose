# ESP32 Web App Integration Setup Guide

This guide shows you how to connect your SmartDose web app to a real ESP32 device.

## Prerequisites

- ESP32 device connected to WiFi
- ESP32 running a web server (see example code below)
- Your ESP32's IP address (find it via your router or serial monitor)
- Your web app and ESP32 on the same network

## Configuration Steps

### 1. Find Your ESP32 IP Address

**Option A: Via Serial Monitor**
- Open Arduino IDE → Tools → Serial Monitor
- Reset your ESP32
- Look for a line like: `IP address: 192.168.1.100`

**Option B: Via Router**
- Log into your WiFi router's admin panel
- Find your ESP32 in the connected devices list
- Note its IP address

**Option C: Via mDNS Hostname**
- If you set a hostname on your ESP32 (e.g., `esp32.local`)
- Use that instead of the IP address

### 2. Update `.env.local` File

Edit the `.env.local` file in your project root:

```env
VITE_ESP32_HOST=http://192.168.1.100
VITE_ESP32_PORT=80
```

Replace `192.168.1.100` with your actual ESP32 IP address.

### 3. Required ESP32 API Endpoints

Your ESP32 must implement these REST endpoints:

#### **GET /api/health**
- Purpose: Test connectivity
- Response:
  ```json
  { "status": "ok" }
  ```

#### **GET /api/device/connect**
- Purpose: Establish connection and get device info
- Response:
  ```json
  {
    "isConnected": true,
    "firmwareVersion": "ESP32 v1.2.0",
    "signalStrength": "Strong",
    "trayState": "Idle",
    "lastStatusAt": "2026-01-15T10:30:00Z",
    "lastEvent": "Connected to device",
    "sdCardMounted": true,
    "sdCardPath": "/sdcard/reminders",
    "audioFilesSynced": 0,
    "audioStorageUsedBytes": 0
  }
  ```

#### **POST /api/device/disconnect**
- Purpose: Disconnect the device
- Request: Empty or minimal JSON
- Response:
  ```json
  { "success": true }
  ```

#### **POST /api/device/sync**
- Purpose: Sync medicine schedules to ESP32
- Request:
  ```json
  {
    "schedules": [
      {
        "id": "med-1",
        "medicineName": "Aspirin",
        "dosage": "500mg",
        "time": "09:00",
        "compartment": 1,
        "enabled": true,
        "instructions": "Take with water",
        "reminderWindowMinutes": 15
      }
    ],
    "timestamp": "2026-01-15T10:30:00Z"
  }
  ```
- Response:
  ```json
  {
    "isConnected": true,
    "lastSyncAt": "2026-01-15T10:30:00Z",
    "audioFilesSynced": 2,
    "audioStorageUsedBytes": 256000
  }
  ```

#### **GET /api/device/status**
- Purpose: Get current device status (heartbeat)
- Response: Same as `/api/device/connect`

#### **GET /api/device/logs?limit=100**
- Purpose: Get device event logs
- Response:
  ```json
  [
    {
      "timestamp": "2026-01-15T10:30:00Z",
      "event": "Schedule synced",
      "details": "2 schedules synced"
    }
  ]
  ```

#### **POST /api/device/upload-audio**
- Purpose: Upload audio reminder file
- Request: FormData with file and fileName
- Response:
  ```json
  {
    "success": true,
    "path": "/sdcard/reminders/reminder-1.mp3"
  }
  ```

## Example ESP32 Arduino Code

Here's a minimal example to implement these endpoints on your ESP32:

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebServer server(80);

// Device state
bool sdCardMounted = false;
unsigned long lastSyncTime = 0;

void handleHealthCheck() {
  DynamicJsonDocument doc(128);
  doc["status"] = "ok";
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleConnect() {
  DynamicJsonDocument doc(512);
  doc["isConnected"] = true;
  doc["firmwareVersion"] = "ESP32 v1.2.0";
  doc["signalStrength"] = "Strong";
  doc["trayState"] = "Idle";
  doc["lastStatusAt"] = "2026-01-15T10:30:00Z";
  doc["lastEvent"] = "Connected to device";
  doc["sdCardMounted"] = sdCardMounted;
  doc["sdCardPath"] = "/sdcard/reminders";
  doc["audioFilesSynced"] = 0;
  doc["audioStorageUsedBytes"] = 0;
  
  String response;
  serializeJson(doc, response);
  server.send(200, "application/json", response);
}

void handleDisconnect() {
  server.send(200, "application/json", "{\"success\": true}");
}

void handleSync() {
  if (server.hasArg("plain")) {
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, server.arg("plain"));
    
    // Process schedules here
    lastSyncTime = millis();
    
    // Send response
    DynamicJsonDocument response(512);
    response["isConnected"] = true;
    response["lastSyncAt"] = "2026-01-15T10:30:00Z";
    response["audioFilesSynced"] = 0;
    response["audioStorageUsedBytes"] = 0;
    
    String responseStr;
    serializeJson(response, responseStr);
    server.send(200, "application/json", responseStr);
  } else {
    server.send(400, "application/json", "{\"error\": \"No data\"}");
  }
}

void handleStatus() {
  // Same as handleConnect
  handleConnect();
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Connect to WiFi
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  Serial.println();
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Setup API endpoints
  server.on("/api/health", handleHealthCheck);
  server.on("/api/device/connect", handleConnect);
  server.on("/api/device/disconnect", handleDisconnect);
  server.on("/api/device/sync", HTTP_POST, handleSync);
  server.on("/api/device/status", handleStatus);
  
  // Enable CORS if needed
  server.enableCORS();
  
  server.begin();
  Serial.println("Web server started");
}

void loop() {
  server.handleClient();
  delay(100);
}
```

## Testing the Connection

### 1. Test via Browser Console

Open your web app, then in the browser console:

```javascript
import { apiTestConnection } from './src/services/api';
await apiTestConnection();
// Should return: { success: true, message: "Connected to ESP32" }
```

### 2. Test via curl (from your computer's terminal)

```bash
# Test health endpoint
curl http://192.168.1.100/api/health

# Test connect endpoint
curl http://192.168.1.100/api/device/connect

# Test sync endpoint
curl -X POST http://192.168.1.100/api/device/sync \
  -H "Content-Type: application/json" \
  -d '{"schedules": [], "timestamp": "2026-01-15T10:30:00Z"}'
```

## Troubleshooting

### "Cannot reach ESP32" Error
- ✅ Verify ESP32 IP address is correct
- ✅ Check that ESP32 and web app are on the same WiFi network
- ✅ Check that ESP32 web server is running
- ✅ Look at ESP32 serial monitor for errors

### CORS Issues
- ✅ Make sure to call `server.enableCORS()` on your ESP32
- ✅ If using WebSocket, ensure proper headers are sent

### Timeout Errors
- ✅ Increase timeout in `config.ts`: `API_TIMEOUT: 15000`
- ✅ Check ESP32 is responsive (`ping 192.168.1.100`)
- ✅ Ensure no firewall is blocking the port

### Data Not Syncing
- ✅ Check request/response format matches the API spec
- ✅ Use browser DevTools → Network tab to inspect requests
- ✅ Check ESP32 serial output for errors

## Next Steps

1. ✅ Update your ESP32 firmware with the API endpoints
2. ✅ Update `.env.local` with your ESP32 IP
3. ✅ Start your web app: `npm start`
4. ✅ Test connection via the app's Connect button
5. ✅ Create and sync medicine schedules
6. ✅ Monitor device status in the Dashboard

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_ESP32_HOST` | ESP32 base URL | `http://192.168.1.100` |
| `VITE_ESP32_PORT` | ESP32 web server port | `80` |

## Support

For issues or questions, check:
- Browser DevTools → Network tab (to see API requests)
- ESP32 Serial Monitor (for device-side logs)
- `src/services/api.ts` (to understand request/response handling)
