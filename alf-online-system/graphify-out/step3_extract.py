import sys
import os
import json
import time
from pathlib import Path

# Load env variables from .env
def load_env():
    env_path = Path('.env')
    if env_path.exists():
        for line in env_path.read_text(encoding='utf-8').splitlines():
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ[k.strip()] = v.strip()

def main():
    load_env()

    # Imports from graphify
    from graphify.detect import detect
    from graphify.extract import collect_files, extract
    from graphify.cache import check_semantic_cache, save_semantic_cache

    # Load detect results
    detect_path = Path('graphify-out/.graphify_detect.json')
    detect_data = json.loads(detect_path.read_text(encoding="utf-8"))

    # Part A - Structural extraction for code files
    print("Running Part A: AST Extraction for code files...")
    code_files = []
    for f in detect_data.get('files', {}).get('code', []):
        code_files.extend(collect_files(Path(f)) if Path(f).is_dir() else [Path(f)])

    if code_files:
        ast_result = extract(code_files, cache_root=Path('.'))
        Path('graphify-out/.graphify_ast.json').write_text(
            json.dumps(ast_result, indent=2, ensure_ascii=False), encoding="utf-8"
        )
        print(f"AST: {len(ast_result['nodes'])} nodes, {len(ast_result['edges'])} edges")
    else:
        ast_result = {'nodes': [], 'edges': [], 'input_tokens': 0, 'output_tokens': 0}
        Path('graphify-out/.graphify_ast.json').write_text(
            json.dumps(ast_result, ensure_ascii=False), encoding="utf-8"
        )
        print("No code files - skipping AST extraction")

    # Part B - Semantic extraction
    print("Running Part B: Semantic Extraction...")
    all_files = [f for files in detect_data['files'].values() for f in files]
    cached_nodes, cached_edges, cached_hyperedges, uncached = check_semantic_cache(all_files)
    print(f"Cache: {len(all_files)-len(uncached)} files hit, {len(uncached)} files need extraction")

    # Save cached results to a temp file
    cached_data = {'nodes': cached_nodes, 'edges': cached_edges, 'hyperedges': cached_hyperedges}
    Path('graphify-out/.graphify_cached.json').write_text(
        json.dumps(cached_data, ensure_ascii=False), encoding="utf-8"
    )

    # Uncached files semantic extraction
    new_semantic = {'nodes': [], 'edges': [], 'hyperedges': [], 'input_tokens': 0, 'output_tokens': 0}

    if uncached:
        # Check if Google/Gemini key is configured
        google_key = os.environ.get("GOOGLE_API_KEY", "").strip()
        gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
        
        if google_key or gemini_key:
            # Use gemini backend
            print("Using Gemini backend for semantic extraction...")
            from graphify.llm import extract_corpus_parallel
            
            # Override gemini model if specified
            gemini_model = os.environ.get("GRAPHIFY_GEMINI_MODEL", "gemini-2.5-flash")
            print(f"Model used: {gemini_model}")
            
            # Run parallel extraction
            # Note: we pass uncached files as Path objects
            uncached_paths = [Path(f) for f in uncached]
            try:
                sem_res = extract_corpus_parallel(uncached_paths, backend="gemini", model=gemini_model)
                new_semantic['nodes'] = sem_res.get('nodes', [])
                new_semantic['edges'] = sem_res.get('edges', [])
                new_semantic['hyperedges'] = sem_res.get('hyperedges', [])
                new_semantic['input_tokens'] = sem_res.get('input_tokens', 0)
                new_semantic['output_tokens'] = sem_res.get('output_tokens', 0)
                
                # Save to cache
                saved = save_semantic_cache(new_semantic['nodes'], new_semantic['edges'], new_semantic['hyperedges'])
                print(f"Saved {saved} extractions to semantic cache.")
            except Exception as e:
                import traceback
                print("Error during extract_corpus_parallel:")
                traceback.print_exc()
        else:
            print("Tip: set GEMINI_API_KEY or GOOGLE_API_KEY to use Gemini for semantic extraction (pip install 'graphifyy[gemini]').")
            print("No LLM key configured. Skipping semantic extraction (relying on AST only).")

    # Merge cached + new semantic results
    all_sem_nodes = cached_data['nodes'] + new_semantic['nodes']
    all_sem_edges = cached_data['edges'] + new_semantic['edges']
    all_sem_hyperedges = cached_data['hyperedges'] + new_semantic['hyperedges']

    seen = set()
    deduped_sem_nodes = []
    for n in all_sem_nodes:
        if n['id'] not in seen:
            seen.add(n['id'])
            deduped_sem_nodes.append(n)

    merged_sem = {
        'nodes': deduped_sem_nodes,
        'edges': all_sem_edges,
        'hyperedges': all_sem_hyperedges,
        'input_tokens': new_semantic['input_tokens'],
        'output_tokens': new_semantic['output_tokens'],
    }
    Path('graphify-out/.graphify_semantic.json').write_text(
        json.dumps(merged_sem, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # Part C - Merge AST + semantic into final extraction
    print("Running Part C: Merge AST and Semantic extraction...")
    seen_ids = {n['id'] for n in ast_result['nodes']}
    final_nodes = list(ast_result['nodes'])
    for n in merged_sem['nodes']:
        if n['id'] not in seen_ids:
            final_nodes.append(n)
            seen_ids.add(n['id'])

    final_edges = ast_result['edges'] + merged_sem['edges']
    final_hyperedges = merged_sem.get('hyperedges', [])

    final_extraction = {
        'nodes': final_nodes,
        'edges': final_edges,
        'hyperedges': final_hyperedges,
        'input_tokens': merged_sem.get('input_tokens', 0),
        'output_tokens': merged_sem.get('output_tokens', 0),
    }
    Path('graphify-out/.graphify_extract.json').write_text(
        json.dumps(final_extraction, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print(f"Merged Final Graph: {len(final_nodes)} nodes, {len(final_edges)} edges ({len(ast_result['nodes'])} AST + {len(merged_sem['nodes'])} semantic)")

    # Clean up temp cache json
    if Path('graphify-out/.graphify_cached.json').exists():
        Path('graphify-out/.graphify_cached.json').unlink()

if __name__ == '__main__':
    main()
