import os
import re
import yaml
import sys

# Extensive mapping for modern IT domains
DOMAINS = {
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
    """Detect if content is primarily in English (at least 80% English character density)."""
    if not text: return True
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    total_chars = len(re.findall(r'\S', text))
    if total_chars == 0: return True
    return (english_chars / total_chars) >= 0.8

def infer_subcategory(title, content):
    """Infer a broad subcategory based on scoring and thresholds."""
    text = (title + ' ' + content).lower()
    is_english = is_primarily_english(text)

    # Base thresholds for assignment (minimum number of keyword occurrences)
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

    for subcat, keywords in DOMAINS.items():
        score = 0
        for kw in keywords:
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

    title = frontmatter.get('title', '')
    text_to_scan = (title + ' ' + body).lower()

    # Apply Knowledge-base Metadata
    frontmatter['layout'] = 'knowledge-base'
    if 'taxonomy' not in frontmatter:
        frontmatter['taxonomy'] = {}

    if not frontmatter['taxonomy'].get('category'):
        frontmatter['taxonomy']['category'] = infer_category_from_path(filepath)
    
    if not frontmatter['taxonomy'].get('subcategory'):
        frontmatter['taxonomy']['subcategory'] = infer_subcategory(title, body)

    if 'order' not in frontmatter['taxonomy']:
        frontmatter['taxonomy']['order'] = 1

    # Tag harvesting (Rule-based)
    if not frontmatter.get('keywords'):
        keywords = []
        # Use keywords from DOMAINS for tagging
        all_potential_tags = []
        for subcat_keywords in DOMAINS.values():
            all_potential_tags.extend(subcat_keywords)
        
        # Add extra common tech terms
        all_potential_tags.extend([
            'linux', 'kernel', 'arm', 'risc-v', 'x86', 'performance', 'latency', 
            'optimization', 'debugging', 'architecture', 'api', 'rest', 'graphql'
        ])

        for tech in set(all_potential_tags):
            pattern = r'\b' + re.escape(tech.lower()) + r'\b'
            if re.search(pattern, text_to_scan):
                if tech not in keywords:
                    keywords.append(tech)
        
        frontmatter['keywords'] = keywords[:15]

    # Reconstruct the file with updated YAML
    new_yaml = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
    stripped_body = body.lstrip('\r\n')
    new_content = f"---\n{new_yaml}---\n\n{stripped_body}"

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    final_cat = frontmatter['taxonomy'].get('category')
    final_sub = frontmatter['taxonomy'].get('subcategory')
    print(f"  ✓ Processed: {filepath} (Category: {final_cat}, Sub: {final_sub})")

if __name__ == "__main__":
    changed_files_raw = os.environ.get('CHANGED_FILES', '')
    if changed_files_raw:
        files = changed_files_raw.split()
        for f in files:
            target = f.strip()
            if target.endswith('.md') or target.endswith('.markdown'):
                process_post(target)
