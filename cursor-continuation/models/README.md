# Models

## Historical FOMO model (your XIAO sketches)

```text
ei-3d-print-03-model-45Degree_inferencing.h
```

Used by `XIAO_ML_Drive_0.0.2` / `0.0.4` and the older Portenta sketches. Trained on 3D-printed floor marks at ~45° camera angle. **Not checked into this repo** — install as an Arduino library from Edge Impulse.

## Road-centroid mode (default on XIAO continuation)

`VISION_ROAD_CENTROID` does **not** need Edge Impulse. The XIAO OV2640 captures JPEG → RGB → 96×96 gray → dark-road centroid. Good for high-contrast tape / asphalt on a light floor.

## Re-attach FOMO on XIAO

1. Edge Impulse → Deployment → Arduino library  
2. Arduino IDE → Include Library → Add .ZIP Library  
3. In `firmware_xiao/TrackFollowCar/config.h`, set `VISION_MODE` to `VISION_FOMO_DOTS`  
4. Uncomment the EI `#include` in `TrackFollowCar.ino` and wire `vision_fomo_from_boxes()` after `run_classifier` (same bbox loop as your old `ML_Driving.ino`, but pass **center** `x + w/2`)

## Simulator

Procedural vision only (no EI weights). Use it to tune PD gains before flashing the XIAO.
