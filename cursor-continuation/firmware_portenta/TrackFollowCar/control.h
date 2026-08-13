#ifndef TRACK_FOLLOW_CONTROL_H
#define TRACK_FOLLOW_CONTROL_H

#include "config.h"
#include <Arduino.h>

enum DriveMode : uint8_t {
  DRIVE_COAST = 0,
  DRIVE_FORWARD = 1,
  DRIVE_BRAKE = 2
};

struct VisionTarget {
  bool found;
  float x;   // FOMO-space center X (0..VISION_WIDTH)
  float w;   // width (optional)
};

struct ControlState {
  int steer_deg;
  int throttle;
  DriveMode drive;
};

inline void control_init(ControlState *c) {
  c->steer_deg = MID_POINT;
  c->throttle = 0;
  c->drive = DRIVE_BRAKE;
}

/**
 * Linear steering — port of ML_CAR LINEAR_STEERING.h
 *   P1 = (x + w/2) - 48
 *   steer = constrain(P1 + MID_POINT, LOW_POINT, HIGH_POINT)
 *
 * For road centroid we pass w=0 and x already as the center.
 */
inline void control_update(ControlState *c, const VisionTarget *t) {
  if (!t->found) {
#ifdef USE_COAST_WHEN_LOST
    c->drive = DRIVE_COAST;
#else
    c->drive = DRIVE_BRAKE;
#endif
    c->throttle = 0;
    c->steer_deg = MID_POINT;  // straighten when lost (USE_STRAIGHT behavior)
    return;
  }

  float half_w = t->w * 0.5f;
  float p1 = (t->x + half_w) - VISION_CENTER;
  float strg = p1 + (float)MID_POINT;
  int steer = (int)strg;
  if (steer < LOW_POINT) steer = LOW_POINT;
  if (steer > HIGH_POINT) steer = HIGH_POINT;

  c->steer_deg = steer;
  c->throttle = SLOW_SPEED;
  c->drive = DRIVE_FORWARD;
}

#endif
