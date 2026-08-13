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

## What this continuation adds

| Piece | Role |
|---|---|
| Shared control contract | Same FOMO-space X (0–96), same servo/PWM ranges |
| `VISION_FOMO_DOTS` | Same “follow marks” behavior as before |
| `VISION_ROAD_CENTROID` | New mode: find dark road / line in the lower image band and steer to its center |
| Desktop simulator | Fake world + fake camera → same control math → virtual actuators |

## Control contract (firmware ↔ simulator)

```
inputs:
  found: bool
  target_x: float   # FOMO-space center X, typically 0..96 (48 = straight)
  target_w: float   # optional width (dots mode)

outputs:
  steer_deg: int    # [LOW_POINT .. HIGH_POINT], MID_POINT = straight
  throttle: int     # PWM [0 .. FAST_SPEED]
  drive: Forward | Brake | Coast
```

## Portenta pin map (unchanged)

| Function | Pin |
|---|---|
| Steering servo | `D2` |
| Motor PWM | `D5` |
| Forward | `D1` |
| Reverse | `D3` |

## Simulator ↔ hardware gap

The simulator does **not** run TensorFlow / Edge Impulse on-device. It implements:

- A synthetic first-person camera (road + optional dots).
- Either centroid extraction (road mode) or nearest-dot X (dots mode).
- The identical linear steering + throttle policy.

When you flash the Portenta sketch with a real EI model, the **actuator side** should feel familiar; retrain FOMO if your track marks changed.