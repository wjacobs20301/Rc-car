/**
 * TrackFollowCar — Cursor continuation firmware for Portenta H7 + Vision Shield.
 *
 * Reuses the original RC-car pin map and linear steering math from RC-Car-Code/.
 * Vision modes (see config.h):
 *   VISION_FOMO_DOTS      — Edge Impulse FOMO floor-mark following (needs EI library)
 *   VISION_ROAD_CENTROID  — simple grayscale road/line centroid (no EI model required)
 *
 * Simulator twin: cursor-continuation/simulator/ (same control contract).
 */

#include "config.h"
#include "control.h"
#include "vision_road.h"

#if VISION_MODE == VISION_FOMO_DOTS
// Install your Edge Impulse Arduino library, then uncomment:
// #include <ei-3d-print-03-model-45Degree_inferencing.h>
// #include "vision_fomo.h"
#error "VISION_FOMO_DOTS selected but Edge Impulse include is commented out. See models/README.md or switch to VISION_ROAD_CENTROID."
#endif

#include <Servo.h>

Servo Steering_servo;

static ControlState g_ctrl;

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("TrackFollowCar — cursor-continuation"));

  pinMode(FORWARD_PIN, OUTPUT);
  pinMode(REVERSE_PIN, OUTPUT);
  pinMode(CONTROL_PIN, OUTPUT);
  digitalWrite(FORWARD_PIN, LOW);
  digitalWrite(REVERSE_PIN, LOW);
  analogWrite(CONTROL_PIN, 0);

  Steering_servo.attach(SERVO_PIN);
  Steering_servo.write(MID_POINT);

  vision_road_init();
  control_init(&g_ctrl);

  Serial.println(F("Ready. VISION_ROAD_CENTROID active (default)."));
}

void loop() {
  VisionTarget target;

#if VISION_MODE == VISION_ROAD_CENTROID
  target = vision_road_capture_and_detect();
#else
  target.found = false;
  target.x = 48.0f;
  target.w = 0.0f;
#endif

  control_update(&g_ctrl, &target);
  apply_actuators(&g_ctrl);

  Serial.print(F("found="));
  Serial.print(target.found ? 1 : 0);
  Serial.print(F(" x="));
  Serial.print(target.x, 1);
  Serial.print(F(" steer="));
  Serial.print(g_ctrl.steer_deg);
  Serial.print(F(" thr="));
  Serial.println(g_ctrl.throttle);

  delay(LOOP_DELAY_MS);
}

void apply_actuators(const ControlState *c) {
  Steering_servo.write(c->steer_deg);

  switch (c->drive) {
    case DRIVE_FORWARD:
      digitalWrite(FORWARD_PIN, HIGH);
      digitalWrite(REVERSE_PIN, LOW);
      analogWrite(CONTROL_PIN, c->throttle);
      break;
    case DRIVE_BRAKE:
      digitalWrite(FORWARD_PIN, HIGH);
      digitalWrite(REVERSE_PIN, HIGH);
      analogWrite(CONTROL_PIN, 0);
      break;
    case DRIVE_COAST:
    default:
      digitalWrite(FORWARD_PIN, LOW);
      digitalWrite(REVERSE_PIN, LOW);
      analogWrite(CONTROL_PIN, 0);
      break;
  }
}
