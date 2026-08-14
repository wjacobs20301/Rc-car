# Architecture

## Primary board: Seeed XIAO ESP32S3 Sense

Your latest working car firmware (`RC-Car-Code/XIAO_Download`, `XIAO_ML_Drive_0.0.4`) runs on:

- **MCU:** XIAO ESP32S3 Sense  
- **Camera:** OV2640 via `esp_camera` (JPEG QVGA → RGB/gray)  
- **Pins:** `D0` servo, `D2` PWM, `D1` forward, `D3` reverse  
- **Vision (old):** Edge Impulse FOMO `ei-3d-print-03-model-45Degree` on floor marks  
- **Vision (continuation default):** road/tape **centroid** (no EI required)  
- **Control (continuation):** PD steering + slew + turn throttle cut — same as the browser simulator  

Active sketch: `firmware_xiao/TrackFollowCar/`.

## Older Portenta path

Earlier work used Arduino Portenta H7 + Himax Vision Shield (`RC-Car-Code/Working-ML-Car-*`, `ML_CAR`). That stack remains under `firmware_portenta/` for reference but is **not** the default.

## Control contract (firmware ↔ simulator)

```
inputs:
  found: bool
  target_x: float   # FOMO-space CENTER, 0..96 (48 = straight)
  conf: float

outputs:
  steer_deg: int    # [63..123], mid 93
  throttle: int     # PWM crawl, reduced in hard turns
  drive: Forward | Brake | Coast
```

`err = x - 48` — keep `simulator/js/control.js` and `firmware_xiao/.../control.h` in sync.

## Flashing checklist (XIAO)

1. Board = XIAO_ESP32S3, PSRAM on  
2. Library: ESP32Servo  
3. `#define USE_XIAO_CAMERA` in `config.h`  
4. Dark track on light floor, camera ~45° down (same angle as your FOMO training)  
5. Start at crawl PWM; tune `STEER_KP` / `HARD_TURN_ERR` if it oscillates or cuts corners  

## Simulator

Browser test harness with oval / figure-8 / technical / room-tape tracks, noise, actuator lag, 33&nbsp;ms loop — tunes the **same** policy you flash to the XIAO.
