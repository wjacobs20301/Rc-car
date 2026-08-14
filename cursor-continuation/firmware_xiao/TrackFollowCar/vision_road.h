#ifndef TRACK_FOLLOW_VISION_ROAD_H
#define TRACK_FOLLOW_VISION_ROAD_H

#include "config.h"
#include "control.h"
#include <math.h>

#ifdef USE_XIAO_CAMERA
#include "xiao_camera.h"
#endif

inline void vision_road_init() {
#ifdef USE_XIAO_CAMERA
  if (!xiao_camera_init()) {
    Serial.println(F("ERR: XIAO Sense camera init failed"));
  } else {
    Serial.println(F("XIAO Sense OV2640 ready"));
  }
#endif
}

/**
 * Road/line center from grayscale (row-major).
 * Lower-band dark-pixel column mass → FOMO-space center X.
 */
inline VisionTarget vision_road_from_gray(const uint8_t *gray, int w, int h) {
  VisionTarget t;
  t.found = false;
  t.x = VISION_CENTER;
  t.w = 0.0f;
  t.conf = 0.0f;

  if (!gray || w <= 0 || h <= 0) return t;

  int y0 = (int)(h * ROAD_BAND_TOP_FRAC);
  float sum_x = 0.0f;
  float sum_w = 0.0f;
  long count = 0;
  int denom = (h - 1 - y0) > 0 ? (h - 1 - y0) : 1;

  for (int y = y0; y < h; y++) {
    float row_w = 0.6f + 0.8f * ((float)(y - y0) / (float)denom);
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

  // If mass is absurdly wide (ambiguous frame), prefer bottom-heavy band
  float absdev = 0.0f;
  for (int y = y0; y < h; y++) {
    float row_w = 0.6f + 0.8f * ((float)(y - y0) / (float)denom);
    const uint8_t *row = gray + y * w;
    for (int x = 0; x < w; x++) {
      if (row[x] < ROAD_DARK_THRESHOLD) {
        absdev += fabsf((float)x - mean_x) * row_w;
      }
    }
  }
  float sigma = absdev / sum_w;
  if (sigma > (float)w * 0.35f) {
    int yb = (int)(h * 0.72f);
    long c2 = 0;
    float sx2 = 0.0f;
    for (int y = yb; y < h; y++) {
      const uint8_t *row = gray + y * w;
      for (int x = 0; x < w; x++) {
        if (row[x] < ROAD_DARK_THRESHOLD) {
          sx2 += (float)x;
          c2++;
        }
      }
    }
    if (c2 < 20) return t;
    mean_x = sx2 / (float)c2;
    count = c2;
  }

  float conf = (float)count / 400.0f;
  if (conf > 1.0f) conf = 1.0f;

  t.x = mean_x * ((float)VISION_WIDTH / (float)w);
  t.w = 0.0f;  // x is already center
  t.conf = conf;
  t.found = conf > ROAD_MIN_CONF;
  return t;
}

inline VisionTarget vision_road_capture_and_detect() {
#ifdef USE_XIAO_CAMERA
  static uint8_t frame[VISION_WIDTH * VISION_HEIGHT];
  if (!xiao_camera_capture_gray96(frame)) {
    VisionTarget miss = {false, VISION_CENTER, 0, 0};
    return miss;
  }
  return vision_road_from_gray(frame, VISION_WIDTH, VISION_HEIGHT);
#else
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
