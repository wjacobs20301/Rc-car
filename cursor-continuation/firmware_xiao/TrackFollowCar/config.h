#ifndef TRACK_FOLLOW_CONFIG_H
#define TRACK_FOLLOW_CONFIG_H

/**
 * Target board: Seeed XIAO ESP32S3 Sense (OV2640 camera).
 * Pin map matches RC-Car-Code/XIAO_Download and XIAO_ML_Drive_0.0.4.
 */

// Vision backends
#define VISION_FOMO_DOTS      1
#define VISION_ROAD_CENTROID  2

// Default: road/tape following without an Edge Impulse library
#define VISION_MODE VISION_ROAD_CENTROID

// Real XIAO Sense camera (esp_camera). Comment out only for Serial-stub testing.
#define USE_XIAO_CAMERA

////// Pins — XIAO ESP32S3 (NOT Portenta)
#define SERVO_PIN    D0
#define CONTROL_PIN  D2
#define REVERSE_PIN  D3
#define FORWARD_PIN  D1

////// Steering (same mechanical range as your Working-ML / XIAO sketches)
#define MID_POINT   93
#define LOW_POINT   63
#define HIGH_POINT  123

////// Motor speeds (crawl — match your XIAO_ML_Drive_0.0.4 range)
#define MIN_SPEED   28
#define SLOW_SPEED  42
#define FAST_SPEED  48

////// Vision space (FOMO was 96 wide; 48 = center)
#define VISION_WIDTH   96
#define VISION_HEIGHT  96
#define VISION_CENTER  48.0f
#define FOMO_CUTOFF    0.85f

////// Road-centroid tuning
#define ROAD_DARK_THRESHOLD  95
#define ROAD_BAND_TOP_FRAC   0.48f
#define ROAD_MIN_PIXELS      35
#define ROAD_MIN_CONF        0.12f

////// PD + realism (keep in sync with simulator/js/control.js)
#define STEER_KP              1.35f
#define STEER_KD              0.55f
#define STEER_KI              0.015f
#define STEER_I_LIMIT         10.0f
#define SLEW_DEG_PER_FRAME    10
#define LOST_GRACE_FRAMES     8
#define HARD_TURN_ERR         14.0f

#define LOOP_DELAY_MS  33

#endif
