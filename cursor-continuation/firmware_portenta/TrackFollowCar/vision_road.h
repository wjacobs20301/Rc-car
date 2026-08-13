#ifndef TRACK_FOLLOW_VISION_ROAD_H
#define TRACK_FOLLOW_VISION_ROAD_H

#include "config.h"
#include "control.h"
#include <math.h>

/**
 * Road / line centroid vision.
 *
 * On real Portenta hardware, replace vision_road_capture_and_detect() body
 * with Himax frame capture (see RC-Car-Code ML_CAR edge-impulse-advanced-v2.h),
 * then call vision_road_from_gray().
 *
 * In this sketch we ship a **deterministic stub** so the sketch compiles and the
 * Serial control path can be exercised without a camera. When CAMERA_AVAILABLE
 * is defined and Himax code is linked, the real capture path is used.
 */

#ifndef CAMERA_AVAILABLE

inline void vision_road_init() {
  // no-op without camera
}

/**
 * Stub: oscillates a fake road center so Serial output proves the control loop.
 * Replace with camera capture on hardware.
 */
inline VisionTarget vision_road_capture_and_detect() {
  VisionTarget t;
  static uint32_t tick = 0;
  tick++;
  // Slow left-right sweep around center to exercise steering.
  float phase = (float)(tick % 200) / 200.0f;
  float swing = sinf(phase * 6.2831853f) * 18.0f;
  t.found = true;
  t.x = VISION_CENTER + swing;
  t.w = 0.0f;
  return t;
}

#else

// Placeholder for real Himax integration — keep API identical.
#include <camera.h>
// HM01B0 himax; Camera cam(himax); ...

inline void vision_road_init() {
  // cam.begin(...);
}

#endif

/**
 * Compute road/line center from a grayscale buffer (row-major, w*h bytes).
 * Looks at the lower band of the image and averages X of dark pixels.
 */
inline VisionTarget vision_road_from_gray(const uint8_t *gray, int w, int h) {
  VisionTarget t;
  t.found = false;
  t.x = VISION_CENTER;
  t.w = 0.0f;

  if (!gray || w <= 0 || h <= 0) return t;

  int y0 = (int)(h * ROAD_BAND_TOP_FRAC);
  long sum_x = 0;
  long count = 0;

  for (int y = y0; y < h; y++) {
    const uint8_t *row = gray + y * w;
    for (int x = 0; x < w; x++) {
      if (row[x] < ROAD_DARK_THRESHOLD) {
        sum_x += x;
        count++;
      }
    }
  }

  if (count < ROAD_MIN_PIXELS) return t;

  float mean_x = (float)sum_x / (float)count;
  // Map camera width → FOMO-space 0..96 so steering math stays identical.
  t.x = mean_x * ((float)VISION_WIDTH / (float)w);
  t.w = 0.0f;
  t.found = true;
  return t;
}

#endif
