/**
 * Headless check of shared control math (mirrors firmware control.h).
 * Run: node cursor-continuation/simulator/js/control_test.mjs
 */
import {
  controlUpdate,
  MID_POINT,
  LOW_POINT,
  HIGH_POINT,
  VISION_CENTER,
} from "./control.js";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

// Centered target → straight
{
  const c = controlUpdate({ found: true, x: VISION_CENTER, w: 0 });
  assert(c.steerDeg === MID_POINT, `expected mid steer, got ${c.steerDeg}`);
  assert(c.drive === "forward", "expected forward");
  assert(c.throttle === 45, "expected crawl throttle");
}

// Target left of center → steer left (lower angle)
{
  const c = controlUpdate({ found: true, x: 20, w: 0 });
  assert(c.steerDeg < MID_POINT, `expected left steer, got ${c.steerDeg}`);
  assert(c.steerDeg >= LOW_POINT, "clamped low");
}

// Target right → steer right
{
  const c = controlUpdate({ found: true, x: 80, w: 10 });
  // p1 = 80+5-48 = 37 → 93+37=130 → clamp 123
  assert(c.steerDeg === HIGH_POINT, `expected high clamp, got ${c.steerDeg}`);
}

// Lost target → brake + straighten
{
  const c = controlUpdate({ found: false, x: 0, w: 0 });
  assert(c.drive === "brake", "expected brake");
  assert(c.throttle === 0, "expected zero throttle");
  assert(c.steerDeg === MID_POINT, "expected straighten");
}

console.log("control_test.mjs: all assertions passed");
