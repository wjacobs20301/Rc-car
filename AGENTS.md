# AGENTS.md

## Cursor Cloud specific instructions

This repository is a **static GitHub Pages + Arduino firmware** project for a self-driving RC car (Portenta / XIAO + Edge Impulse FOMO). There is **no** `package.json`, linter, or automated test suite at the repo root.

### Active development area

New work lives under `cursor-continuation/`. Historical firmware is archived in `RC-Car-Code/`; web demos are under `public/`.

### How to run the desktop simulator

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/cursor-continuation/simulator/`.

- Tracks: **Oval**, **Figure-8**, **Technical hairpins**, **Room tape loop**.
- Leave **Realism** on to exercise noise, actuator lag, and dropped frames.
- **Start Autonomous Drive** runs the shared PD control loop (same math as `firmware_portenta/TrackFollowCar/control.h`).
- Vision modes: **Road centroid** (default, real-Arduino ready) or **Floor dots / FOMO-style**.
- `window.__rcSim` exposes `start()`, `reset()`, `setTrack(id)`, and `getState()`.

Do not put service startup in the update script — start the static server only when you need the sim or `public/` pages.

### Firmware (real Portenta)

Arduino sketch: `cursor-continuation/firmware_portenta/TrackFollowCar/`.

1. In `config.h`, uncomment `#define USE_PORTENTA_CAMERA` for Himax HM01B0.
2. Default `VISION_MODE` is `VISION_ROAD_CENTROID` (no Edge Impulse library required).
3. FOMO mode needs a re-exported EI Arduino lib — see `cursor-continuation/models/README.md`.
4. Camera ~45° down; dark track on light floor.

### Lint / test / build

- No project-wide lint or unit-test runner.
- Control math: `node cursor-continuation/simulator/js/control_test.mjs`
- Simulator hello world: technical hairpins + realism on; off-track should stay low (single digits–low tens of %).

### Architecture notes

See `cursor-continuation/docs/ARCHITECTURE.md`. Control contract: `err = x - 48` where `x` is the **center** in FOMO space.
