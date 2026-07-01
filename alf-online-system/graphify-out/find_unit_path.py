from pathlib import Path
content = Path(r"C:\Users\aboha\AppData\Roaming\Python\Python312\site-packages\graphify\llm.py").read_text(encoding='utf-8')
lines = content.splitlines()
for idx, line in enumerate(lines):
    if 'def unit_path' in line or 'def read_slice_text' in line:
        print(f"{idx+1}: {line}")
