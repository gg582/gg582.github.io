#include <emscripten.h>
#include <math.h>

static float clampf(float value, float min, float max) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
}

static float smoothstep(float edge0, float edge1, float x) {
    float t = clampf((x - edge0) / (edge1 - edge0), 0.0f, 1.0f);
    return t * t * (3.0f - 2.0f * t);
}

static int pack_rgb(float r, float g, float b) {
    int ri = (int)clampf(r * 255.0f, 0.0f, 255.0f);
    int gi = (int)clampf(g * 255.0f, 0.0f, 255.0f);
    int bi = (int)clampf(b * 255.0f, 0.0f, 255.0f);
    return (ri << 16) | (gi << 8) | bi;
}

static int hsv_to_rgb(float h, float s, float v) {
    float c = v * s;
    float x = c * (1.0f - fabsf(fmodf(h / 60.0f, 2.0f) - 1.0f));
    float m = v - c;
    float r = 0.0f;
    float g = 0.0f;
    float b = 0.0f;

    if (h < 60.0f) {
        r = c; g = x;
    } else if (h < 120.0f) {
        r = x; g = c;
    } else if (h < 180.0f) {
        g = c; b = x;
    } else if (h < 240.0f) {
        g = x; b = c;
    } else if (h < 300.0f) {
        r = x; b = c;
    } else {
        r = c; b = x;
    }

    return pack_rgb(r + m, g + m, b + m);
}

EMSCRIPTEN_KEEPALIVE
int ui_accent_rgb(int seed, float scroll_ratio, float pointer_x_ratio, float pointer_y_ratio, int dark_mode) {
    float hue = fmodf((float)(seed % 360) + scroll_ratio * 72.0f + pointer_x_ratio * 28.0f - pointer_y_ratio * 18.0f, 360.0f);
    if (hue < 0.0f) hue += 360.0f;

    float saturation = dark_mode ? 0.52f : 0.68f;
    float value = dark_mode ? 0.86f : 0.46f;
    return hsv_to_rgb(hue, saturation, value);
}

EMSCRIPTEN_KEEPALIVE
float ui_progress(float scroll_y, float viewport_height, float document_height) {
    float max_scroll = document_height - viewport_height;
    if (max_scroll <= 0.0f) return 0.0f;
    return clampf(scroll_y / max_scroll, 0.0f, 1.0f);
}

EMSCRIPTEN_KEEPALIVE
float ui_masthead_depth(float scroll_ratio, float pointer_y_ratio, int reduced_motion) {
    if (reduced_motion) return 0.0f;
    float scroll_depth = smoothstep(0.0f, 0.36f, scroll_ratio);
    float pointer_depth = (pointer_y_ratio - 0.5f) * 0.35f;
    return clampf(scroll_depth + pointer_depth, 0.0f, 1.0f);
}

EMSCRIPTEN_KEEPALIVE
float ui_motion_intensity(float scroll_velocity, int reduced_motion) {
    if (reduced_motion) return 0.0f;
    return clampf(fabsf(scroll_velocity) / 42.0f, 0.0f, 1.0f);
}

EMSCRIPTEN_KEEPALIVE
float ui_focus_alpha(float progress) {
    return 0.1f + smoothstep(0.04f, 0.9f, progress) * 0.42f;
}
