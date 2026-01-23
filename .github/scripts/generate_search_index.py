import json
import os
import re
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

import yaml

ROOT_DIR = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT_DIR / '_config.yml'
OUTPUT_PATH = ROOT_DIR / 'assets' / 'search-index.json'

# Placeholder map for basic permalink support
SUPPORTED_COLLECTION_KEYS = {':collection', ':path', ':name', ':slug', ':output_ext'}


def load_config() -> Dict[str, Any]:
    if not CONFIG_PATH.exists():
        return {}
    with CONFIG_PATH.open('r', encoding='utf-8') as fh:
        return yaml.safe_load(fh) or {}


def split_front_matter(content: str) -> Tuple[Dict[str, Any], str]:
    if not content.startswith('---'):
        return {}, content
    parts = content.split('---', 2)
    if len(parts) < 3:
        return {}, content
    try:
        meta = yaml.safe_load(parts[1]) or {}
    except yaml.YAMLError:
        meta = {}
    body = parts[2]
    return meta, body


def read_markdown(path: Path) -> Tuple[Dict[str, Any], str]:
    try:
        content = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        content = path.read_text(encoding='utf-8', errors='ignore')
    return split_front_matter(content)


def slugify(value: str) -> str:
    if not value:
        return ''
    value = unicodedata.normalize('NFKD', str(value)).strip().lower()
    value = re.sub(r'[\s_]+', '-', value)
    value = re.sub(r'[^0-9a-z\-가-힣]', '-', value)
    value = re.sub(r'-{2,}', '-', value)
    return value.strip('-') or ''


def strip_markdown(text: str, limit: int = 280) -> str:
    cleaned = re.sub(r'```[\s\S]*?```', ' ', text)
    cleaned = re.sub(r'`[^`]+`', ' ', cleaned)
    cleaned = re.sub(r'!\[[^]]*\]\([^)]*\)', ' ', cleaned)
    cleaned = re.sub(r'\[([^]]+)\]\([^)]*\)', r'\1', cleaned)
    cleaned = re.sub(r'<[^>]+>', ' ', cleaned)
    cleaned = re.sub(r'[#>*_~]', ' ', cleaned)
    cleaned = re.sub(r'\s+', ' ', cleaned)
    cleaned = cleaned.strip()
    if limit and len(cleaned) > limit:
        return cleaned[:limit].rstrip() + '…'
    return cleaned


def parse_datetime(value: Any, default: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value)
    if isinstance(value, str):
        formats = [
            '%Y-%m-%d %H:%M:%S %z',
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d'
        ]
        for fmt in formats:
            try:
                return datetime.strptime(value.strip(), fmt)
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(value.strip())
        except ValueError:
            pass
    return default


def derive_post_url(path: Path, meta: Dict[str, Any]) -> str:
    # Use front matter permalink if provided
    permalink = meta.get('permalink')
    if permalink:
        return permalink

    filename = path.stem  # includes date prefix
    parts = filename.split('-', 3)
    if len(parts) >= 4:
        year, month, day = parts[0], parts[1], parts[2]
        slug_source = parts[3]
    else:
        # fallback when filename not standard
        dt = parse_datetime(meta.get('date'), datetime.fromtimestamp(path.stat().st_mtime))
        year, month, day = dt.strftime('%Y'), dt.strftime('%m'), dt.strftime('%d')
        slug_source = filename

    slug_value = slugify(meta.get('slug') or meta.get('title') or slug_source)
    if not slug_value:
        slug_value = slugify(slug_source) or 'post'

    categories = meta.get('categories') or []
    if isinstance(categories, str):
        categories = [categories]
    cat_path = [slugify(cat) for cat in categories if slugify(cat)]
    segments = cat_path + [year, month, day, slug_value]
    return '/' + '/'.join(segments) + '.html'


def replace_permalink_tokens(pattern: str, replacements: Dict[str, str]) -> str:
    result = pattern
    for key, value in replacements.items():
        if key in result:
            result = result.replace(key, value)
    return result


def derive_collection_url(collection: str, rel_path: str, meta: Dict[str, Any], config: Dict[str, Any]) -> str:
    permalink = meta.get('permalink')
    if permalink:
        return permalink

    collection_cfg = config.get(collection, {})
    pattern = collection_cfg.get('permalink') or f'/{collection}/:path/'
    replacements = {
        ':collection': collection,
        ':path': rel_path,
        ':name': Path(rel_path).name,
        ':slug': slugify(Path(rel_path).name),
        ':output_ext': '.html'
    }
    url = replace_permalink_tokens(pattern, replacements)
    if not url.startswith('/'):
        url = '/' + url
    return url


def collect_markdown_files(source: Path) -> List[Path]:
    if not source.exists():
        return []
    return [p for p in source.rglob('*.md') if p.is_file()]


def build_document_record(path: Path, meta: Dict[str, Any], body: str, collection: str, rel_path: str = '') -> Dict[str, Any]:
    stats = path.stat()
    fallback_date = datetime.fromtimestamp(stats.st_mtime)
    dt = parse_datetime(meta.get('date'), fallback_date)

    excerpt = strip_markdown(body)
    keywords = meta.get('keywords') or []
    if isinstance(keywords, str):
        keywords = [keywords]

    categories = meta.get('categories') or []
    if isinstance(categories, str):
        categories = [categories]

    taxonomy = meta.get('taxonomy') or {}

    search_fields = [
        meta.get('title', ''),
        meta.get('subtitle', ''),
        meta.get('description', ''),
        ' '.join(keywords),
        ' '.join(categories),
        taxonomy.get('category', ''),
        taxonomy.get('subcategory', ''),
        excerpt,
        body
    ]
    search_text = ' '.join(filter(None, search_fields)).lower()

    record = {
        'title': meta.get('title', 'Untitled'),
        'subtitle': meta.get('subtitle'),
        'description': meta.get('description'),
        'url': meta.get('permalink'),  # placeholder; overwritten by caller
        'collection': collection,
        'relative_path': rel_path or str(path.relative_to(ROOT_DIR)),
        'date': dt.isoformat(),
        'updated': meta.get('updated'),
        'keywords': keywords,
        'categories': categories,
        'taxonomy': taxonomy,
        'difficulty': meta.get('difficulty'),
        'excerpt': excerpt,
        'search_text': search_text,
    }
    return record


def generate_index() -> Dict[str, Any]:
    config = load_config()
    collections_cfg = config.get('collections', {})
    documents: List[Dict[str, Any]] = []

    # Process posts
    for path in collect_markdown_files(ROOT_DIR / '_posts'):
        meta, body = read_markdown(path)
        if not meta:
            continue
        record = build_document_record(path, meta, body, 'posts')
        record['url'] = derive_post_url(path, meta)
        documents.append(record)

    # Process custom collections
    for collection in collections_cfg.keys():
        collection_dir = ROOT_DIR / f'_{collection}'
        for path in collect_markdown_files(collection_dir):
            rel_path = path.relative_to(collection_dir).with_suffix('')
            rel_str = str(rel_path).replace(os.sep, '/').strip('/')
            meta, body = read_markdown(path)
            if not meta:
                continue
            record = build_document_record(path, meta, body, collection, rel_str)
            record['url'] = derive_collection_url(collection, rel_str, meta, collections_cfg)
            documents.append(record)

    documents.sort(key=lambda doc: doc.get('date', ''), reverse=True)

    return {
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'document_count': len(documents),
        'documents': documents,
    }


def main() -> None:
    index = generate_index()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT_PATH.open('w', encoding='utf-8') as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write('\n')
    print(f"Generated search index with {index['document_count']} documents -> {OUTPUT_PATH}")


if __name__ == '__main__':
    main()
