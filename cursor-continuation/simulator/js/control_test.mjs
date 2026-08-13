/**
 * Headless check of shared PD control math (mirrors firmware control.h).
 * Run: node cursor-continuation/simulator/js/control_test.mjs
 */
import {
  createController,
  controlUpdate,
  MID_POINT,
  LOW_POINT,
  HIGH_POINT,
  VISION_CENTER,
  MIN_SPEED,
  SLEW_DEG_PER_FRAME,
} from "./control.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Centered target → near straight, forward
{
  const s = createController();
  const c = controlUpdate(s, { found: true, x: VISION_CENTER, w: 0 });
  assert(Math.abs(c.steerDeg - MID_POINT) <= 2, `expected near mid, got ${c.steerDeg}`);
  assert(c.drive === "forward", "expected forward");
  assert(c.throttle >= MIN_SPEED, "expected throttle");
}

// Target left of center → steer left over a few frames
{
  const s = createController();
  let c;
  for (let i = 0; i < 10; i++) {
    c = controlUpdate(s, { found: true, x: 20, w: 0 });
  }
  assert(c.steerDeg < MID_POINT, `expected left steer, got ${c.steerDeg}`);
  assert(c.steerDeg >= LOW_POINT, "clamped low");
}

// Hard right → right of mid, throttle reduced
{
  const s = createController();
  let c;
  for (let i = 0; i < 20; i++) {
    c = controlUpdate(s, { found: true, x: 85, w: 0 });
  }
  assert(c.steerDeg > MID_POINT, `expected right, got ${c.steerDeg}`);
  assert(c.steerDeg <= HIGH_POINT, "clamped high");
  assert(c.throttle < 55, `expected turn throttle cut, got ${c.throttle}`);
}

// Lost target: grace then brake + straighten
{
  const s = createController();
  controlUpdate(s, { found: true, x: 40, w: 0 });
  let c;
  for (let i = 0; i < 30; i++) {
    c = controlUpdate(s, { found: false, x: 0, w: 0 });
  }
  assert(c.drive === "brake", "expected brake after grace");
  assert(c.throttle === 0, "expected zero throttle");
  assert(Math.abs(c.steerDeg - MID_POINT) <= SLEW_DEG_PER_FRAME, `expected near mid after straighten, got ${c.steerDeg}`);
}

// Slew limit: cannot jump full lock in one frame
{
  const s = createController();
  const c = controlUpdate(s, { found: true, x: 90, w: 0 });
  assert(Math.abs(c.steerDeg - MID_POINT) <= SLEW_DEG_PER_FRAME, `slew broken: ${c.steerDeg}`);
}

console.log("control_test.mjs: all assertions passed");
