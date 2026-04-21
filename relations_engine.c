#include <emscripten.h>
#include <math.h>

EMSCRIPTEN_KEEPALIVE
void compute_layout(float* px, float* py, float* vx, float* vy, int num_nodes, int* edge_src, int* edge_dst, int num_edges, float width, float height) {
    float dt = 0.5f;
    float repulsion = 8000.0f;
    float spring_len = 150.0f;
    float spring_k = 0.05f;
    float damping = 0.7f;
    float center_pull = 0.02f;

    for (int i = 0; i < num_nodes; i++) {
        for (int j = i + 1; j < num_nodes; j++) {
            float dx = px[i] - px[j];
            float dy = py[i] - py[j];
            float dist_sq = dx*dx + dy*dy;
            if (dist_sq < 0.1f) { dx = 1.0f; dy = 0.0f; dist_sq = 1.0f; }
            float dist = sqrtf(dist_sq);
            float force = repulsion / dist_sq;
            float fx = (dx / dist) * force;
            float fy = (dy / dist) * force;
            vx[i] += fx; vy[i] += fy;
            vx[j] -= fx; vy[j] -= fy;
        }
    }

    for (int i = 0; i < num_edges; i++) {
        int u = edge_src[i];
        int v = edge_dst[i];
        float dx = px[v] - px[u];
        float dy = py[v] - py[u];
        float dist = sqrtf(dx*dx + dy*dy);
        if (dist < 0.1f) dist = 0.1f;
        float force = (dist - spring_len) * spring_k;
        float fx = (dx / dist) * force;
        float fy = (dy / dist) * force;
        vx[u] += fx; vy[u] += fy;
        vx[v] -= fx; vy[v] -= fy;
    }

    float cx = width / 2.0f;
    float cy = height / 2.0f;
    for (int i = 0; i < num_nodes; i++) {
        vx[i] += (cx - px[i]) * center_pull;
        vy[i] += (cy - py[i]) * center_pull;
    }

    for (int i = 0; i < num_nodes; i++) {
        vx[i] *= damping;
        vy[i] *= damping;
        px[i] += vx[i] * dt;
        py[i] += vy[i] * dt;
        
        if (px[i] < 20) px[i] = 20;
        if (px[i] > width - 20) px[i] = width - 20;
        if (py[i] < 20) py[i] = 20;
        if (py[i] > height - 20) py[i] = height - 20;
    }
}
