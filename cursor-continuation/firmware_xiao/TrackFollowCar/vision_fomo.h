#ifndef TRACK_FOLLOW_VISION_FOMO_H
#define TRACK_FOLLOW_VISION_FOMO_H

#include "config.h"
#include "control.h"

/**
 * FOMO-dots helper for when you re-attach ei-3d-print-03-model-45Degree
 * (same model your XIAO_ML_Drive sketches used).
 *
 * Returns bbox CENTER in FOMO space (control uses err = x - 48).
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
    if (labels[i][0] != '1' || labels[i][1] != '\0') continue;
    if (ys[i] > best_y) {
      best_y = ys[i];
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
