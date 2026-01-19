import os
import re
import yaml

def extract_frontmatter(content):
    """Extract YAML frontmatter and post body separately."""
    if not content.startswith('---'):
        return None, content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return None, content
    try:
        frontmatter = yaml.safe_load(parts[1])
        return frontmatter, parts[2]
    except yaml.YAMLError:
        return None, content

def infer_subcategory(title, content):
    """Infer a broad subcategory from comprehensive tech domains."""
    text = (title + ' ' + content).lower()

    # Broad domain mapping covering nearly all IT sectors
    domains = {
        'on-device-ai': [
            'npu', 'quantization', 'tflite', 'tensorrt', 'edge-ai', 'inference',
            'onnx', 'mobile-ml', 'coreml', 'dsp', 'openvino'
        ],
        'virtualization-cloud': [
            'kvm', 'qemu', 'hypervisor', 'virtio', 'container', 'docker', 'kubernetes',
            'xen', 'vmware', 'vmm', 'overlay-network', 'helm', 'serverless'
        ],
        'deep-learning': [
            'pytorch', 'tensorflow', 'backpropagation', 'transformer', 'llm', 'cnn',
            'rnn', 'gradient-descent', 'optimizer', 'neural-network', 'gan'
        ],
        'game-dev-graphics': [
            'unity', 'unreal', 'opengl', 'vulkan', 'directx', 'shader', 'hlsl', 'glsl',
            'ray-tracing', 'rendering-pipeline', 'physics-engine', 'rasterization', 'godot'
        ],
        'high-perf-computing': [
            'simd', 'avx', 'neon', 'cuda', 'opencl', 'parallel-programming',
            'lock-free', 'atomic', 'memory-barrier', 'gpgpu', 'mpi', 'fpga'
        ],
        'system-kernel-network': [
            'ebpf', 'xdp', 'bbr', 'tcp-ip', 'socketmap', 'netfilter', 'syscall',
            'kernel-module', 'interrupt-handler', 'zero-copy', 'io_uring', 'dpdk', 'rdma'
        ],
        'cyber-security': [
            'malware', 'exploit', 'cryptography', 'overflow', 'reverse-engineering',
            'ctf', 'zero-day', 'tls', 'pki', 'penetration', 'fuzzing'
        ],
        'data-engineering': [
            'spark', 'hadoop', 'kafka', 'etl', 'data-lake', 'warehouse', 'nosql',
            'postgresql', 'redis', 'elasticsearch', 'mongodb'
        ],
        'web-app-dev': [
            'react', 'vue', 'nextjs', 'typescript', 'wasm', 'tailwind', 'webpack',
            'vite', 'spring', 'nodejs', 'fastapi', 'grpc', 'rest-api'
        ]
    }

    for subcat, keywords in domains.items():
        if any(kw in text for kw in keywords):
            return subcat
    return 'general-tech'

def process_post(filepath):
    """Force knowledge-base layout and update metadata for the given file."""
    if not os.path.exists(filepath):
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter, body = extract_frontmatter(content)
    if frontmatter is None:
        return

    # Metadata extraction
    title = frontmatter.get('title', '')
    subcategory = infer_subcategory(title, body)

    # Standardize Knowledge-base structure
    frontmatter['layout'] = 'knowledge-base'
    if 'taxonomy' not in frontmatter:
        frontmatter['taxonomy'] = {}

    frontmatter['taxonomy']['category'] = 'knowledge-base'
    frontmatter['taxonomy']['subcategory'] = subcategory

    # Automatic keyword/tag harvesting
    tech_pool = [
        'NPU', 'KVM', 'PyTorch', 'Vulkan', 'BBR', 'eBPF', 'CUDA', 'LLM',
        'RISC-V', 'io_uring', 'Docker', 'WASM', 'Kafka', 'React', 'SIMD'
    ]
    keywords = frontmatter.get('keywords', [])
    if not isinstance(keywords, list):
        keywords = []

    for tech in tech_pool:
        if tech.lower() in (title + body).lower() and tech not in keywords:
            keywords.append(tech)

    frontmatter['keywords'] = keywords[:15]

    # Reconstruct file with updated metadata
    new_content = '---\n' + yaml.dump(frontmatter, allow_unicode=True, sort_keys=False) + '---\n' + body
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

if __name__ == "__main__":
    # CHANGED_FILES is provided by the 'Run Auto-Classification' step in the workflow
    changed_files_raw = os.environ.get('CHANGED_FILES', '')
    if changed_files_raw:
        files = changed_files_raw.split('\n')
        for f in files:
            target = f.strip()
            # Process only markdown files
            if target.endswith('.md') or target.endswith('.markdown'):
                process_post(target)
