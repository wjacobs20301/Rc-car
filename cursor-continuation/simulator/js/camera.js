/**
 * Realistic fake camera for Portenta Vision Shield–style downward view.
 * - ~40–50° look-down toward the floor (matches original 45° FOMO training)
 * - Soft vignette, noise, uneven lighting, optional motion smear
 * - Detection mirrors firmware vision_road_from_gray (lower-band dark centroid)
 */
import { VISION_WIDTH, VISION_CENTER } from "./control.js";

export class FakeCamera {
  constructor(world, resolution = 96) {
    this.world = world;
    this.res = resolution;
    this.canvas = document.createElement("canvas");
    this.canvas.width = resolution;
    this.canvas.height = resolution;
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });

    // Geometry tuned so lower image rows = near bumper, upper = look-ahead
    this.lookDown = 0.72; // 0=horizon flat, 1=straight down
    this.fov = 1.05;
    this.near = 12;
    this.far = 145;

    this.realism = {
      noise: true,
      lighting: true,
      blur: true,
      dropFrameRate: 0.02, // occasional lost frames like real cam
    };
    this._lastFrameOk = true;
    this._scratch = null;
  }

  setWorld(world) {
    this.world = world;
  }

  capture(car) {
    // Occasional dropped frame → keep previous buffer / fail detect
    if (this.realism.dropFrameRate > 0 && Math.random() < this.realism.dropFrameRate) {
      this._lastFrameOk = false;
      return this.canvas;
    }
    this._lastFrameOk = true;

    const ctx = this.ctx;
    const res = this.res;
    const img = ctx.createImageData(res, res);

    // Lighting: slow spatial gradient (window light)
    const lightAngle = (performance.now() / 8000) % (Math.PI * 2);
    const lx = Math.cos(lightAngle);
    const ly = Math.sin(lightAngle);

    for (let py = 0; py < res; py++) {
      const depthFrac = py / (res - 1);
      // Emphasize look-down: near rows denser, far rows compressed
      const depth =
        this.near +
        Math.pow(depthFrac, 1.35 + this.lookDown * 0.4) * (this.far - this.near);

      for (let px = 0; px < res; px++) {
        const nx = (px / (res - 1)) * 2 - 1;
        const angle = car.heading + nx * (this.fov / 2) * (0.85 + depthFrac * 0.3);
        const wx = car.x + Math.cos(angle) * depth;
        const wy = car.y + Math.sin(angle) * depth;
        let color = this._sampleWorld(wx, wy);

        if (this.realism.lighting) {
          const shade = 0.82 + 0.22 * ((wx / this.world.width) * lx + (wy / this.world.height) * ly);
          color = {
            r: clamp8(color.r * shade),
            g: clamp8(color.g * shade),
            b: clamp8(color.b * shade),
          };
        }

        // Vignette (Himax-ish falloff)
        const vx = (px / res - 0.5) * 2;
        const vy = (py / res - 0.5) * 2;
        const vig = 1 - 0.22 * (vx * vx + vy * vy);
        color = {
          r: clamp8(color.r * vig),
          g: clamp8(color.g * vig),
          b: clamp8(color.b * vig),
        };

        if (this.realism.noise) {
          const n = (Math.random() - 0.5) * 28;
          color = {
            r: clamp8(color.r + n),
            g: clamp8(color.g + n),
            b: clamp8(color.b + n),
          };
        }

        const i = (py * res + px) * 4;
        img.data[i] = color.r;
        img.data[i + 1] = color.g;
        img.data[i + 2] = color.b;
        img.data[i + 3] = 255;
      }
    }

    // Cheap horizontal smear when moving fast
    if (this.realism.blur && Math.abs(car.speed) > 35) {
      this._motionSmear(img, res, car.speed);
    }

    ctx.putImageData(img, 0, 0);
    return this.canvas;
  }

  _motionSmear(img, res, speed) {
    const amount = Math.min(3, Math.round(Math.abs(speed) / 40));
    if (amount <= 0) return;
    const copy = new Uint8ClampedArray(img.data);
    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        let r = 0, g = 0, b = 0, c = 0;
        for (let k = -amount; k <= amount; k++) {
          const xx = Math.min(res - 1, Math.max(0, x + k));
          const i = (y * res + xx) * 4;
          r += copy[i];
          g += copy[i + 1];
          b += copy[i + 2];
          c++;
        }
        const o = (y * res + x) * 4;
        img.data[o] = r / c;
        img.data[o + 1] = g / c;
        img.data[o + 2] = b / c;
      }
    }
  }

  _sampleWorld(x, y) {
    const w = this.world;
    if (x < 0 || y < 0 || x >= w.width || y >= w.height) {
      return { r: 88, g: 102, b: 72 };
    }
    for (const d of w.dots) {
      const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
      if (dd <= d.r * d.r) return { r: 30, g: 80, b: 255 };
    }
    const lat = Math.abs(w.signedLateralError(x, y));
    if (lat <= w.roadHalfWidth) {
      // dashed centerline
      const idx = w.nearestIndex(x, y);
      if (lat < 3 && idx % 6 < 3) return { r: 220, g: 210, b: 190 };
      // asphalt grain
      const grain = ((Math.floor(x) * 13 + Math.floor(y) * 7) % 17) - 8;
      return { r: 42 + grain, g: 42 + grain, b: 46 + grain };
    }
    // Floor
    const grain = ((Math.floor(x) * 3 + Math.floor(y) * 5) % 11);
    return { r: 190 + grain, g: 178 + grain, b: 150 + grain };
  }

  /**
   * Road centroid — mirrors firmware vision_road_from_gray:
   * lower band, dark pixels, column mass, confidence via pixel count + spread.
   */
  detectRoadCentroid() {
    if (!this._lastFrameOk) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };

    const res = this.res;
    const data = this.ctx.getImageData(0, 0, res, res).data;
    const y0 = Math.floor(res * 0.48);
    const darkThresh = 95;
    const colMass = new Float32Array(res);

    let count = 0;
    for (let y = y0; y < res; y++) {
      // Weight nearer rows higher (more trustworthy for steering)
      const rowW = 0.6 + 0.8 * ((y - y0) / Math.max(1, res - 1 - y0));
      for (let x = 0; x < res; x++) {
        const i = (y * res + x) * 4;
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        if (gray < darkThresh) {
          colMass[x] += rowW;
          count++;
        }
      }
    }
    if (count < 35) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };

    let sumX = 0;
    let sumW = 0;
    for (let x = 0; x < res; x++) {
      sumX += x * colMass[x];
      sumW += colMass[x];
    }
    if (sumW < 1) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };

    const meanX = sumX / sumW;
    // Width estimate from mass spread
    let varSum = 0;
    for (let x = 0; x < res; x++) {
      const d = x - meanX;
      varSum += colMass[x] * d * d;
    }
    const sigma = Math.sqrt(varSum / sumW);
    const conf = Math.min(1, count / 400);

    // Reject absurdly wide mass (e.g. figure-8 crossing filling the frame)
    if (sigma > res * 0.35) {
      // Fall back to bottom-most rows only
      return this._centroidBottomHeavy(data, res, darkThresh);
    }

    return {
      found: conf > 0.12,
      x: meanX * (VISION_WIDTH / res),
      w: 0, // x is already center — do not add w/2 in control
      conf,
    };
  }

  _centroidBottomHeavy(data, res, darkThresh) {
    const y0 = Math.floor(res * 0.72);
    let sumX = 0;
    let count = 0;
    for (let y = y0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const i = (y * res + x) * 4;
        const gray = 0.3 * data[i] + 0.59 * data[i + 1] + 0.11 * data[i + 2];
        if (gray < darkThresh) {
          sumX += x;
          count++;
        }
      }
    }
    if (count < 20) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };
    return {
      found: true,
      x: (sumX / count) * (VISION_WIDTH / res),
      w: 0,
      conf: Math.min(1, count / 200),
    };
  }

  detectNearestDot() {
    if (!this._lastFrameOk) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };
    const res = this.res;
    const data = this.ctx.getImageData(0, 0, res, res).data;
    let bestY = -1;
    let bestX = VISION_CENTER;
    let found = false;
    let hits = 0;

    for (let y = Math.floor(res * 0.25); y < res; y++) {
      for (let x = 0; x < res; x++) {
        const i = (y * res + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        if (b > 160 && b > r + 35 && b > g + 35) {
          hits++;
          if (y >= bestY) {
            bestY = y;
            bestX = x;
            found = true;
          }
        }
      }
    }
    if (!found || hits < 4) return { found: false, x: VISION_CENTER, w: 0, conf: 0 };
    return {
      found: true,
      x: bestX * (VISION_WIDTH / res), // already a point center
      w: 0,
      conf: Math.min(1, hits / 40),
    };
  }
}

function clamp8(v) {
  return Math.max(0, Math.min(255, v | 0));
}
