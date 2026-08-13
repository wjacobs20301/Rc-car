#ifndef TRACK_FOLLOW_CONFIG_H
#define TRACK_FOLLOW_CONFIG_H

// Vision backends
#define VISION_FOMO_DOTS      1
#define VISION_ROAD_CENTROID  2

// Default for hardware without an Edge Impulse library installed:
#define VISION_MODE VISION_ROAD_CENTROID

// Uncomment on Portenta H7 + Vision Shield to use the real Himax HM01B0:
// #define USE_PORTENTA_CAMERA

////// Pins — match RC-Car-Code Portenta stack
#define SERVO_PIN    D2
#define CONTROL_PIN  D5
#define REVERSE_PIN  D3
#define FORWARD_PIN  D1

////// Steering (same mechanical range as Working-ML-Car)
#define MID_POINT   93
#define LOW_POINT   63
#define HIGH_POINT  123

////// Motor speeds (crawl — original car used ~40–45; allow a bit more with PD)
#define MIN_SPEED   32
#define SLOW_SPEED  45
#define FAST_SPEED  55

////// FOMO / vision space (Edge Impulse FOMO was 96 wide; 48 = center)
#define VISION_WIDTH   96
#define VISION_HEIGHT  96
#define VISION_CENTER  48.0f
#define FOMO_CUTOFF    0.85f

////// Road-centroid tuning (real asphalt / tape on light floor)
#define ROAD_DARK_THRESHOLD  95
#define ROAD_BAND_TOP_FRAC   0.48f
#define ROAD_MIN_PIXELS      35
#define ROAD_MIN_CONF        0.12f

////// PD + realism (keep in sync with simulator/js/control.js)
#define STEER_KP              1.15f
#define STEER_KD              0.35f
#define STEER_KI              0.02f
#define STEER_I_LIMIT         12.0f
#define SLEW_DEG_PER_FRAME    8
#define LOST_GRACE_FRAMES     6
#define HARD_TURN_ERR         18.0f

#define LOOP_DELAY_MS  33

#endif
