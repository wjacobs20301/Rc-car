#ifndef TRACK_FOLLOW_PORTENTA_CAMERA_H
#define TRACK_FOLLOW_PORTENTA_CAMERA_H

/**
 * Himax HM01B0 capture for Arduino Portenta H7 Vision Shield.
 *
 * Adapted from the project's Edge Impulse camera helper
 * (RC-Car-Code/.../edge-impulse-advanced-v2.h) but without requiring an
 * Edge Impulse model — grayscale frames only for road-centroid mode.
 *
 * Enable with: #define USE_PORTENTA_CAMERA in config.h
 *
 * Requires Arduino Portenta camera + himax libraries (shipped with the
 * Arduino Mbed Portenta core / Vision Shield examples).
 */

#include "config.h"
#include "camera.h"
#include "himax.h"
#include <stdlib.h>
#include <string.h>

#ifndef PORTENTA_CAM_W
#define PORTENTA_CAM_W 320
#define PORTENTA_CAM_H 320
#endif

static HM01B0 g_himax;
static Camera g_cam(g_himax);
static FrameBuffer g_fb;
static bool g_cam_ok = false;
static uint8_t *g_raw = nullptr;

inline bool portenta_camera_init() {
  if (g_cam_ok) return true;
  if (!g_cam.begin(CAMERA_R320x320, CAMERA_GRAYSCALE, 30)) {
    return false;
  }
  // Prefer SDRAM for the 320x320 buffer when available.
#ifdef SDRAM_START_ADDRESS
  // Soft dependency — if SDRAM header isn't present, fall through to heap.
#endif
  g_raw = (uint8_t *)malloc(PORTENTA_CAM_W * PORTENTA_CAM_H);
  if (!g_raw) return false;
  g_cam_ok = true;
  return true;
}

/**
 * Box-downsample 320x320 → 96x96 grayscale into out[96*96].
 * (Nearest-neighbor / area average — good enough for dark-road centroid.)
 */
inline void portenta_downsample_96(const uint8_t *src, uint8_t *out) {
  const int sw = PORTENTA_CAM_W;
  const int sh = PORTENTA_CAM_H;
  const int dw = VISION_WIDTH;
  const int dh = VISION_HEIGHT;
  for (int y = 0; y < dh; y++) {
    int sy0 = y * sh / dh;
    int sy1 = (y + 1) * sh / dh;
    if (sy1 <= sy0) sy1 = sy0 + 1;
    for (int x = 0; x < dw; x++) {
      int sx0 = x * sw / dw;
      int sx1 = (x + 1) * sw / dw;
      if (sx1 <= sx0) sx1 = sx0 + 1;
      unsigned sum = 0;
      unsigned n = 0;
      for (int sy = sy0; sy < sy1; sy++) {
        const uint8_t *row = src + sy * sw;
        for (int sx = sx0; sx < sx1; sx++) {
          sum += row[sx];
          n++;
        }
      }
      out[y * dw + x] = (uint8_t)(n ? sum / n : 0);
    }
  }
}

inline bool portenta_camera_capture_gray96(uint8_t *out96) {
  if (!g_cam_ok || !g_raw || !out96) return false;

  // GrabFrame into our buffer — API mirrors Portenta camera examples.
  if (g_cam.grabFrame(g_fb, 3000) != 0) {
    return false;
  }
  // FrameBuffer::getBuffer() returns the sensor frame.
  uint8_t *buf = g_fb.getBuffer();
  if (!buf) return false;

  // Copy (Himax may DMA into fb); then downsample.
  memcpy(g_raw, buf, PORTENTA_CAM_W * PORTENTA_CAM_H);
  portenta_downsample_96(g_raw, out96);
  return true;
}

#endif
