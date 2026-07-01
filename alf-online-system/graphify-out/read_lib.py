import os
import inspect
from pathlib import Path

# Find path of graphify.llm
import graphify.llm
llm_path = Path(inspect.getfile(graphify.llm))
print("llm.py path:", llm_path)

# Search for FileSlice or where the error might occur
content = llm_path.read_text(encoding='utf-8')
print("File length:", len(content))

# Look for extract_corpus_parallel
lines = content.splitlines()
for idx, line in enumerate(lines):
    if 'extract_corpus_parallel' in line or 'extract_chunk' in line or 'FileSlice' in line:
        print(f"{idx+1}: {line}")
