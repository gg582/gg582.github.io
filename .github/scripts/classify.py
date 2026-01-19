import os
import re
import shutil

# Path configuration
POSTS_DIR = "_posts"
# Define your category mapping logic here (Example: by filename or content)
# You can extend this logic based on your specific needs

def get_front_matter(content):
    """Extract front matter as a dictionary."""
    fm_match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
    if not fm_match:
        return None
    
    fm_text = fm_match.group(1)
    fm_dict = {}
    for line in fm_text.split('\n'):
        if ':' in line:
            key, value = line.split(':', 1)
            fm_dict[key.strip()] = value.strip().strip('"').strip("'")
    return fm_dict

def main():
    if not os.path.exists(POSTS_DIR):
        print(f"Directory {POSTS_DIR} not found.")
        return

    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith(".md") and not filename.endswith(".markdown"):
            continue

        filepath = os.path.join(POSTS_DIR, filename)
        
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        fm = get_front_matter(content)
        if not fm:
            continue

        # Classification Logic: Use 'categories' or 'tags' from Front Matter
        # Example: If categories is 'Algorithm', move to _posts/Algorithm/
        category = fm.get('categories', 'Uncategorized').split(',')[0].strip('[]').strip()
        
        target_dir = os.path.join(POSTS_DIR, category)
        if not os.path.exists(target_dir):
            os.makedirs(target_dir)

        target_path = os.path.join(target_dir, filename)
        
        # Avoid moving if it's already in the correct place
        if filepath != target_path:
            print(f"Moving {filename} to {target_dir}")
            shutil.move(filepath, target_path)

if __name__ == "__main__":
    main()
