import { TrackWorld, TRACK_IDS } from "./track.js";
import { FakeCamera } from "./camera.js";
import {
  createController,
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
const elOff = document.getElementById("offtrack");
const elTrackName = document.getElementById("track-name");
const btnStart = document.getElementById("btn-start");
const btnReset = document.getElementById("btn-reset");
const modeSelect = document.getElementById("vision-mode");
const trackSelect = document.getElementById("track-select");
const realismCheck = document.getElementById("realism");

let world = new TrackWorld(worldCanvas.width, worldCanvas.height, "technical");
const camera = new FakeCamera(world, 96);
let ctrlState = createController();

const car = {
  x: 0,
  y: 0,
  heading: 0,
  speed: 0,
  length: 28,
  width: 16,
  // Actuator lag (commanded vs actual) — real H-bridge + servo
  cmdSteer: MID_POINT,
  actSteer: MID_POINT,
  cmdThrottle: 0,
  actThrottle: 0,
};

let running = false;
let lastTs = 0;
let lapCount = 0;
let lastIndex = 0;
let framesSeen = 0;
let framesLost = 0;
let offTrackFrames = 0;
let physicsSamples = 0;
let simTime = 0;
let controlAcc = 0;
const CONTROL_DT = 0.033; // ~30 ms — matches Arduino LOOP_DELAY_MS

function populateTracks() {
  trackSelect.innerHTML = "";
  for (const id of TRACK_IDS) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent =
      id === "oval"
        ? "Oval (easy)"
        : id === "figure8"
          ? "Figure-8"
          : id === "technical"
            ? "Technical hairpins"
            : "Room tape loop";
    if (id === "technical") opt.selected = true;
    trackSelect.appendChild(opt);
  }
}

function resetCar() {
  const p = world.centerline(0);
  car.x = p.x;
  car.y = p.y;
  car.heading = Math.atan2(p.ty, p.tx);
  car.speed = 0;
  car.cmdSteer = car.actSteer = MID_POINT;
  car.cmdThrottle = car.actThrottle = 0;
  ctrlState = createController();
  lapCount = 0;
  lastIndex = world.nearestIndex(car.x, car.y);
  framesSeen = 0;
  framesLost = 0;
  offTrackFrames = 0;
  physicsSamples = 0;
  elLap.textContent = "0";
  elOff.textContent = "0%";
  elTrackName.textContent = world.name;
}

function drawCar(ctx) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.heading);
  ctx.fillStyle = "#c0392b";
  ctx.fillRect(-car.length / 2, -car.width / 2, car.length, car.width);
  ctx.fillStyle = "#f1c40f";
  ctx.fillRect(car.length / 2 - 6, -car.width / 2, 6, car.width);
  // Camera look-down frustum
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.beginPath();
  ctx.moveTo(4, 0);
  ctx.lineTo(55, -30);
  ctx.lineTo(55, 30);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHudOverlay(target, ctrl) {
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
  camCtx.strokeStyle = "rgba(255,255,0,0.5)";
  camCtx.beginPath();
  camCtx.moveTo(camCanvas.width / 2, 0);
  camCtx.lineTo(camCanvas.width / 2, camCanvas.height);
  camCtx.stroke();

  elSteer.textContent = `${ctrl.steerDeg}° act=${car.actSteer.toFixed(0)} (${LOW_POINT}–${HIGH_POINT})`;
  elThrottle.textContent = `${ctrl.throttle} act=${car.actThrottle.toFixed(0)}  ${ctrl.drive}`;
  elTarget.textContent = target.found
    ? `found  x=${target.x.toFixed(1)}  err=${ctrl.p1.toFixed(1)}  conf=${(target.conf || 0).toFixed(2)}`
    : "LOST — grace/brake";
  elMode.textContent = modeSelect.value;
}

function maybeCountLap() {
  const idx = world.nearestIndex(car.x, car.y);
  const n = world.centerSamples.length;
  // Wrapped past start
  if (lastIndex > n * 0.85 && idx < n * 0.15) {
    lapCount += 1;
    elLap.textContent = String(lapCount);
  }
  lastIndex = idx;
}

function applyRealismFlags() {
  const on = realismCheck.checked;
  camera.realism.noise = on;
  camera.realism.lighting = on;
  camera.realism.blur = on;
  camera.realism.dropFrameRate = on ? 0.02 : 0;
}

function controlStep() {
  applyRealismFlags();
  const frame = camera.capture(car);
  camCtx.imageSmoothingEnabled = false;
  camCtx.clearRect(0, 0, camCanvas.width, camCanvas.height);
  camCtx.drawImage(frame, 0, 0, camCanvas.width, camCanvas.height);

  const mode = modeSelect.value;
  const target =
    mode === "dots" ? camera.detectNearestDot() : camera.detectRoadCentroid();

  if (target.found) framesSeen++;
  else framesLost++;

  const ctrl = controlUpdate(ctrlState, target);
  car.cmdSteer = ctrl.steerDeg;
  car.cmdThrottle = ctrl.drive === "forward" ? ctrl.throttle : 0;

  drawHudOverlay(target, ctrl);
  return ctrl;
}

function physicsStep(dt) {
  // First-order lag toward commanded actuators
  const steerTau = 0.12; // servo ~120 ms
  const thrTau = 0.18; // motor + gearing
  car.actSteer += (car.cmdSteer - car.actSteer) * Math.min(1, dt / steerTau);
  car.actThrottle += (car.cmdThrottle - car.actThrottle) * Math.min(1, dt / thrTau);

  const targetSpeed = car.actThrottle > 0 ? 12 + car.actThrottle * 0.45 : 0;
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 2.8);

  const yaw = steerToYawRate(car.actSteer, car.speed);
  car.heading += yaw * dt;
  car.x += Math.cos(car.heading) * car.speed * dt;
  car.y += Math.sin(car.heading) * car.speed * dt;

  car.x = Math.max(8, Math.min(world.width - 8, car.x));
  car.y = Math.max(8, Math.min(world.height - 8, car.y));

  physicsSamples++;
  if (!world.onRoad(car.x, car.y)) offTrackFrames++;
  elOff.textContent = `${((offTrackFrames / Math.max(1, physicsSamples)) * 100).toFixed(0)}%`;

  maybeCountLap();
}

function renderWorld() {
  world.draw(worldCtx);
  drawCar(worldCtx);
}

function step(dt) {
  simTime += dt;
  controlAcc += dt;
  // Fixed-rate control loop like Arduino
  while (controlAcc >= CONTROL_DT) {
    controlStep();
    controlAcc -= CONTROL_DT;
  }
  physicsStep(dt);
  renderWorld();
}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.05, (ts - lastTs) / 1000);
  lastTs = ts;
  if (running) step(dt);
  else {
    renderWorld();
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
  controlAcc = 0;
  simTime = 0;
});

trackSelect.addEventListener("change", () => {
  world = new TrackWorld(worldCanvas.width, worldCanvas.height, trackSelect.value);
  camera.setWorld(world);
  running = false;
  btnStart.textContent = "Start Autonomous Drive";
  btnStart.classList.remove("running");
  resetCar();
  simTime = 0;
  controlAcc = 0;
});

populateTracks();
resetCar();
requestAnimationFrame(loop);

window.__rcSim = {
  getState: () => ({
    running,
    lapCount,
    framesSeen,
    framesLost,
    offTrackFrames,
    track: world.trackId,
    car: { x: car.x, y: car.y, heading: car.heading, speed: car.speed },
    lateralError: world.signedLateralError(car.x, car.y),
    onRoad: world.onRoad(car.x, car.y),
  }),
  start: () => {
    if (!running) btnStart.click();
  },
  reset: () => btnReset.click(),
  setTrack: (id) => {
    trackSelect.value = id;
    trackSelect.dispatchEvent(new Event("change"));
  },
};
