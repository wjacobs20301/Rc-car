import { TrackWorld } from "./track.js";
import { FakeCamera } from "./camera.js";
import {
  controlUpdate,
  steerToYawRate,
  MID_POINT,
  LOW_POINT,
  HIGH_POINT,
} from "./control.js";

const worldCanvas = document.getElementById("world");
const camCanvas = document.getElementById("camera");
const worldCtx = worldCanvas.getContext("2d");
const camCtx = camCanvas.getContext("2d");

const elSteer = document.getElementById("steer");
const elThrottle = document.getElementById("throttle");
const elTarget = document.getElementById("target");
const elMode = document.getElementById("mode");
const elLap = document.getElementById("lap");
const btnStart = document.getElementById("btn-start");
const btnReset = document.getElementById("btn-reset");
const modeSelect = document.getElementById("vision-mode");

const world = new TrackWorld(worldCanvas.width, worldCanvas.height);
const camera = new FakeCamera(world, 96);

const car = {
  x: 0,
  y: 0,
  heading: 0,
  speed: 0,
  length: 28,
  width: 16,
};

let running = false;
let lastTs = 0;
let lapCount = 0;
let lastCrossT = 0;
let framesSeen = 0;
let framesLost = 0;

function resetCar() {
  const p = world.centerline(0);
  car.x = p.x;
  car.y = p.y;
  car.heading = Math.atan2(p.ty, p.tx);
  car.speed = 0;
  lapCount = 0;
  lastCrossT = 0;
  framesSeen = 0;
  framesLost = 0;
  elLap.textContent = "0";
}

function drawCar(ctx) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);
  // body
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  // nose
  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(car.length / 2 - 6, -car.width / 2, 6, car.width);
  // camera frustum hint
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(50, -28);
  ctx.lineTo(50, 28);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHudOverlay(target, ctrl) {
  // draw target X marker on camera preview
  const scale = camCanvas.width / 96;
  if (target.found) {
    camCtx.strokeStyle = "#00ff88";
    camCtx.lineWidth = 2;
    const mx = target.x * scale;
    camCtx.beginPath();
    camCtx.moveTo(mx, 0);
    camCtx.lineTo(mx, camCanvas.height);
    camCtx.stroke();
  }
  // center line
  camCtx.strokeStyle = "rgba(255,255,0,0.5)";
  camCtx.beginPath();
  camCtx.moveTo(camCanvas.width / 2, 0);
  camCtx.lineTo(camCanvas.width / 2, camCanvas.height);
  camCtx.stroke();

  elSteer.textContent = `${ctrl.steerDeg}° (mid ${MID_POINT}, ${LOW_POINT}–${HIGH_POINT})`;
  elThrottle.textContent = `${ctrl.throttle}  drive=${ctrl.drive}`;
  elTarget.textContent = target.found
    ? `found  x=${target.x.toFixed(1)}  p1=${ctrl.p1.toFixed(1)}`
    : "LOST — braking / straighten";
  elMode.textContent = modeSelect.value;
}

function maybeCountLap() {
  // Count lap when car crosses t≈0 going forward
  const t = world.nearestT(car.x, car.y);
  if (lastCrossT > Math.PI * 1.7 && t < 0.4) {
    lapCount += 1;
    elLap.textContent = String(lapCount);
  }
  lastCrossT = t;
}

function step(dt) {
  // 1) Fake camera
  const frame = camera.capture(car);
  camCtx.imageSmoothingEnabled = false;
  camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
  camCtx.drawImage(frame, 0, 0, camCanvas.width, camCanvas.height);

  // 2) Vision
  const mode = modeSelect.value;
  const target =
    mode === "dots" ? camera.detectNearestDot() : camera.detectRoadCentroid();

  if (target.found) framesSeen++;
  else framesLost++;

  // 3) Control (same as firmware)
  const ctrl = controlUpdate(target);

  // 4) Physics
  if (ctrl.drive === "forward") {
    car.speed += (55 - car.speed) * Math.min(1, dt * 3);
  } else {
    car.speed += (0 - car.speed) * Math.min(1, dt * 6);
  }
  const yaw = steerToYawRate(ctrl.steerDeg, car.speed);
  car.heading += yaw * dt;
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.y += Math.sin(car.heading) * car.speed * dt;

  // Soft keep-in-bounds
  car.x = Math.max(10, Math.min(world.width - 10, car.x));
  car.y = Math.max(10, Math.min(world.height - 10, car.y));

  maybeCountLap();

  // 5) Draw world
  world.draw(worldCtx);
  drawCar(worldCtx);
  drawHudOverlay(target, ctrl);
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (running) step(dt);
  else {
    // still draw static scene
    world.draw(worldCtx);
    drawCar(worldCtx);
    camera.capture(car);
    camCtx.imageSmoothingEnabled = false;
    camCtx.drawImage(camera.canvas, 0, 0, camCanvas.width, camCanvas.height);
  }
  requestAnimationFrame(loop);
}

btnStart.addEventListener("click", () => {
  running = !running;
  btnStart.textContent = running ? "Pause" : "Start Autonomous Drive";
  btnStart.classList.toggle("running", running);
});

btnReset.addEventListener("click", () => {
  running = false;
  btnStart.textContent = "Start Autonomous Drive";
  btnStart.classList.remove("running");
  resetCar();
  lastTs = 0;
});

resetCar();
requestAnimationFrame(loop);

// Expose for automated hello-world checks
window.__rcSim = {
  getState: () => ({
    running,
    lapCount,
    framesSeen,
    framesLost,
    car: { ...car },
    lateralError: world.signedLateralError(car.x, car.y),
  }),
  start: () => {
    if (!running) btnStart.click();
  },
  reset: () => btnReset.click(),
};
