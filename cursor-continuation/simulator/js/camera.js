/**
 * Fake first-person camera: renders a low-res grayscale-ish road view
 * from the car's pose, then extracts either road centroid or nearest-dot X.
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
    this.fov = 1.1; // radians
    this.near = 8;
    this.far = 160;
  }

  /**
   * Render a simple ground-plane camera looking forward from (x,y,heading).
   * Uses ray samples into the top-down world colors.
   */
  capture(car) {
    const ctx = this.ctx;
    const res = this.res;
    const img = ctx.createImageData(res, res);

    for (let py = 0; py < res; py++) {
      // py=0 is horizon/top, py=res-1 is near bumper
      const depthFrac = py / (res - 1);
      const depth = this.near + depthFrac * depthFrac * (this.far - this.near);

      for (let px = 0; px < res; px++) {
        const nx = (px / (res - 1)) * 2 - 1; // -1..1
        const angle = car.heading + nx * (this.fov / 2);
        const wx = car.x + Math.cos(angle) * depth;
        const wy = car.y + Math.sin(angle) * depth;
        const color = this._sampleWorld(wx, wy);
        const i = (py * res + px) * 4;
        img.data[i] = color.r;
        img.data[i + 1] = color.g;
        img.data[i + 2] = color.b;
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return this.canvas;
  }

  _sampleWorld(x, y) {
    const w = this.world;
    // Outside world
    if (x < 0 || y < 0 || x >= w.width || y >= w.height) {
      return { r: 90, g: 110, b: 70 };
    }

    // Dots
    for (const d of w.dots) {
      const dd = (d.x - x) ** 2 + (d.y - y) ** 2;
      if (dd <= d.r * d.r) return { r: 30, g: 80, b: 255 };
    }

    // Road vs floor via ellipse distance
    const dx = (x - w.cx) / w.rx;
    const dy = (y - w.cy) / w.ry;
    const r = Math.hypot(dx, dy);
    const half = w.roadHalfWidth / ((w.rx + w.ry) / 2);
    if (Math.abs(r - 1) < half) {
      // center dashed line bright
      const t = Math.atan2(dy, dx);
      const dash = Math.abs(((t * w.rx) % 26) ) < 8;
      if (Math.abs(r - 1) < half * 0.08 && dash) {
        return { r: 220, g: 210, b: 190 };
      }
      return { r: 40, g: 40, b: 44 };
    }
    return { r: 196, g: 184, b: 154 };
  }

  /** Road-centroid in FOMO space (0..96). Mirrors vision_road_from_gray. */
  detectRoadCentroid() {
    const res = this.res;
    const data = this.ctx.getImageData(0, 0, res, res).data;
    const y0 = Math.floor(res * 0.55);
    let sumX = 0;
    let count = 0;
    const darkThresh = 90;

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
    if (count < 40) return { found: false, x: VISION_CENTER, w: 0 };
    const meanX = sumX / count;
    return {
      found: true,
      x: meanX * (VISION_WIDTH / res),
      w: 0,
    };
  }

  /** Nearest blue floor-dot projected into FOMO X (prefer largest Y in frame). */
  detectNearestDot() {
    const res = this.res;
    const data = this.ctx.getImageData(0, 0, res, res).data;
    let bestY = -1;
    let bestX = VISION_CENTER;
    let found = false;

    for (let y = 0; y < res; y++) {
      for (let x = 0; x < res; x++) {
        const i = (y * res + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        // Blue-ish mark
        if (b > 180 && b > r + 40 && b > g + 40) {
          if (y >= bestY) {
            bestY = y;
            bestX = x;
            found = true;
          }
        }
      }
    }
    if (!found) return { found: false, x: VISION_CENTER, w: 0 };
    return {
      found: true,
      x: bestX * (VISION_WIDTH / res),
      w: 8 * (VISION_WIDTH / res),
    };
  }
}
