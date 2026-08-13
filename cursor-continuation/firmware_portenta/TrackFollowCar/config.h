#ifndef TRACK_FOLLOW_CONFIG_H
#define TRACK_FOLLOW_CONFIG_H

// Vision backends
#define VISION_FOMO_DOTS      1
#define VISION_ROAD_CENTROID  2

// Default for hardware without an Edge Impulse library installed:
#define VISION_MODE VISION_ROAD_CENTROID

////// Pins — match RC-Car-Code Portenta stack
#define SERVO_PIN    D2
#define CONTROL_PIN  D5
#define REVERSE_PIN  D3
#define FORWARD_PIN  D1

////// Steering (same as Working-ML-Car)
#define MID_POINT   93
#define LOW_POINT   63
#define HIGH_POINT  123

////// Motor speeds (crawl — original car used ~40–45)
#define MIN_SPEED   40
#define SLOW_SPEED  45
#define FAST_SPEED  45

////// FOMO / vision space (Edge Impulse FOMO was 96 wide; 48 = center)
#define VISION_WIDTH   96
#define VISION_HEIGHT  96
#define VISION_CENTER  48.0f
#define FOMO_CUTOFF    0.85f

////// Road-centroid tuning
#define ROAD_DARK_THRESHOLD  90   // grayscale 0–255; darker than this = road/line
#define ROAD_BAND_TOP_FRAC   0.55f
#define ROAD_MIN_PIXELS      40

#define LOOP_DELAY_MS  30

#endif
