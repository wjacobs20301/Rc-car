# Cursor Continuation — Self-Driving RC Car

Restart of the Portenta / XIAO FOMO “follow marks on the floor” project, with:

1. **Arduino firmware** (`firmware_portenta/`) — PD steering, servo slew, turn-based throttle cut, road-centroid vision, optional real **Himax HM01B0** capture (`USE_PORTENTA_CAMERA`).
2. **Desktop simulator** (`simulator/`) — complex tracks (oval, figure-8, technical hairpins, room tape), ~45° look-down camera with noise/lag, same 33&nbsp;ms control loop as the firmware.

## Quick start (simulator)

```bash
python3 -m http.server 8000
```

Open: [http://localhost:8000/cursor-continuation/simulator/](http://localhost:8000/cursor-continuation/simulator/)

Pick **Technical hairpins** or **Figure-8**, leave **Realism** on, click **Start Autonomous Drive**.

Control unit test:

```bash
node cursor-continuation/simulator/js/control_test.mjs
```

## Firmware (real Arduino)

Open `firmware_portenta/TrackFollowCar/` in the Arduino IDE (Portenta H7 + Vision Shield).

1. In `config.h`, uncomment `#define USE_PORTENTA_CAMERA`.
2. Keep `VISION_MODE` as `VISION_ROAD_CENTROID` for dark tape / asphalt on a light floor.
3. Flash; Serial 115200 shows `found / x / conf / err / steer / thr`.
4. Camera ~45° down (same as the original FOMO training angle).

Pins: `D2` servo, `D5` PWM, `D1`/`D3` direction — unchanged from `RC-Car-Code`.

## Layout

```
cursor-continuation/
  README.md
  docs/ARCHITECTURE.md
  models/README.md
  firmware_portenta/TrackFollowCar/   # Arduino sketch (real-world path)
  simulator/                          # browser test environment
```

Historical firmware stays under `RC-Car-Code/`.