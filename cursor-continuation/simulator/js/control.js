/**
 * Shared control math — mirror of firmware control.h / LINEAR_STEERING.h
 */
export const MID_POINT = 93;
export const LOW_POINT = 63;
export const HIGH_POINT = 123;
export const VISION_WIDTH = 96;
export const VISION_CENTER = 48;
export const SLOW_SPEED = 45;
export const FOMO_CUTOFF = 0.85;

export function controlUpdate(target) {
  if (!target || !target.found) {
    return { steerDeg: MID_POINT, throttle: 0, drive: "brake", p1: 0 };
  }
  const halfW = (target.w || 0) * 0.5;
  const p1 = target.x + halfW - VISION_CENTER;
  let steer = Math.round(p1 + MID_POINT);
  steer = Math.max(LOW_POINT, Math.min(HIGH_POINT, steer));
  return { steerDeg: steer, throttle: SLOW_SPEED, drive: "forward", p1 };
}

/**
 * Map servo angle to a steering rate (rad/s-ish) for the sim physics.
 * Mid = 93 → 0 turn. Full left/right ≈ ±30 deg → ±maxYaw.
 */
export function steerToYawRate(steerDeg, speed) {
  const offset = steerDeg - MID_POINT; // -30 .. +30
  const maxYaw = 2.2; // rad/s at full lock when moving
  const speedFactor = Math.min(1, Math.abs(speed) / 40);
  return (offset / 30) * maxYaw * speedFactor;
}
