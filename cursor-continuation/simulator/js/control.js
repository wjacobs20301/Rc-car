/**
 * Shared control math — kept in sync with firmware control.h
 *
 * Uses PD steering on FOMO-space error (x - 48), plus:
 *  - throttle cut in sharp turns
 *  - lost-target grace + brake
 *  - servo slew limiting (real servos cannot jump instantly)
 */
export const MID_POINT = 93;
export const LOW_POINT = 63;
export const HIGH_POINT = 123;
export const VISION_WIDTH = 96;
export const VISION_CENTER = 48;
export const SLOW_SPEED = 42;
export const FAST_SPEED = 48;
export const MIN_SPEED = 28;
export const FOMO_CUTOFF = 0.85;

/** Tunables mirrored in firmware config.h */
export const KP = 1.35;           // deg per FOMO-pixel of error
export const KD = 0.55;           // damp overshoot
export const KI = 0.015;          // slow bias trim
export const I_LIMIT = 10;
export const SLEW_DEG_PER_FRAME = 10;
export const LOST_GRACE_FRAMES = 8;
export const HARD_TURN_ERR = 14;  // |err| above this → slow down

export function createController() {
  return {
    steerDeg: MID_POINT,
    throttle: 0,
    drive: "brake",
    p1: 0,
    integral: 0,
    prevErr: 0,
    lostFrames: 0,
    lastGoodSteer: MID_POINT,
  };
}

export function controlUpdate(state, target) {
  if (!target || !target.found) {
    state.lostFrames += 1;
    state.integral *= 0.9;
    if (state.lostFrames <= LOST_GRACE_FRAMES) {
      // Hold last good steer briefly — real cars don't snap to center mid-corner
      state.steerDeg = slew(state.steerDeg, state.lastGoodSteer, SLEW_DEG_PER_FRAME);
      state.throttle = Math.max(MIN_SPEED, state.throttle - 4);
      state.drive = state.throttle > 0 ? "forward" : "brake";
      state.p1 = state.prevErr;
      return snapshot(state);
    }
    state.drive = "brake";
    state.throttle = 0;
    state.steerDeg = slew(state.steerDeg, MID_POINT, SLEW_DEG_PER_FRAME);
    state.p1 = 0;
    return snapshot(state);
  }

  state.lostFrames = 0;
  // target.x is always the CENTER in FOMO space (road centroid or bbox mid).
  const err = target.x - VISION_CENTER;
  const deriv = err - state.prevErr;
  state.integral = clamp(state.integral + err * KI, -I_LIMIT, I_LIMIT);
  state.prevErr = err;
  state.p1 = err;

  let desired = MID_POINT + err * KP + deriv * KD + state.integral;
  desired = clamp(desired, LOW_POINT, HIGH_POINT);
  state.steerDeg = Math.round(slew(state.steerDeg, desired, SLEW_DEG_PER_FRAME));
  state.lastGoodSteer = state.steerDeg;

  // Slow in sharp turns — critical for hairpins on real hardware
  const turn = Math.abs(err);
  let thr = FAST_SPEED;
  if (turn > HARD_TURN_ERR * 0.45) {
    const t = Math.min(1, (turn - HARD_TURN_ERR * 0.45) / HARD_TURN_ERR);
    thr = Math.round(FAST_SPEED - t * (FAST_SPEED - MIN_SPEED));
  }
  state.throttle = clamp(thr, MIN_SPEED, FAST_SPEED);
  state.drive = "forward";
  return snapshot(state);
}

function snapshot(state) {
  return {
    steerDeg: state.steerDeg,
    throttle: state.throttle,
    drive: state.drive,
    p1: state.p1,
  };
}

export function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function slew(current, target, maxDelta) {
  const d = target - current;
  if (d > maxDelta) return current + maxDelta;
  if (d < -maxDelta) return current - maxDelta;
  return target;
}

/**
 * Map servo angle to yaw rate. Includes mild understeer at high speed.
 */
export function steerToYawRate(steerDeg, speed) {
  const offset = steerDeg - MID_POINT;
  const maxYaw = 2.8;
  const speedFactor = Math.min(1, Math.abs(speed) / 28);
  const understeer = 1 / (1 + Math.abs(speed) / 140);
  return (offset / 30) * maxYaw * Math.max(0.35, speedFactor) * understeer;
}
