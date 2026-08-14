#ifndef TRACK_FOLLOW_XIAO_CAMERA_H
#define TRACK_FOLLOW_XIAO_CAMERA_H

/**
 * Seeed XIAO ESP32S3 Sense camera (OV2640) via esp_camera.
 * Pin map copied from your XIAO_ML_Drive_0.0.2 / 0.0.4 sketches.
 *
 * Capture path for road-centroid (no Edge Impulse):
 *   JPEG QVGA → RGB888 → grayscale 96×96
 */

#include "config.h"
#include "esp_camera.h"
#include <stdlib.h>
#include <string.h>

// XIAO ESP32S3 Sense camera pins (from your working sketches)
#define PWDN_GPIO_NUM     -1
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM     10
#define SIOD_GPIO_NUM     40
#define SIOC_GPIO_NUM     39
#define Y9_GPIO_NUM       48
#define Y8_GPIO_NUM       11
#define Y7_GPIO_NUM       12
#define Y6_GPIO_NUM       14
#define Y5_GPIO_NUM       16
#define Y4_GPIO_NUM       18
#define Y3_GPIO_NUM       17
#define Y2_GPIO_NUM       15
#define VSYNC_GPIO_NUM    38
#define HREF_GPIO_NUM     47
#define PCLK_GPIO_NUM     13

#define XIAO_CAM_W  320
#define XIAO_CAM_H  240

static bool g_xiao_cam_ok = false;
static uint8_t *g_rgb = nullptr;  // 320*240*3

static camera_config_t g_xiao_cam_config = {
    .pin_pwdn = PWDN_GPIO_NUM,
    .pin_reset = RESET_GPIO_NUM,
    .pin_xclk = XCLK_GPIO_NUM,
    .pin_sscb_sda = SIOD_GPIO_NUM,
    .pin_sscb_scl = SIOC_GPIO_NUM,
    .pin_d7 = Y9_GPIO_NUM,
    .pin_d6 = Y8_GPIO_NUM,
    .pin_d5 = Y7_GPIO_NUM,
    .pin_d4 = Y6_GPIO_NUM,
    .pin_d3 = Y5_GPIO_NUM,
    .pin_d2 = Y4_GPIO_NUM,
    .pin_d1 = Y3_GPIO_NUM,
    .pin_d0 = Y2_GPIO_NUM,
    .pin_vsync = VSYNC_GPIO_NUM,
    .pin_href = HREF_GPIO_NUM,
    .pin_pclk = PCLK_GPIO_NUM,
    .xclk_freq_hz = 20000000,
    .ledc_timer = LEDC_TIMER_0,
    .ledc_channel = LEDC_CHANNEL_0,
    .pixel_format = PIXFORMAT_JPEG,
    .frame_size = FRAMESIZE_QVGA,
    .jpeg_quality = 12,
    .fb_count = 1,
    .fb_location = CAMERA_FB_IN_PSRAM,
    .grab_mode = CAMERA_GRAB_WHEN_EMPTY,
};

inline bool xiao_camera_init() {
  if (g_xiao_cam_ok) return true;

  esp_err_t err = esp_camera_init(&g_xiao_cam_config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed: 0x%x\n", (unsigned)err);
    return false;
  }

  g_rgb = (uint8_t *)ps_malloc(XIAO_CAM_W * XIAO_CAM_H * 3);
  if (!g_rgb) {
    g_rgb = (uint8_t *)malloc(XIAO_CAM_W * XIAO_CAM_H * 3);
  }
  if (!g_rgb) {
    Serial.println(F("ERR: RGB buffer alloc failed"));
    return false;
  }

  g_xiao_cam_ok = true;
  return true;
}

/** Area-average RGB888 QVGA → grayscale 96×96. */
inline void xiao_rgb_to_gray96(const uint8_t *rgb, uint8_t *out96) {
  const int sw = XIAO_CAM_W;
  const int sh = XIAO_CAM_H;
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
        const uint8_t *row = rgb + (sy * sw + sx0) * 3;
        for (int sx = sx0; sx < sx1; sx++) {
          // RGB888 → luma
          sum += (77 * row[0] + 150 * row[1] + 29 * row[2]) >> 8;
          row += 3;
          n++;
        }
      }
      out96[y * dw + x] = (uint8_t)(n ? sum / n : 0);
    }
  }
}

inline bool xiao_camera_capture_gray96(uint8_t *out96) {
  if (!g_xiao_cam_ok || !g_rgb || !out96) return false;

  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println(F("Camera capture failed"));
    return false;
  }

  // fmt2rgb888 is provided by esp32-camera / img_converters
  bool ok = fmt2rgb888(fb->buf, fb->len, PIXFORMAT_JPEG, g_rgb);
  esp_camera_fb_return(fb);
  if (!ok) {
    Serial.println(F("JPEG→RGB failed"));
    return false;
  }

  xiao_rgb_to_gray96(g_rgb, out96);
  return true;
}

#endif
