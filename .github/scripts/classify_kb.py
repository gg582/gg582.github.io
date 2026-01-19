import os
import re
import yaml
import sys

def extract_frontmatter(content):
    """Extract YAML frontmatter and body from markdown content."""
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

def infer_category_from_path(filepath):
    """Infer primary category from the actual directory name in the tree."""
    if '_network' in filepath: return 'network'
    if '_embedded' in filepath: return 'embedded'
    if '_codingtest' in filepath: return 'codingtest'
    if '_posts' in filepath: return 'posts'
    return 'general'

def is_primarily_english(text):
    """Detect if content is primarily in English (low Korean character density)."""
    korean_chars = len(re.findall(r'[ㄱ-ㅎㅏ-ㅣ가-힣]', text))
    if not text: return True
    # If Korean character ratio is less than 5%, consider it primarily English
    return (korean_chars / len(text)) < 0.05

def infer_subcategory(title, content):
    """Infer a broad subcategory based on scoring and thresholds."""
    text = (title + ' ' + content).lower()
    is_english = is_primarily_english(text)

    # Extensive mapping for modern IT domains
    domains = {
        'on-device-ai': ['npu', 'quantization', 'tflite', 'tensorrt', 'edge-ai', 'inference', 'onnx', 'mcu-ai'],
        'virtualization': ['kvm', 'qemu', 'hypervisor', 'virtio', 'docker', 'kubernetes', 'xen', 'containerd', 'vmm'],
        'deep-learning': ['pytorch', 'tensorflow', 'transformer', 'llm', 'backpropagation', 'gradient-descent', 'cnn', 'rnn'],
        'game-graphics': ['unity', 'unreal', 'opengl', 'vulkan', 'directx', 'shader', 'hlsl', 'glsl', 'ray-tracing', 'rendering', 'godot'],
        'high-perf-computing': ['simd', 'avx', 'neon', 'cuda', 'opencl', 'lock-free', 'atomic', 'memory-barrier', 'hpc', 'parallel'],
        'system-kernel-network': ['ebpf', 'xdp', 'bbr', 'tcp-ip', 'socketmap', 'syscall', 'zero-copy', 'io_uring', 'dpdk', 'rdma', 'netfilter'],
        'cyber-security': ['malware', 'exploit', 'cryptography', 'overflow', 'reverse-engineering', 'ctf', 'zero-day', 'tls', 'pki'],
        'data-engineering': ['spark', 'hadoop', 'kafka', 'etl', 'data-lake', 'warehouse', 'nosql', 'postgresql', 'redis', 'mongodb'],
        'web-app-dev': ['react', 'vue', 'nextjs', 'typescript', 'wasm', 'tailwind', 'webpack', 'vite', 'spring', 'nodejs', 'fastapi']
    }

    # Base thresholds for assignment (minimum number of keyword occurrences)
    # Categories mentioned as too 'aggressive' get higher base thresholds
    thresholds = {
        'web-app-dev': 3,
        'deep-learning': 3,
        'virtualization': 3,
        'on-device-ai': 2,
        'game-graphics': 2,
        'high-perf-computing': 2,
        'system-kernel-network': 2,
        'cyber-security': 2,
        'data-engineering': 2
    }

    # Increase thresholds significantly for English posts to avoid accidental classification
    if is_english:
        for cat in thresholds:
            thresholds[cat] += 3

    best_subcat = 'general-tech'
    max_score = 0

    for subcat, keywords in domains.items():
        score = 0
        for kw in keywords:
            # Use word boundaries to avoid partial matches (e.g., 'react' in 'reaction')
            pattern = r'\b' + re.escape(kw) + r'\b'
            matches = re.findall(pattern, text)
            score += len(matches)
        
        if score >= thresholds.get(subcat, 2) and score > max_score:
            max_score = score
            best_subcat = subcat

    return best_subcat

def process_post(filepath):
    """Standardize metadata without breaking the existing folder structure."""
    if not os.path.exists(filepath):
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    frontmatter, body = extract_frontmatter(content)
    if frontmatter is None:
        return

    # Extracting current metadata
    title = frontmatter.get('title', '')

    # 1. Map category based on physical folder location
    category = infer_category_from_path(filepath)
    # 2. Map subcategory based on content analysis (now with scoring/thresholds)
    subcategory = infer_subcategory(title, body)

    # Apply Knowledge-base Metadata
    frontmatter['layout'] = 'knowledge-base'
    if 'taxonomy' not in frontmatter:
        frontmatter['taxonomy'] = {}

    frontmatter['taxonomy']['category'] = category
    frontmatter['taxonomy']['subcategory'] = subcategory

    # Default order if not exists
    if 'order' not in frontmatter['taxonomy']:
        frontmatter['taxonomy']['order'] = 1

    # Tag harvesting for 'keywords' field
    tech_pool = [
        'NPU', 'KVM', 'PyTorch', 'Vulkan', 'BBR', 'eBPF', 'CUDA', 'LLM',
        'RISC-V', 'io_uring', 'Docker', 'WASM', 'Kafka', 'React', 'SIMD', 'SOCKMAP'
    ]
    keywords = frontmatter.get('keywords', [])
    if not isinstance(keywords, list): keywords = []

    for tech in tech_pool:
        # Use word boundaries for tag harvesting as well
        pattern = r'\b' + re.escape(tech.lower()) + r'\b'
        if re.search(pattern, (title + body).lower()) and tech not in keywords:
            keywords.append(tech)

    frontmatter['keywords'] = keywords[:15]

    # Reconstruct the file with updated YAML
    new_yaml = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
    new_content = f"---\n{new_yaml}---\n{body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"  ✓ Processed: {filepath} (Category: {category}, Sub: {subcategory})")

if __name__ == "__main__":
    # Get CHANGED_FILES from the workflow environment
    changed_files_raw = os.environ.get('CHANGED_FILES', '')
    if changed_files_raw:
        files = changed_files_raw.split()
        for f in files:
            target = f.strip()
            if target.endswith('.md') or target.endswith('.markdown'):
                process_post(target)