import os
import glob

files = glob.glob('_devnote/*SW프로세스*.md')

relations = {
    '폭포수': {
        'related': ['V-모델과', '나선형-모델', '히타치의-QC', '애자일-방법론'],
        'references': []
    },
    'V-모델': {
        'related': ['나선형-모델', '히타치의-QC'],
        'references': ['폭포수']
    },
    '나선형': {
        'related': ['애자일-방법론'],
        'references': ['폭포수', 'V-모델과']
    },
    '히타치': {
        'related': ['애자일-방법론', 'V-모델과'],
        'references': ['폭포수']
    },
    '애자일': {
        'related': ['나선형-모델', '히타치의-QC'],
        'references': ['폭포수']
    }
}

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    parts = content.split('---')
    if len(parts) >= 3:
        frontmatter = parts[1]
        
        # Check which relation to add
        rel_str = "relationships:\n"
        for key, rels in relations.items():
            if key in f:
                if len(rels['references']) > 0:
                    rel_str += "  references:\n"
                    for r in rels['references']:
                        matching_file = next(x for x in files if r in x)
                        rel_str += f"    - {matching_file}\n"
                if len(rels['related']) > 0:
                    rel_str += "  related:\n"
                    for r in rels['related']:
                        matching_file = next(x for x in files if r in x)
                        rel_str += f"    - {matching_file}\n"
                break
                
        frontmatter += rel_str
        new_content = f"---{frontmatter}---" + "---".join(parts[2:])
        
        with open(f, 'w') as file:
            file.write(new_content)

print("Done")
