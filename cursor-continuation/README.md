# Cursor Continuation — Self-Driving RC Car

**Primary hardware: Seeed XIAO ESP32S3 Sense** (OV2640 camera) — matching your `RC-Car-Code/XIAO_*` sketches.

1. **XIAO firmware** (`firmware_xiao/`) — PD steering, road/tape centroid via `esp_camera`, your pin map (`D0` servo, `D2` PWM, `D1`/`D3` dir).
2. **Desktop simulator** (`simulator/`) — complex tracks + same control loop for tuning before you flash.
3. **Portenta** (`firmware_portenta/`) — kept only as a secondary/legacy path from the older Portenta era.

## Quick start (simulator)

```bash
python3 -m http.server 8000
```

Open: [http://localhost:8000/cursor-continuation/simulator/](http://localhost:8000/cursor-continuation/simulator/)

## Flash on XIAO ESP32S3 Sense

1. Arduino IDE → Board **XIAO_ESP32S3**, **PSRAM Enabled**
2. Install **ESP32Servo**
3. Open `firmware_xiao/TrackFollowCar/`
4. Keep `#define USE_XIAO_CAMERA` and `VISION_ROAD_CENTROID` in `config.h`
5. Upload; Serial 115200 shows `found / x / conf / err / steer / thr`
6. Camera ~45° down; dark tape/asphalt on light floor

Pins (from your `XIAO_ML_Drive_0.0.4`):

| Function | Pin |
|---|---|
| Steering servo | `D0` |
| Motor PWM | `D2` |
| Forward | `D1` |
| Reverse | `D3` |

For FOMO floor-mark mode, re-install `ei-3d-print-03-model-45Degree` and switch `VISION_MODE` — see `models/README.md`.

## Layout

```
cursor-continuation/
  firmware_xiao/TrackFollowCar/      # ← flash this
  firmware_portenta/TrackFollowCar/  # legacy / optional
  simulator/
  docs/ARCHITECTURE.md
  models/README.md
```
