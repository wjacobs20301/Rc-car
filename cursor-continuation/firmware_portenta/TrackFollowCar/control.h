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
  float x;     // FOMO-space center X (0..VISION_WIDTH)
  float w;     // width (optional)
  float conf;  // 0..1
};

struct ControlState {
  int steer_deg;
  int throttle;
  DriveMode drive;
  float p1;
  float integral;
  float prev_err;
  int lost_frames;
  int last_good_steer;
};

inline float tf_clampf(float v, float lo, float hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}

inline float tf_slew(float current, float target, float max_delta) {
  float d = target - current;
  if (d > max_delta) return current + max_delta;
  if (d < -max_delta) return current - max_delta;
  return target;
}

inline void control_init(ControlState *c) {
  c->steer_deg = MID_POINT;
  c->throttle = 0;
  c->drive = DRIVE_BRAKE;
  c->p1 = 0;
  c->integral = 0;
  c->prev_err = 0;
  c->lost_frames = 0;
  c->last_good_steer = MID_POINT;
}

/**
 * PD (+ light I) steering — supersedes naive LINEAR_STEERING for hairpins.
 * Contract stays FOMO-space: err = (x + w/2) - 48.
 * Simulator twin: cursor-continuation/simulator/js/control.js
 */
inline void control_update(ControlState *c, const VisionTarget *t) {
  if (!t->found) {
    c->lost_frames++;
    c->integral *= 0.9f;
    if (c->lost_frames <= LOST_GRACE_FRAMES) {
      c->steer_deg = (int)tf_slew((float)c->steer_deg, (float)c->last_good_steer, (float)SLEW_DEG_PER_FRAME);
      c->throttle = c->throttle > 4 ? c->throttle - 4 : 0;
      if (c->throttle < MIN_SPEED) c->throttle = 0;
      c->drive = c->throttle > 0 ? DRIVE_FORWARD : DRIVE_BRAKE;
      c->p1 = c->prev_err;
      return;
    }
    c->drive = DRIVE_BRAKE;
    c->throttle = 0;
    c->steer_deg = (int)tf_slew((float)c->steer_deg, (float)MID_POINT, (float)SLEW_DEG_PER_FRAME);
    c->p1 = 0;
    return;
  }

  c->lost_frames = 0;
  // t->x is always the CENTER in FOMO space (road centroid or bbox mid).
  float err = t->x - VISION_CENTER;
  float deriv = err - c->prev_err;
  c->integral = tf_clampf(c->integral + err * STEER_KI, -STEER_I_LIMIT, STEER_I_LIMIT);
  c->prev_err = err;
  c->p1 = err;

  float desired = (float)MID_POINT + err * STEER_KP + deriv * STEER_KD + c->integral;
  desired = tf_clampf(desired, (float)LOW_POINT, (float)HIGH_POINT);
  c->steer_deg = (int)tf_slew((float)c->steer_deg, desired, (float)SLEW_DEG_PER_FRAME);
  c->last_good_steer = c->steer_deg;

  float turn = fabsf(err);
  float thr = (float)FAST_SPEED;
  float soft = HARD_TURN_ERR * 0.45f;
  if (turn > soft) {
    float tnorm = (turn - soft) / HARD_TURN_ERR;
    if (tnorm > 1.0f) tnorm = 1.0f;
    thr = (float)FAST_SPEED - tnorm * (float)(FAST_SPEED - MIN_SPEED);
  }
  c->throttle = (int)tf_clampf(thr, (float)MIN_SPEED, (float)FAST_SPEED);
  c->drive = DRIVE_FORWARD;
}

#endif
