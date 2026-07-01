from pathlib import Path
content = Path(r"C:\Users\aboha\AppData\Roaming\Python\Python312\site-packages\graphify\llm.py").read_text(encoding='utf-8')
lines = content.splitlines()
for idx in range(0, 40):
    if idx < len(lines):
        print(f"{idx+1}: {lines[idx]}")
