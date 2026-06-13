# SmartDose

SmartDose is a browser-based medicine reminder dashboard for an IoT medicine tray powered by an ESP32.

## What it includes

- Daily medicine schedule management with add, edit, and delete flows
- Desktop-friendly dashboard with clear status cards and responsive navigation
- Browser notification setup for local reminder prompts while the app is open
- Medicine intake confirmation and missed-dose tracking
- Recent history logs for taken, missed, and pending reminders
- Mock Bluetooth or Wi-Fi device synchronization layer for the ESP32 workflow

## Run the app

```bash
npm install
npm start
```

Open the URL printed by Vite, usually:

```text
http://localhost:5173
```

Useful commands:

```bash
npm run dev
npm run build
npm run preview
```

## Project structure

- `src/main.tsx`: browser entrypoint
- `src/AppWeb.tsx`: main SmartDose interface and app state wiring
- `src/services/device.ts`: mock ESP32 connection and sync behavior
- `src/services/notifications.ts`: local reminder scheduling and notification permissions
- `src/services/storage.ts`: browser `localStorage` persistence
- `src/utils/medicine.ts`: schedule parsing, log reconciliation, and date helpers

## Real ESP32 integration

The current app simulates the hardware sync flow so the whole user experience already works. To connect your real device:

1. Replace the mock logic in `src/services/device.ts` with your Bluetooth or Wi-Fi transport.
2. Send the schedule payloads from SmartDose to the ESP32 in `syncSchedulesToDevice`.
3. Feed back tray state, servo actions, or intake sensor events through `heartbeatDevice` or a dedicated status listener.

## Validation completed

- `npx tsc --noEmit`
- `npm run build`
