#ifndef TRACK_FOLLOW_VISION_ROAD_H
#define TRACK_FOLLOW_VISION_ROAD_H

#include "config.h"
#include "control.h"
#include <math.h>
#include <string.h>

/**
 * Road / line centroid vision for Portenta (and desktop twin).
 *
 * Real hardware: define USE_PORTENTA_CAMERA and link Himax capture
 * (see portenta_camera.h). Otherwise a deterministic stub exercises Serial.
 */

#ifdef USE_PORTENTA_CAMERA
#include "portenta_camera.h"
#endif

inline void vision_road_init() {
#ifdef USE_PORTENTA_CAMERA
  if (!portenta_camera_init()) {
    Serial.println(F("ERR: Himax camera init failed"));
  } else {
    Serial.println(F("Himax HM01B0 ready"));
  }
#endif
}

/**
 * Compute road/line center from grayscale buffer (row-major, w*h).
 * Lower-band dark-pixel column mass with nearer-row weighting.
 * Maps into FOMO-space 0..96 so steering stays identical to the old car.
 */
inline VisionTarget vision_road_from_gray(const uint8_t *gray, int w, int h) {
  VisionTarget t;
  t.found = false;
  t.x = VISION_CENTER;
  t.w = 0.0f;
  t.conf = 0.0f;

  if (!gray || w <= 0 || h <= 0) return t;

  int y0 = (int)(h * ROAD_BAND_TOP_FRAC);
  // Column mass — stack-friendly: accumulate mean without full histogram alloc
  // For Portenta 96x96 after resize this is tiny; for 320 wide use running sums.
  float sum_x = 0.0f;
  float sum_w = 0.0f;
  long count = 0;

  for (int y = y0; y < h; y++) {
    float row_w = 0.6f + 0.8f * ((float)(y - y0) / (float)((h - 1 - y0) > 0 ? (h - 1 - y0) : 1));
    const uint8_t *row = gray + y * w;
    for (int x = 0; x < w; x++) {
      if (row[x] < ROAD_DARK_THRESHOLD) {
        sum_x += (float)x * row_w;
        sum_w += row_w;
        count++;
      }
    }
  }

  if (count < ROAD_MIN_PIXELS || sum_w < 1.0f) return t;

  float mean_x = sum_x / sum_w;

  // Rough width from absolute deviation
  float absdev = 0.0f;
  for (int y = y0; y < h; y++) {
    float row_w = 0.6f + 0.8f * ((float)(y - y0) / (float)((h - 1 - y0) > 0 ? (h - 1 - y0) : 1));
    const uint8_t *row = gray + y * w;
    for (int x = 0; x < w; x++) {
      if (row[x] < ROAD_DARK_THRESHOLD) {
        absdev += fabsf((float)x - mean_x) * row_w;
      }
    }
  }
  float sigma = absdev / sum_w;
  float conf = (float)count / 400.0f;
  if (conf > 1.0f) conf = 1.0f;

  t.x = mean_x * ((float)VISION_WIDTH / (float)w);
  // Width is diagnostic only — control treats t.x as center (w must be 0).
  (void)sigma;
  t.w = 0.0f;
  t.conf = conf;
  t.found = conf > ROAD_MIN_CONF;
  return t;
}

inline VisionTarget vision_road_capture_and_detect() {
#ifdef USE_PORTENTA_CAMERA
  // Capture → 96x96 gray → centroid
  static uint8_t frame[VISION_WIDTH * VISION_HEIGHT];
  if (!portenta_camera_capture_gray96(frame)) {
    VisionTarget miss;
    miss.found = false;
    miss.x = VISION_CENTER;
    miss.w = 0;
    miss.conf = 0;
    return miss;
  }
  return vision_road_from_gray(frame, VISION_WIDTH, VISION_HEIGHT);
#else
  // Stub: slow sweep so Serial proves control without a camera attached.
  VisionTarget t;
  static uint32_t tick = 0;
  tick++;
  float phase = (float)(tick % 200) / 200.0f;
  float swing = sinf(phase * 6.2831853f) * 18.0f;
  t.found = true;
  t.x = VISION_CENTER + swing;
  t.w = 0.0f;
  t.conf = 0.9f;
  return t;
#endif
}

#endif
