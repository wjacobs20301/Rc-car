# Models

The Edge Impulse Arduino libraries used by the original car are **not checked into this repo** (they were installed as Arduino libraries on the build machine).

## Historical FOMO model

Referenced in the working Portenta sketches:

```text
ei-3d-print-03-model-45Degree_inferencing.h
```

Trained on 3D-printed floor symbols / dots at ~45° camera angle.

## How to re-attach a model

1. Open your Edge Impulse project (or retrain FOMO on your track marks / road features).
2. Deployment → Arduino library → download `.zip`.
3. Arduino IDE → Sketch → Include Library → Add .ZIP Library.
4. In `firmware_portenta/TrackFollowCar/config.h`, set `VISION_MODE` to `VISION_FOMO_DOTS` and uncomment the `#include <your-model_inferencing.h>` line in `TrackFollowCar.ino`.

## Road-centroid mode

`VISION_ROAD_CENTROID` does **not** need an Edge Impulse model. It thresholds the lower band of a grayscale frame and steers toward the mean X of dark pixels. Useful for high-contrast tape / painted lines / dark track on light floor.

## Simulator

The browser simulator uses procedural vision (no EI weights). Use it to tune steering gain, mid-point, and lost-target braking before flashing hardware.