# Cursor Continuation — Self-Driving RC Car

Restart of the Portenta / XIAO FOMO “follow marks on the floor” project, with:

1. **New Arduino firmware** (`firmware_portenta/`) that reuses the original pin map and linear steering math, and can follow either **floor dots/marks** (FOMO-style) or a **road / track centerline**.
2. **Desktop simulator** (`simulator/`) — a browser test world with a fake track, fake camera, and a virtual car driven by the **same control loop** as the firmware.

## Quick start (simulator)

From the repo root:

```bash
python3 -m http.server 8000
```

Open: [http://localhost:8000/cursor-continuation/simulator/](http://localhost:8000/cursor-continuation/simulator/)

Click **Start Autonomous Drive**. The car should follow the track using the simulated camera.

## Firmware

Open `firmware_portenta/TrackFollowCar/` in the Arduino IDE (Portenta H7 + Vision Shield).

- Pins match the mature Portenta stack (`D2` servo, `D5` PWM, `D1`/`D3` direction).
- Set `VISION_MODE` in `config.h` to `VISION_FOMO_DOTS` or `VISION_ROAD_CENTROID`.
- For FOMO dots, install your Edge Impulse Arduino library and uncomment the include (see `models/README.md`).

## Layout

```
cursor-continuation/
  README.md
  docs/ARCHITECTURE.md
  models/README.md
  firmware_portenta/TrackFollowCar/   # Arduino sketch
  simulator/                          # browser test environment
```

## Relation to old code

Historical firmware lives under `RC-Car-Code/`. This folder is the active place for new work so we do not disturb the archived versions.