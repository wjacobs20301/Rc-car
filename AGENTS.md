# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static GitHub Pages + Arduino firmware** project for a self-driving RC car. There is **no** `package.json`, linter, or automated test suite at the repo root.

### Active development area

New work lives under `cursor-continuation/`.

**Primary hardware: Seeed XIAO ESP32S3 Sense** (OV2640, `esp_camera`) — see `firmware_xiao/`.  
Historical Portenta code is under `RC-Car-Code/` and optional `firmware_portenta/`. Web demos are under `public/`.

### How to run the desktop simulator

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/cursor-continuation/simulator/`.

- Tracks: **Oval**, **Figure-8**, **Technical hairpins**, **Room tape loop**.
- Leave **Realism** on to exercise noise, actuator lag, and dropped frames.
- Control loop matches `firmware_xiao/TrackFollowCar/control.h` (`err = x - 48`, x = center).
- `window.__rcSim` exposes `start()`, `reset()`, `setTrack(id)`, and `getState()`.

Do not put service startup in the update script — start the static server only when you need the sim or `public/` pages.

### Firmware (real XIAO)

Sketch: `cursor-continuation/firmware_xiao/TrackFollowCar/`.

1. Board **XIAO_ESP32S3**, **PSRAM Enabled**, library **ESP32Servo**.
2. Pins: `D0` servo, `D2` PWM, `D1` forward, `D3` reverse.
3. `#define USE_XIAO_CAMERA` + `VISION_ROAD_CENTROID` by default.
4. FOMO mode needs re-exported EI lib — `cursor-continuation/models/README.md`.

### Lint / test / build

- Control math: `node cursor-continuation/simulator/js/control_test.mjs`
- Simulator hello world: technical hairpins + realism; off-track should stay low.

### Architecture notes

See `cursor-continuation/docs/ARCHITECTURE.md`.
