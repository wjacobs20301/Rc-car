/**
 * TrackFollowCar — XIAO ESP32S3 Sense (primary hardware target)
 *
 * Board: Seeed XIAO ESP32S3 Sense + OV2640
 * Pins (from your XIAO_ML_Drive_0.0.4):
 *   D0 = steering servo
 *   D2 = motor PWM
 *   D1 = forward
 *   D3 = reverse
 *
 * Default vision: road/tape centroid (no Edge Impulse needed).
 * Optional: FOMO dots with your ei-3d-print-03 model (see models/README.md).
 *
 * Arduino IDE:
 *   Board = "XIAO_ESP32S3"
 *   Tools → PSRAM → Enabled
 *   Library: ESP32Servo
 *
 * Simulator twin: cursor-continuation/simulator/
 */

#include "config.h"
#include "control.h"
#include "vision_road.h"

#if VISION_MODE == VISION_FOMO_DOTS
// #include <ei-3d-print-03-model-45Degree_inferencing.h>
// #include "vision_fomo.h"
#error "VISION_FOMO_DOTS selected but EI include is commented out. Use VISION_ROAD_CENTROID or see models/README.md."
#endif

#include <ESP32Servo.h>

Servo Steering_servo;
static ControlState g_ctrl;
static int g_act_steer;

void apply_actuators(const ControlState *c);

void setup() {
  Serial.begin(115200);
  delay(800);
  Serial.println(F("TrackFollowCar — XIAO ESP32S3 Sense"));

  pinMode(FORWARD_PIN, OUTPUT);
  pinMode(REVERSE_PIN, OUTPUT);
  pinMode(CONTROL_PIN, OUTPUT);
  digitalWrite(FORWARD_PIN, LOW);
  digitalWrite(REVERSE_PIN, LOW);
  analogWrite(CONTROL_PIN, 0);

  // ESP32Servo: allocate timers if needed
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  Steering_servo.setPeriodHertz(50);
  Steering_servo.attach(SERVO_PIN, 500, 2500);
  Steering_servo.write(MID_POINT);
  g_act_steer = MID_POINT;

  vision_road_init();
  control_init(&g_ctrl);

#ifdef USE_XIAO_CAMERA
  Serial.println(F("Camera: XIAO Sense OV2640 (USE_XIAO_CAMERA)"));
#else
  Serial.println(F("Camera: STUB"));
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
      // Your XIAO sketches often coast-stop; keep both-high brake option
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
