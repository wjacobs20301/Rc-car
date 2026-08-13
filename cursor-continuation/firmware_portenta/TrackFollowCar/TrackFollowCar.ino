/**
 * TrackFollowCar — Cursor continuation firmware for Portenta H7 + Vision Shield.
 *
 * Real-world oriented:
 *  - PD steering + servo slew (matches simulator/js/control.js)
 *  - Road-centroid vision on grayscale (no EI model required)
 *  - Optional Himax HM01B0 path via USE_PORTENTA_CAMERA in config.h
 *  - FOMO-dots mode when Edge Impulse library is re-attached
 *
 * Pins match RC-Car-Code Working-ML-Car (D2 servo, D5 PWM, D1/D3 dir).
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
static int g_act_steer;

void apply_actuators(const ControlState *c);

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println(F("TrackFollowCar v2 — PD + road centroid"));

  pinMode(FORWARD_PIN, OUTPUT);
  pinMode(REVERSE_PIN, OUTPUT);
  pinMode(CONTROL_PIN, OUTPUT);
  digitalWrite(FORWARD_PIN, LOW);
  digitalWrite(REVERSE_PIN, LOW);
  analogWrite(CONTROL_PIN, 0);

  Steering_servo.attach(SERVO_PIN);
  Steering_servo.write(MID_POINT);
  g_act_steer = MID_POINT;

  vision_road_init();
  control_init(&g_ctrl);

#ifdef USE_PORTENTA_CAMERA
  Serial.println(F("Camera: Himax HM01B0 (USE_PORTENTA_CAMERA)"));
#else
  Serial.println(F("Camera: STUB (define USE_PORTENTA_CAMERA for hardware)"));
#endif
  Serial.println(F("Ready."));
}

void loop() {
  VisionTarget target;

#if VISION_MODE == VISION_ROAD_CENTROID
  target = vision_road_capture_and_detect();
#else
  target.found = false;
  target.x = VISION_CENTER;
  target.w = 0.0f;
  target.conf = 0.0f;
#endif

  control_update(&g_ctrl, &target);
  apply_actuators(&g_ctrl);

  Serial.print(F("found="));
  Serial.print(target.found ? 1 : 0);
  Serial.print(F(" x="));
  Serial.print(target.x, 1);
  Serial.print(F(" conf="));
  Serial.print(target.conf, 2);
  Serial.print(F(" err="));
  Serial.print(g_ctrl.p1, 1);
  Serial.print(F(" steer="));
  Serial.print(g_ctrl.steer_deg);
  Serial.print(F(" thr="));
  Serial.println(g_ctrl.throttle);

  delay(LOOP_DELAY_MS);
}

void apply_actuators(const ControlState *c) {
  // Extra hardware slew — belt-and-suspenders with control.h slew
  int delta = c->steer_deg - g_act_steer;
  if (delta > SLEW_DEG_PER_FRAME) delta = SLEW_DEG_PER_FRAME;
  if (delta < -SLEW_DEG_PER_FRAME) delta = -SLEW_DEG_PER_FRAME;
  g_act_steer += delta;
  Steering_servo.write(g_act_steer);

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
