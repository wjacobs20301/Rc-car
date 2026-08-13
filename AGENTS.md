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

- **Start Autonomous Drive** runs the shared control loop (same math as `firmware_portenta/TrackFollowCar/control.h`).
- Vision modes: **Road centroid** (default) or **Floor dots / FOMO-style**.
- `window.__rcSim` exposes `start()`, `reset()`, and `getState()` for automated checks.

Do not put service startup in the update script — start the static server only when you need the sim or `public/` pages.

### Firmware

Arduino sketch: `cursor-continuation/firmware_portenta/TrackFollowCar/`. Default `VISION_MODE` is `VISION_ROAD_CENTROID` (compiles without an Edge Impulse library). FOMO mode needs a re-exported EI Arduino lib — see `cursor-continuation/models/README.md`.

### Lint / test / build

- No project-wide lint or unit-test runner.
- Simulator “hello world”: start the HTTP server, open the sim, click Start, confirm the car follows the track and telemetry updates (`steer` / `throttle` / `laps`).
- Optional: `node --check` is not applicable to browser ES modules without a bundler; use the browser console / `__rcSim.getState()`.

### Architecture notes

See `cursor-continuation/docs/ARCHITECTURE.md` for the Portenta pin map and FOMO → linear steering lineage.
