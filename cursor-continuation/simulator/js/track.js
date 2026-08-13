/**
 * Complex track library — centerline polylines sampled into a continuous path.
 * Tracks: oval, figure8, technical (hairpins + chicane), roomTape (tape-on-floor).
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function catmullRom(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  );
}

function buildClosedSpline(points, samplesPerSeg = 24) {
  const n = points.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const p3 = points[(i + 2) % n];
    for (let s = 0; s < samplesPerSeg; s++) {
      const t = s / samplesPerSeg;
      out.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t),
      });
    }
  }
  // Tangents
  for (let i = 0; i < out.length; i++) {
    const a = out[i];
    const b = out[(i + 1) % out.length];
    a.tx = b.x - a.x;
    a.ty = b.y - a.y;
  }
  return out;
}

function ovalPoints(cx, cy, rx, ry, n = 16) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    pts.push({ x: cx + Math.cos(t) * rx, y: cy + Math.sin(t) * ry });
  }
  return pts;
}

function figure8Points(cx, cy, rx, ry) {
  // Two lobes sharing a crossing — sample as lemniscate-like waypoints
  const pts = [];
  const n = 32;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    // Bernoulli lemniscate-ish in screen space
    const s = Math.sin(t);
    const c = Math.cos(t);
    const den = 1 + s * s;
    pts.push({
      x: cx + (rx * c) / den,
      y: cy + (ry * c * s) / den,
    });
  }
  return pts;
}

function technicalPoints(cx, cy, w, h) {
  // Hairpin left → long straight → chicane → hairpin right → return
  const m = 55;
  return [
    { x: cx - w * 0.38, y: cy + h * 0.32 },
    { x: cx - w * 0.42, y: cy + h * 0.05 },
    { x: cx - w * 0.38, y: cy - h * 0.28 }, // top of left hairpin
    { x: cx - w * 0.22, y: cy - h * 0.34 },
    { x: cx - w * 0.05, y: cy - h * 0.28 },
    { x: cx + w * 0.05, y: cy - h * 0.12 }, // enter chicane
    { x: cx + w * 0.12, y: cy + h * 0.02 },
    { x: cx + w * 0.05, y: cy + h * 0.14 },
    { x: cx + w * 0.18, y: cy + h * 0.22 },
    { x: cx + w * 0.36, y: cy + h * 0.28 }, // bottom right
    { x: cx + w * 0.42, y: cy + h * 0.05 },
    { x: cx + w * 0.38, y: cy - h * 0.22 }, // right hairpin
    { x: cx + w * 0.22, y: cy - h * 0.32 },
    { x: cx + w * 0.02, y: cy - h * 0.18 },
    { x: cx - w * 0.12, y: cy + h * 0.05 },
    { x: cx - w * 0.28, y: cy + h * 0.28 },
  ].map((p) => ({ x: p.x, y: p.y + m * 0 }));
}

function roomTapePoints(cx, cy, w, h) {
  // Rectangular "tape on floor" loop with rounded corners — like a real room course
  const insetX = w * 0.32;
  const insetY = h * 0.28;
  return [
    { x: cx - insetX, y: cy + insetY },
    { x: cx - insetX * 0.3, y: cy + insetY },
    { x: cx + insetX * 0.3, y: cy + insetY * 0.85 },
    { x: cx + insetX, y: cy + insetY * 0.4 },
    { x: cx + insetX, y: cy - insetY * 0.2 },
    { x: cx + insetX * 0.5, y: cy - insetY },
    { x: cx - insetX * 0.2, y: cy - insetY },
    { x: cx - insetX, y: cy - insetY * 0.35 },
  ];
}

const TRACK_BUILDERS = {
  oval: (w, h) => ({
    name: "Oval",
    roadHalfWidth: 42,
    points: ovalPoints(w / 2, h / 2, w * 0.38, h * 0.32),
    dotSpacing: 1,
  }),
  figure8: (w, h) => ({
    name: "Figure-8",
    roadHalfWidth: 36,
    points: figure8Points(w / 2, h / 2, w * 0.36, h * 0.34),
    dotSpacing: 1,
  }),
  technical: (w, h) => ({
    name: "Technical (hairpins)",
    roadHalfWidth: 34,
    points: technicalPoints(w / 2, h / 2, w, h),
    dotSpacing: 1,
  }),
  roomTape: (w, h) => ({
    name: "Room tape loop",
    roadHalfWidth: 28,
    points: roomTapePoints(w / 2, h / 2, w, h),
    dotSpacing: 2,
  }),
};

export class TrackWorld {
  constructor(width, height, trackId = "technical") {
    this.width = width;
    this.height = height;
    this.setTrack(trackId);
  }

  setTrack(trackId) {
    const builder = TRACK_BUILDERS[trackId] || TRACK_BUILDERS.technical;
    const spec = builder(this.width, this.height);
    this.trackId = trackId;
    this.name = spec.name;
    this.roadHalfWidth = spec.roadHalfWidth;
    this.centerSamples = buildClosedSpline(spec.points, 28);
    this.dots = this._buildDots(spec.dotSpacing);
    this._segLens = this._computeSegLens();
    this.totalLen = this._segLens.reduce((a, b) => a + b, 0);
  }

  _computeSegLens() {
    const lens = [];
    const n = this.centerSamples.length;
    for (let i = 0; i < n; i++) {
      const a = this.centerSamples[i];
      const b = this.centerSamples[(i + 1) % n];
      lens.push(Math.hypot(b.x - a.x, b.y - a.y));
    }
    return lens;
  }

  _buildDots(every) {
    const dots = [];
    for (let i = 0; i < this.centerSamples.length; i += Math.max(1, every * 3)) {
      const p = this.centerSamples[i];
      dots.push({ x: p.x, y: p.y, r: 6 });
    }
    return dots;
  }

  /** Parameter s in [0,1) along track. */
  centerline(s) {
    const dist = ((s % 1) + 1) % 1 * this.totalLen;
    let acc = 0;
    const n = this.centerSamples.length;
    for (let i = 0; i < n; i++) {
      const len = this._segLens[i];
      if (acc + len >= dist || i === n - 1) {
        const t = len > 0 ? (dist - acc) / len : 0;
        const a = this.centerSamples[i];
        const b = this.centerSamples[(i + 1) % n];
        return {
          x: lerp(a.x, b.x, t),
          y: lerp(a.y, b.y, t),
          tx: a.tx,
          ty: a.ty,
          index: i,
        };
      }
      acc += len;
    }
    const p = this.centerSamples[0];
    return { x: p.x, y: p.y, tx: p.tx, ty: p.ty, index: 0 };
  }

  nearestIndex(x, y) {
    let bestI = 0;
    let bestD = Infinity;
    for (let i = 0; i < this.centerSamples.length; i++) {
      const p = this.centerSamples[i];
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        bestI = i;
      }
    }
    return bestI;
  }

  nearestT(x, y) {
    return this.nearestIndex(x, y) / this.centerSamples.length;
  }

  signedLateralError(x, y) {
    const i = this.nearestIndex(x, y);
    const p = this.centerSamples[i];
    const len = Math.hypot(p.tx, p.ty) || 1;
    const nx = -p.ty / len;
    const ny = p.tx / len;
    return (x - p.x) * nx + (y - p.y) * ny;
  }

  onRoad(x, y) {
    return Math.abs(this.signedLateralError(x, y)) <= this.roadHalfWidth;
  }

  /** Distance from point to asphalt (0 = on centerline edge ok). */
  draw(ctx) {
    ctx.fillStyle = "#b7ad93";
    ctx.fillRect(0, 0, this.width, this.height);

    // Floor noise patches
    ctx.fillStyle = "rgba(0,0,0,0.03)";
    for (let i = 0; i < 40; i++) {
      const x = ((i * 97) % this.width);
      const y = ((i * 53) % this.height);
      ctx.beginPath();
      ctx.ellipse(x, y, 30 + (i % 5) * 8, 18 + (i % 3) * 6, i, 0, Math.PI * 2);
      ctx.fill();
    }

    // Road as thick stroked polyline
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = this.roadHalfWidth * 2;
    ctx.strokeStyle = "#2a2a2e";
    ctx.beginPath();
    const pts = this.centerSamples;
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();

    // Center dashes
    ctx.save();
    ctx.setLineDash([12, 14]);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#d9d0b8";
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    // Edge lines (white tape look for roomTape)
    if (this.trackId === "roomTape") {
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#f2f2f2";
      for (const side of [-1, 1]) {
        ctx.beginPath();
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          const len = Math.hypot(p.tx, p.ty) || 1;
          const nx = -p.ty / len;
          const ny = p.tx / len;
          const x = p.x + nx * this.roadHalfWidth * 0.92 * side;
          const y = p.y + ny * this.roadHalfWidth * 0.92 * side;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }

    for (const d of this.dots) {
      ctx.beginPath();
      ctx.fillStyle = "#1a5cff";
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

export const TRACK_IDS = Object.keys(TRACK_BUILDERS);
