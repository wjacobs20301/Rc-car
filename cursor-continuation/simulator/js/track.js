/**
 * Top-down track: closed loop with a dark asphalt road and optional floor dots.
 */
export class TrackWorld {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.cx = width / 2;
    this.cy = height / 2;
    this.rx = width * 0.38;
    this.ry = height * 0.32;
    this.roadHalfWidth = 42;
    this.dots = this._buildDots(24);
  }

  _buildDots(n) {
    const dots = [];
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      dots.push({
        x: this.cx + Math.cos(t) * this.rx,
        y: this.cy + Math.sin(t) * this.ry,
        r: 6,
      });
    }
    return dots;
  }

  /** Point on centerline for parameter t in [0, 2π). */
  centerline(t) {
    return {
      x: this.cx + Math.cos(t) * this.rx,
      y: this.cy + Math.sin(t) * this.ry,
      tx: -Math.sin(t) * this.rx,
      ty: Math.cos(t) * this.ry,
    };
  }

  /** Approximate nearest centerline parameter for a world point. */
  nearestT(x, y) {
    let bestT = 0;
    let bestD = Infinity;
    const steps = 180;
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const p = this.centerline(t);
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        bestT = t;
      }
    }
    return bestT;
  }

  signedLateralError(x, y) {
    const t = this.nearestT(x, y);
    const p = this.centerline(t);
    const len = Math.hypot(p.tx, p.ty) || 1;
    const nx = -p.ty / len;
    const ny = p.tx / len;
    return (x - p.x) * nx + (y - p.y) * ny;
  }

  draw(ctx) {
    // Floor
    ctx.fillStyle = "#c4b89a";
    ctx.fillRect(0, 0, this.width, this.height);

    // Subtle grid
    ctx.strokeStyle = "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < this.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y < this.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }

    // Road asphalt ellipse ring
    ctx.lineWidth = this.roadHalfWidth * 2;
    ctx.strokeStyle = "#2a2a2e";
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Center dashed line
    ctx.save();
    ctx.setLineDash([14, 12]);
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#e8e0c8";
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.rx, this.ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Floor dots / marks (FOMO targets)
    for (const d of this.dots) {
      ctx.beginPath();
      ctx.fillStyle = "#1a5cff";
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
