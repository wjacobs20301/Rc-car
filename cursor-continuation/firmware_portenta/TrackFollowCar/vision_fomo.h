#ifndef TRACK_FOLLOW_VISION_FOMO_H
#define TRACK_FOLLOW_VISION_FOMO_H

#include "config.h"
#include "control.h"

/**
 * FOMO-dots vision helper — enabled when VISION_FOMO_DOTS + EI library are wired.
 *
 * Port of Working-ML-Car logic:
 *   - Keep detections with score >= FOMO_CUTOFF and label "1"
 *   - Prefer largest Y (closest mark)
 *   - Expose center X / width for linear steering
 *
 * Requires run_classifier() / ei_camera_* from your Edge Impulse deployment.
 * This header is intentionally a template; fill capture + classify calls when
 * you re-attach the model (see models/README.md).
 */

#if VISION_MODE == VISION_FOMO_DOTS

inline VisionTarget vision_fomo_from_boxes(
    const float *scores,
    const char **labels,
    const int *xs,
    const int *ys,
    const int *ws,
    const int *hs,
    int count
) {
  VisionTarget t;
  t.found = false;
  t.x = VISION_CENTER;
  t.w = 0.0f;
  t.conf = 0.0f;

  int best_y = -1;
  for (int i = 0; i < count; i++) {
    if (scores[i] < FOMO_CUTOFF) continue;
    if (labels[i] == nullptr) continue;
    // Original car used label "1" for the floor mark.
    if (labels[i][0] != '1' || labels[i][1] != '\0') continue;
    if (ys[i] > best_y) {
      best_y = ys[i];
      // Store CENTER (legacy LINEAR_STEERING used x + w/2 externally).
      t.x = (float)xs[i] + (float)ws[i] * 0.5f;
      t.w = (float)ws[i];
      t.conf = scores[i];
      t.found = true;
    }
  }
  return t;
}

#endif
#endif
