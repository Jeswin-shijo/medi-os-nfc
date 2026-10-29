# MediOS AI Reception (tablet kiosk)

The self-service check-in kiosk for the hospital front hall: a patient taps an NFC card or finds their record by phone, picks a doctor, pays and gets an OP token. It is an Android tablet app (Expo SDK 57, React Native 0.86, Expo Router) that talks to the MediOS backend under `/api/kiosk/*`.

## Setup

```bash
npm install --legacy-peer-deps
npm test           # unit tests (plain Node)
npm run typecheck
npm run lint
```

New packages: `npx expo install <package> -- --legacy-peer-deps`. Never edit `android/` by hand: it is generated (`npx expo prebuild`) and git-ignored. Native settings live in `app.json` and the config plugins.

## Running against the test API

1. Start MongoDB (`docker start medios-mongodb`) and the backend from the reception worktree:
   `MONGODB_URI=mongodb://localhost:27017/medios_reception_dev PORT=4500 PUBLIC_WEB_URL=http://localhost:5185 node dist/main`
2. Create a kiosk key: sign in as an admin (`POST /api/auth/login` with header `X-MediOS-Client: mobile`), then `POST /api/queue/displays {"name":"Tablet emulator","kind":"kiosk"}`. The answer's `data.key` is the kiosk key.
3. Boot an Android tablet emulator (`Reception_Tablet`: 2560x1600, 320 dpi) and run Metro on **8083** (8081 is often taken):
   `RCT_METRO_PORT=8083 npx expo run:android --port 8083 --device <emulator id>`
4. A fresh install opens the setup screen. Connect it with the setup link (the emulator reaches the Mac at `10.0.2.2`):
   `adb shell am start -a android.intent.action.VIEW -d "medios-reception://setup?api=http%3A%2F%2F10.0.2.2%3A4500%2Fapi&key=<key>&printer=tcp%3A%2F%2F10.0.2.2%3A9100"`
5. In a dev build the component gallery is at `/_dev/ui`.

Once a kiosk is configured, setup links are treated as staff-only: they ask for a staff sign-in before changing the server or key.

## Kiosk behaviour

- Landscape lock, immersive mode (system bars hidden; a swipe from the edge shows them briefly), status bar hidden, screen kept awake.
- The Android Back button never leaves the app. On Welcome it does nothing; on screens with their own Back button it does the same as that button; elsewhere it does nothing.
- Hold the logo for 3 seconds to open the staff menu.
- `usesCleartextTraffic` is on, so a hospital LAN server over plain `http://` works. See the HTTPS note below.

## Building

- Debug on a device or emulator: `npx expo run:android`.
- Release/installable: `npx eas-cli@latest build --platform android --profile production` (or `npx expo run:android --variant release` for a local build).

## Device checklist

- Android tablet with **USB-OTG** support.
- A **powered USB hub** for the NFC card reader and the receipt printer together; the tablet cannot power both.
- NFC **on** in Android settings (for the tablet's own reader, if used).
- Lock the tablet to the app with Android **screen pinning** (Settings, Security, App pinning) or a kiosk launcher.
- Grant the **USB printer permission** with **"Use by default for this USB device"** ticked, during setup, before pinning. Pinned (lock-task) mode can block the permission dialog, so unpin, grant, then pin again.
- **HTTPS is strongly recommended** for the API. Over plain HTTP on a LAN, anyone on the network can read the kiosk key and forge responses.
- **Recovery:** if the stored server is unreachable or wrong, the kiosk cannot be reconfigured from inside the app. Use Android Settings, Apps, MediOS Reception, **Clear storage**, then run setup again.
- **Sample payments and SMS** (marked SAMPLE on screen) must never be used with real patients.
