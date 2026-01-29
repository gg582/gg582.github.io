import os
import yaml
import sys
import argparse

def load_taxonomy(taxonomy_path):
    """Loads the taxonomy file and returns a mapping of subcategory weights."""
    if not os.path.exists(taxonomy_path):
        print(f"Error: Taxonomy file not found at {taxonomy_path}")
        sys.exit(1)

    with open(taxonomy_path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    weight_map = {}
    
    if not data or 'categories' not in data:
        print("Error: Invalid taxonomy file structure.")
        sys.exit(1)

    for category in data['categories']:
        cat_id = category.get('id')
        if not cat_id:
            continue
            
        if 'subcategories' in category:
            for sub in category['subcategories']:
                sub_id = sub.get('id')
                weight = sub.get('weight')
                if sub_id and weight is not None:
                    if cat_id not in weight_map:
                        weight_map[cat_id] = {}
                    weight_map[cat_id][sub_id] = weight
                    
    return weight_map

def extract_frontmatter(content):
    """Extract YAML frontmatter and body from markdown content."""
    if not content.startswith('---\n'):
        return None, content
    parts = content.split('---\n', 2)
    if len(parts) < 3:
        return None, content
    try:
        frontmatter = yaml.safe_load(parts[1])
        return frontmatter, parts[2]
    except yaml.YAMLError:
        return None, content

def process_file(filepath, weight_map):
    """Updates the taxonomy order in the file if needed."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    frontmatter, body = extract_frontmatter(content)
    if frontmatter is None:
        return

    # Check if taxonomy metadata exists
    taxonomy = frontmatter.get('taxonomy')
    if not taxonomy:
        return

    category = taxonomy.get('category')
    subcategory = taxonomy.get('subcategory')
    current_order = taxonomy.get('order')

    if not category or not subcategory:
        return

    # Look up correct weight
    if category in weight_map and subcategory in weight_map[category]:
        expected_order = weight_map[category][subcategory]
        
        if current_order != expected_order:
            print(f"Updating {filepath}: {category}/{subcategory} order {current_order} -> {expected_order}")
            frontmatter['taxonomy']['order'] = expected_order
            
            # Reconstruct content
            new_yaml = yaml.dump(frontmatter, allow_unicode=True, sort_keys=False)
            # Ensure proper YAML formatting (yaml.dump might double newlines or act differently)
            # Standard Jekyll front matter block
            new_content = f"---\n{new_yaml}---\n{body}"
            
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
    else:
        # Warn if subcategory not found in taxonomy (optional, but good for debug)
        # print(f"Warning: {category}/{subcategory} not found in taxonomy map.")
        pass

def main():
    parser = argparse.ArgumentParser(description="Sync taxonomy order in posts.")
    parser.add_argument('target_dir', help="Directory to scan for markdown files")
    parser.add_argument('--taxonomy', default='_data/taxonomy.yml', help="Path to taxonomy.yml")
    
    args = parser.parse_args()
    
    weight_map = load_taxonomy(args.taxonomy)
    
    # Walk through the directory
    for root, dirs, files in os.walk(args.target_dir):
        for file in files:
            if file.endswith('.md') or file.endswith('.markdown'):
                filepath = os.path.join(root, file)
                process_file(filepath, weight_map)

if __name__ == "__main__":
    main()
