# Architecture

## What the old car did

The working self-driving stack (2022) was:

1. **Camera** on Arduino Portenta H7 Vision Shield (Himax HM01B0), later XIAO ESP32S3 Sense.
2. **Edge Impulse FOMO** object detection on 96×96 frames, detecting 3D-printed floor marks (“dots” / symbols), class `"1"`, score ≥ ~0.85.
3. Prefer the detection with **largest Y** (closest / lowest in frame).
4. **Linear steering**: `P1 = (x + width/2) - 48`, then `steer = constrain(P1 + MID_POINT, LOW, HIGH)` with mid `93`, range `63–123`.
5. **Throttle**: crawl forward (~PWM 40–45) while a mark is seen; brake when lost.
6. Optional **IR Promode** override for human remote control.

Source of truth for that behavior: `RC-Car-Code/Working-ML-Car-...` and `RC-Car-Code/Car-With-Remote-Control-2/.../ML_CAR/`.

## What this continuation adds (v2)

| Piece | Role |
|---|---|
| Shared PD control | `err = x - 48` where `x` is **center** in FOMO space; `steer = mid + Kp·err + Kd·Δerr (+ light I)`; servo slew; turn-based throttle cut |
| `VISION_ROAD_CENTROID` | Dark-road / tape centroid in lower image band — **runs on real Portenta without EI** |
| `USE_PORTENTA_CAMERA` | Himax HM01B0 capture → 96×96 downsample → centroid (`portenta_camera.h`) |
| `VISION_FOMO_DOTS` | Same “follow marks” behavior when EI library is re-exported |
| Desktop simulator | Complex tracks (oval / figure-8 / technical hairpins / room tape), ~45° look-down camera, noise, actuator lag, 33&nbsp;ms control loop |

## Control contract (firmware ↔ simulator)

```
inputs:
  found: bool
  target_x: float   # FOMO-space center X, typically 0..96 (48 = straight)
  target_w: float
  conf: float

outputs:
  steer_deg: int    # [LOW_POINT .. HIGH_POINT], MID_POINT = straight
  throttle: int     # PWM [0 .. FAST_SPEED], reduced in hard turns
  drive: Forward | Brake | Coast
```

Keep `simulator/js/control.js` and `firmware_portenta/TrackFollowCar/control.h` in sync when changing Kp/Kd/slew.

## Portenta pin map (unchanged)

| Function | Pin |
|---|---|
| Steering servo | `D2` |
| Motor PWM | `D5` |
| Forward | `D1` |
| Reverse | `D3` |

## Flashing for real hardware

1. Open `firmware_portenta/TrackFollowCar/` in Arduino IDE (Portenta H7).
2. In `config.h`, uncomment `#define USE_PORTENTA_CAMERA`.
3. Leave `VISION_MODE` as `VISION_ROAD_CENTROID` for tape/asphalt tracks.
4. For FOMO floor marks: install EI Arduino lib, switch mode, uncomment include (see `models/README.md`).
5. Place high-contrast dark track on light floor; camera angled ~45° down (same as original training).
6. Start at crawl PWM; tune `STEER_KP` / `HARD_TURN_ERR` if it cuts corners or oscillates.

## Simulator ↔ hardware gap

Still simulated (not on-device): full 3D physics, wheel slip, battery sag.  
Matched to hardware: FOMO-space error, PD+slew, 33&nbsp;ms loop, look-down camera band, dark-centroid vision, actuator lag in the sim realism toggle.